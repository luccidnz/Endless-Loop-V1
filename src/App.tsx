import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileDropzone } from './components/FileDropzone';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Timeline } from './components/Timeline';
import { ControlsPanel } from './components/ControlsPanel';
import { useLoopStore } from './store/useLoopStore';
import { AppStatus, WorkerMessage, AnalyzeResult, Candidate } from './types';
import { Spinner } from './components/Spinner';
import { DevInfo } from './components/DevInfo';
import { toBlobURL } from '@ffmpeg/util';

const App: React.FC = () => {
    const { 
        videoFile, 
        videoUrl, 
        status, 
        setStatus, 
        setProgress, 
        setAnalysisResult, 
        setOutputUrl, 
        setError,
        progress,
        progressMessage,
        outputUrl,
        selectedCandidate,
        renderOptions,
    } = useLoopStore();

    const analysisWorkerRef = useRef<Worker>();
    const renderWorkerRef = useRef<Worker>();

    useEffect(() => {
        analysisWorkerRef.current = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), {
            type: 'module',
        });

        renderWorkerRef.current = new Worker(new URL('./workers/render.worker.ts', import.meta.url), {
            type: 'module',
        });

        const handleAnalysisMessage = (event: MessageEvent<WorkerMessage>) => {
            const { type, payload } = event.data;
            if (type === 'progress') {
                setProgress(payload.progress, payload.message);
            } else if (type === 'result') {
                setAnalysisResult(payload);
                setStatus('analysis_done');
            } else if (type === 'error') {
                setError(payload);
                setStatus('error');
            }
        };
        
        const handleRenderMessage = async (event: MessageEvent<WorkerMessage>) => {
            const { type, payload } = event.data;
            if (type === 'progress') {
                setProgress(payload.progress, payload.message);
            } else if (type === 'result') {
                const url = await toBlobURL(payload.data, payload.mimeType);
                setOutputUrl(url);
                setStatus('render_done');
            } else if (type === 'error') {
                setError(payload);
                setStatus('error');
            }
        };

        analysisWorkerRef.current.addEventListener('message', handleAnalysisMessage);
        renderWorkerRef.current.addEventListener('message', handleRenderMessage);

        return () => {
            analysisWorkerRef.current?.terminate();
            renderWorkerRef.current?.terminate();
        };
    }, [setAnalysisResult, setError, setProgress, setStatus, setOutputUrl]);

    const handleAnalyze = useCallback(() => {
        if (!videoFile || !analysisWorkerRef.current) return;
        setStatus('analyzing');
        setOutputUrl(null);
        analysisWorkerRef.current.postMessage({ file: videoFile });
    }, [videoFile, setStatus, setOutputUrl]);

    const handleRender = useCallback(() => {
        if (!videoFile || !selectedCandidate || !renderWorkerRef.current) return;
        setStatus('rendering');
        renderWorkerRef.current.postMessage({ 
            file: videoFile, 
            options: {
                ...renderOptions,
                candidate: selectedCandidate
            }
        });
    }, [videoFile, selectedCandidate, renderOptions, setStatus]);

    const showOverlay = status === 'analyzing' || status === 'rendering';

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <header className="w-full max-w-7xl mb-6">
                <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
                    Endless Loop
                </h1>
                <p className="text-center text-gray-400 mt-2">
                    AI-powered seamless video looping.
                    {import.meta.env.DEV && <a href="/test" className="ml-4 text-brand-primary hover:underline" target="_blank">Test Page</a>}
                </p>
            </header>
            
            <main className="w-full max-w-7xl flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {!videoUrl ? (
                        <FileDropzone />
                    ) : (
                        <>
                            <PreviewPlayer src={outputUrl || videoUrl} />
                            <Timeline />
                        </>
                    )}
                </div>

                <div className="lg:col-span-1 bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col">
                    {videoUrl ? (
                        <>
                            <ControlsPanel onAnalyze={handleAnalyze} onRender={handleRender} />
                             {status === 'render_done' && outputUrl && <DevInfo />}
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-gray-400">Upload a video to get started</p>
                        </div>
                    )}
                </div>
            </main>

            {showOverlay && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex flex-col items-center justify-center z-50">
                    <Spinner />
                    <p className="text-xl mt-4 font-semibold">{progressMessage}</p>
                    <div className="w-64 mt-2 bg-gray-700 rounded-full h-2.5">
                        <div className="bg-brand-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;