
import React, { useState } from 'react';
import { AnalyzeResult, WorkerMessage } from './types';
import { Spinner } from './components/Spinner';

interface TestResult {
    status: 'idle' | 'loading' | 'analyzing' | 'done' | 'error';
    data: AnalyzeResult | null;
    error?: string;
}

const sampleVideos = [
    '/samples/sample1.mp4',
    '/samples/sample2.mp4',
];

const TestCard: React.FC<{ videoSrc: string }> = ({ videoSrc }) => {
    const [result, setResult] = useState<TestResult>({ status: 'idle', data: null });
    const workerRef = React.useRef<Worker | null>(null);

    const runTest = async () => {
        if (workerRef.current) {
            workerRef.current.terminate();
        }
        
        setResult({ status: 'loading', data: null });
        
        try {
            const response = await fetch(videoSrc);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.statusText}`);
            }
            const blob = await response.blob();
            const file = new File([blob], videoSrc.split('/').pop()!, { type: 'video/mp4' });

            workerRef.current = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), { type: 'module' });
            
            workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
                const { type, payload } = event.data;
                if (type === 'result') {
                    setResult({ status: 'done', data: payload });
                    workerRef.current?.terminate();
                } else if (type === 'error') {
                    setResult({ status: 'error', data: null, error: payload });
                    workerRef.current?.terminate();
                }
            };
            
            setResult({ status: 'analyzing', data: null });
            workerRef.current.postMessage({ file });

        } catch (e: any) {
             setResult({ status: 'error', data: null, error: e.message });
        }
    };

    const bestCandidate = result.data?.candidates?.[0];

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold truncate">{videoSrc}</h3>
            <div className="my-4">
                <video src={videoSrc} controls muted className="w-full rounded-md bg-black" />
            </div>
            <button
                onClick={runTest}
                disabled={result.status === 'loading' || result.status === 'analyzing'}
                className="w-full px-4 py-2 rounded-md font-bold text-white bg-brand-primary hover:bg-indigo-500 disabled:bg-gray-600 transition-colors"
            >
                {result.status === 'analyzing' ? 'Analyzing...' : 'Run Analysis Test'}
            </button>
            <div className="mt-4 min-h-[6rem]">
                {result.status === 'analyzing' && <div className="flex justify-center"><Spinner /></div>}
                {result.status === 'error' && <p className="text-red-400">Error: {result.error}</p>}
                {result.status === 'done' && bestCandidate && (
                    <div className="text-sm space-y-2">
                        <h4 className="font-bold">Best Candidate Found:</h4>
                        <p><strong>Time:</strong> {bestCandidate.startTime.toFixed(2)}s - {bestCandidate.endTime.toFixed(2)}s</p>
                        <p><strong>Composite Score:</strong> {bestCandidate.score.toFixed(5)}</p>
                        <p><strong>SSIM:</strong> <span className="font-mono">{bestCandidate.notes.ssim.toFixed(4)}</span> (Closer to 1 is better)</p>
                        <p><strong>Histogram Δ:</strong> <span className="font-mono">{bestCandidate.notes.histDelta.toFixed(4)}</span> (Closer to 0 is better)</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export const TestPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-8">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
                    Endless Loop - Test Suite
                </h1>
                <p className="text-gray-400 mt-2">Verify analysis worker performance on sample clips.</p>
                <a href="/" className="text-brand-primary hover:underline">← Back to App</a>
            </header>
            <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                {sampleVideos.map(src => <TestCard key={src} videoSrc={src} />)}
            </main>
        </div>
    );
};
