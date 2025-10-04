// FIX: Manually define Vite's `import.meta.env` types to resolve "Cannot find type definition file for 'vite/client'"
// and subsequent errors about `import.meta.env` not existing. This is a workaround for a broken tsconfig/environment.
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  interface ImportMetaEnv {
    readonly VITE_API_KEY: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly MODE: string;
    readonly BASE_URL: string;
  }
}

import React, { useEffect, useMemo, useRef } from 'react';
import { useLoopStore } from './store/useLoopStore';
import FileDropzone from './components/FileDropzone';
import PreviewPlayer from './components/PreviewPlayer';
import Timeline from './components/Timeline';
import ControlsPanel from './components/ControlsPanel';
import Spinner from './components/Spinner';
import DevInfo from './components/DevInfo';
import { AnalysisWorkerMessage, RenderWorkerMessage, RenderOptions, AnalysisRequest, RenderRequest } from './types';
import { logger } from './lib/logger';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';

// FIX: Import asset URLs directly using Vite's `?url` syntax.
// This allows Vite to manage the asset paths, ensuring they are always correct.
import opencvJsUrl from '/opencv.js?url';
import opencvWasmUrl from '/opencv.wasm?url';

function App() {
  const { 
    videoFile, videoDuration, status, setVideoFile, startAnalysis,
    setAnalysisSuccess, setError, setProgress, startRender,
    setRenderSuccess, selectedCandidate, analysisResult, renderOptions,
    isSuggestingTitles
  } = useLoopStore();

  const analysisWorkerRef = useRef<Worker | null>(null);
  const renderWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    logger.info('App mounted. Initializing workers.');
    analysisWorkerRef.current = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    renderWorkerRef.current = new Worker(new URL('./workers/render.worker.ts', import.meta.url), { type: 'module' });

    // FIX: Send an initialization message to the worker with the correct asset URLs.
    // This decouples the worker from hardcoded paths and makes asset loading robust.
    analysisWorkerRef.current.postMessage({
        type: 'INIT',
        payload: {
            opencvJsUrl,
            opencvWasmUrl
        }
    });

    analysisWorkerRef.current.onmessage = (event: MessageEvent<AnalysisWorkerMessage>) => {
      const { type, payload } = event.data;
      
      const currentJobId = useLoopStore.getState().analysisJobId;
      if (payload.id && currentJobId && payload.id !== currentJobId) {
        logger.warn(`Ignoring stale worker message from job ${payload.id}. Current job is ${currentJobId}`);
        return;
      }
      
      switch (type) {
        case 'LOG':
          logger.debug(`[AnalysisWorker] ${payload.message}`);
          break;
        case 'PROGRESS':
          setProgress(payload.progress, payload.message);
          break;
        case 'RESULT':
          setAnalysisSuccess(payload);
          break;
        case 'ERROR':
          setError(payload.message);
          break;
      }
    };
    
    renderWorkerRef.current.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
        const { type, payload } = event.data;
        switch (type) {
          case 'LOG':
            logger.debug(`[RenderWorker] ${payload.message}`);
            break;
          case 'PROGRESS':
            setProgress(payload.progress, payload.message);
            break;
          case 'RESULT':
            setRenderSuccess(payload.url);
            break;
          case 'ERROR':
            setError(payload.message);
            break;
        }
      };

    return () => {
      logger.warn('App unmounting. Terminating workers.');
      analysisWorkerRef.current?.terminate();
      renderWorkerRef.current?.terminate();
    };
  }, [setAnalysisSuccess, setError, setProgress, setRenderSuccess]);
  
  const handleAnalyze = () => {
    if (videoFile && videoDuration && status !== 'analyzing') {
      startAnalysis();
      const currentJobId = useLoopStore.getState().analysisJobId;
      const request: AnalysisRequest = {
        file: videoFile,
        duration: videoDuration,
        options: { minLoopSecs: 1.5, maxLoopSecs: 8.0 },
        id: currentJobId || undefined
      };
      logger.info('Posting ANALYZE request to worker.', { id: request.id });
      analysisWorkerRef.current?.postMessage({ type: 'ANALYZE', payload: request });
    }
  };

  const handleRender = () => {
    if (videoFile && selectedCandidate && analysisResult && status !== 'rendering') {
      startRender();
      const fullRenderOptions: RenderOptions = {
        ...renderOptions,
        candidate: selectedCandidate,
        resolution: analysisResult.videoDimensions,
      };
      const request: RenderRequest = { file: videoFile, options: fullRenderOptions };
      logger.info('Posting RENDER request to worker.', { options: fullRenderOptions });
      renderWorkerRef.current?.postMessage({ type: 'RENDER', payload: request });
    }
  }
  
  const isLoading = useMemo(() => status === 'analyzing' || status === 'rendering' || isSuggestingTitles, [status, isSuggestingTitles]);
  const loadingMessage = useLoopStore((s) => s.message);

  return (
    <div className="bg-cosmic-blue text-glow-cyan min-h-screen font-sans flex flex-col items-center p-4 md:p-8 from-deep-purple bg-gradient-to-br">
      <header className="w-full max-w-7xl text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-star-gold to-glow-cyan animate-subtleGlow">
          Loop Forge
        </h1>
        <p className="text-glow-cyan/80 mt-2">
          Discover the infinite rhythm within your videos.
        </p>
        {import.meta.env.DEV && <a href="/test" className="text-purple-400 hover:underline">Go to Test Page</a>}
      </header>

      <main className="w-full max-w-7xl flex-grow flex flex-col items-center">
        {!videoFile ? (
          <FileDropzone onFileDrop={setVideoFile} />
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <PreviewPlayer />
              <Timeline />
            </div>
            <div className="lg:col-span-4">
              <ControlsPanel onAnalyze={handleAnalyze} onRender={handleRender} />
            </div>
          </div>
        )}
        {isLoading && <Spinner message={loadingMessage} />}
      </main>
      
      <footer className="w-full max-w-7xl mt-8 text-center text-glow-cyan/60 text-sm">
        {import.meta.env.DEV && <DevInfo />}
        <p>Crafted for eternity.</p>
      </footer>
      {import.meta.env.DEV && <DiagnosticsPanel />}
    </div>
  );
}

export default App;
