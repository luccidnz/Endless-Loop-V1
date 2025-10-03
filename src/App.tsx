import React, { useEffect, useMemo, useRef } from 'react';
import { useLoopStore } from './store/useLoopStore';
import FileDropzone from './components/FileDropzone';
import PreviewPlayer from './components/PreviewPlayer';
import Timeline from './components/Timeline';
import ControlsPanel from './components/ControlsPanel';
import Spinner from './components/Spinner';
import DevInfo from './components/DevInfo';
import { AnalysisWorkerMessage, RenderWorkerMessage, RenderOptions, AnalysisRequest, RenderRequest } from './types';

// Fix for TypeScript errors: "Cannot find type definition file for 'vite/client'" and "Property 'env' does not exist on type 'ImportMeta'".
// This manually declares the types for Vite's `import.meta.env` when the default triple-slash directive fails.
declare global {
  interface ImportMeta {
    readonly env: {
      readonly DEV: boolean;
    };
  }
}

function App() {
  const { 
    videoFile, videoDuration, status, setVideoFile, startAnalysis,
    setAnalysisSuccess, setError, setProgress, startRender,
    setRenderSuccess, selectedCandidate, analysisResult, renderOptions
  } = useLoopStore();

  const analysisWorkerRef = useRef<Worker>();
  const renderWorkerRef = useRef<Worker>();

  useEffect(() => {
    analysisWorkerRef.current = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), { type: 'module' });
    renderWorkerRef.current = new Worker(new URL('./workers/render.worker.ts', import.meta.url), { type: 'module' });

    analysisWorkerRef.current.onmessage = (event: MessageEvent<AnalysisWorkerMessage>) => {
      const { type, payload } = event.data;
      switch (type) {
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
      analysisWorkerRef.current?.terminate();
      renderWorkerRef.current?.terminate();
    };
  }, [setAnalysisSuccess, setError, setProgress, setRenderSuccess]);
  
  const handleAnalyze = () => {
    if (videoFile && videoDuration && status !== 'analyzing') {
      startAnalysis();
      const request: AnalysisRequest = {
        file: videoFile,
        duration: videoDuration,
        options: { minLoopSecs: 1.5, maxLoopSecs: 8.0 }
      };
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
      renderWorkerRef.current?.postMessage({ type: 'RENDER', payload: request });
    }
  }
  
  const isLoading = useMemo(() => status === 'analyzing' || status === 'rendering', [status]);
  const loadingMessage = useLoopStore((s) => s.message);

  return (
    <div className="bg-cosmic-blue text-glow-cyan min-h-screen font-sans flex flex-col items-center p-4 md:p-8 from-deep-purple bg-gradient-to-br">
      <header className="w-full max-w-7xl text-center mb-8">
        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-star-gold to-glow-cyan animate-subtleGlow">
          Celestial Flow
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
    </div>
  );
}

export default App;