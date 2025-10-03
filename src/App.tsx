import React, { useEffect, useMemo, useRef } from 'react';
import { useLoopStore } from './store/useLoopStore';
import FileDropzone from './components/FileDropzone';
import PreviewPlayer from './components/PreviewPlayer';
import Timeline from './components/Timeline';
import ControlsPanel from './components/ControlsPanel';
import Spinner from './components/Spinner';
import DevInfo from './components/DevInfo';
import { AnalysisWorkerMessage, RenderWorkerMessage, RenderOptions } from './types';

function App() {
  const { 
    videoFile, setVideoFile, analysisState, startAnalysis,
    setAnalysisSuccess, setAnalysisError, setAnalysisProgress,
    renderState, startRender, setRenderSuccess, setRenderError, setRenderProgress,
    selectedCandidate, videoDimensions, renderOptions
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
          setAnalysisProgress(payload.progress, payload.message);
          break;
        case 'RESULT':
          setAnalysisSuccess(payload);
          break;
        case 'ERROR':
          setAnalysisError(payload.message);
          break;
      }
    };
    
    renderWorkerRef.current.onmessage = (event: MessageEvent<RenderWorkerMessage>) => {
        const { type, payload } = event.data;
        switch (type) {
          case 'PROGRESS':
            setRenderProgress(payload.progress, payload.message);
            break;
          case 'RESULT':
            setRenderSuccess(payload.url);
            break;
          case 'ERROR':
            setRenderError(payload.message);
            break;
        }
      };

    return () => {
      analysisWorkerRef.current?.terminate();
      renderWorkerRef.current?.terminate();
    };
  }, [setAnalysisSuccess, setAnalysisError, setAnalysisProgress, setRenderSuccess, setRenderError, setRenderProgress]);

  const handleFileDrop = (file: File) => {
    setVideoFile(file);
  };
  
  const handleAnalyze = () => {
    if (videoFile && analysisState !== 'loading') {
      startAnalysis();
      analysisWorkerRef.current?.postMessage({
        type: 'ANALYZE',
        payload: { file: videoFile, options: {} }
      });
    }
  };

  const handleRender = () => {
    if (videoFile && selectedCandidate && videoDimensions && renderState !== 'loading') {
      startRender();
      const fullRenderOptions: RenderOptions = {
        ...renderOptions,
        candidate: selectedCandidate,
        resolution: videoDimensions,
      };
      renderWorkerRef.current?.postMessage({
        type: 'RENDER',
        payload: { file: videoFile, options: fullRenderOptions }
      });
    }
  }
  
  const isLoading = useMemo(() => analysisState === 'loading' || renderState === 'loading', [analysisState, renderState]);
  const loadingMessage = useMemo(() => {
    if (analysisState === 'loading') return useLoopStore.getState().analysisMessage;
    if (renderState === 'loading') return useLoopStore.getState().renderMessage;
    return '';
  }, [analysisState, renderState]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-6xl text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Endless Loop
        </h1>
        <p className="text-gray-400 mt-2">
          Find the perfect loop in any video.
        </p>
      </header>

      <main className="w-full max-w-6xl flex-grow flex flex-col items-center">
        {!videoFile ? (
          <FileDropzone onFileDrop={handleFileDrop} />
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <PreviewPlayer />
              <Timeline />
            </div>
            <div className="lg:col-span-1">
              <ControlsPanel onAnalyze={handleAnalyze} onRender={handleRender} />
            </div>
          </div>
        )}
        {isLoading && <Spinner message={loadingMessage} />}
      </main>
      
      <footer className="w-full max-w-6xl mt-8 text-center text-gray-500 text-sm">
        <DevInfo />
        <p>&copy; {new Date().getFullYear()} Endless Loop. Built for production.</p>
      </footer>
    </div>
  );
}

export default App;
