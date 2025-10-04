// FIX: Added a triple-slash directive to provide DOM type definitions, resolving the error "Cannot find name 'document'".
/// <reference lib="dom" />

import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, AnalysisWorkerMessage, LoopCandidate, AnalysisRequest } from './types';

const SAMPLE_VIDEOS = [
    '/samples/sample1.mp4',
    '/samples/sample2.mp4',
];

export const TestPage: React.FC = () => {
    const [testResults, setTestResults] = useState<Record<string, { result?: AnalysisResult, error?: string, status: string }>>({});
    // FIX: Initialized useRef with null to resolve "Expected 1 arguments, but got 0." error.
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        workerRef.current = new Worker(new URL('./workers/analysis.worker.ts', import.meta.url), { type: 'module' });
        
        workerRef.current.onmessage = (event: MessageEvent<AnalysisWorkerMessage>) => {
            const { type, payload } = event.data;
            const testId = payload.id;
            if (!testId) return;

            switch (type) {
                case 'PROGRESS':
                    setTestResults(prev => ({ ...prev, [testId]: { ...prev[testId], status: `Running: ${payload.message}` } }));
                    break;
                case 'RESULT':
                    setTestResults(prev => ({ ...prev, [testId]: { result: payload, status: 'Completed' } }));
                    break;
                case 'ERROR':
                    setTestResults(prev => ({ ...prev, [testId]: { error: payload.message, status: 'Failed' } }));
                    break;
            }
        };

        return () => workerRef.current?.terminate();
    }, []);

    const runTest = async (videoPath: string) => {
        try {
            setTestResults(prev => ({...prev, [videoPath]: { status: 'Running: Fetching...' }}));
            const response = await fetch(videoPath);
            if (!response.ok) throw new Error(`Failed to fetch ${videoPath}`);
            const blob = await response.blob();
            const file = new File([blob], videoPath.split('/').pop()!, { type: blob.type });

            const videoEl = document.createElement('video');
            const url = URL.createObjectURL(file);
            videoEl.src = url;
            videoEl.onloadedmetadata = () => {
                const duration = videoEl.duration * 1000;
                URL.revokeObjectURL(url);
                videoEl.remove();

                const request: AnalysisRequest = {
                    file,
                    duration,
                    options: { minLoopSecs: 1.5, maxLoopSecs: 8.0 },
                    id: videoPath
                };
                workerRef.current?.postMessage({ type: 'ANALYZE', payload: request });
            };
        } catch (error: any) {
            setTestResults(prev => ({...prev, [videoPath]: { status: 'Failed', error: error.message }}));
        }
    };

    const runAllTests = () => {
      SAMPLE_VIDEOS.forEach(path => runTest(path));
    }

    return (
        <div className="bg-cosmic-blue text-glow-cyan min-h-screen p-8 font-sans">
            <h1 className="text-4xl font-bold mb-2 text-star-gold">Loop Forge - Test Suite</h1>
            <p className="mb-6 text-glow-cyan/80">
              Ensure you have placed `sample1.mp4` and `sample2.mp4` in the `/public/samples/` directory.
            </p>
            <button onClick={runAllTests} className="bg-nebula-purple text-white font-bold py-2 px-4 rounded mb-6">
                Run All Tests
            </button>
            <div className="space-y-4">
                {SAMPLE_VIDEOS.map(path => (
                    <div key={path} className="bg-deep-purple/50 p-4 rounded-lg border-2 border-glow-cyan/20">
                        <h2 className="text-xl font-semibold text-star-gold">{path}</h2>
                        <p>Status: <span className="font-mono">{testResults[path]?.status || 'Idle'}</span></p>
                        {testResults[path]?.error && <p className="text-red-400">Error: {testResults[path]?.error}</p>}
                        {testResults[path]?.result && <ResultsTable result={testResults[path].result!} />}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ResultsTable: React.FC<{ result: AnalysisResult }> = ({ result }) => (
    <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-cosmic-blue/50">
                <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Time (s)</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">SSIM</th>
                    <th className="p-2">Hist</th>
                    <th className="p-2">Flow Error</th>
                </tr>
            </thead>
            <tbody className="bg-deep-purple/30">
                {result.candidates.slice(0, 3).map((c, i) => (
                    <tr key={i} className="border-b border-glow-cyan/20">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">{(c.startMs / 1000).toFixed(2)} - {(c.endMs / 1000).toFixed(2)}</td>
                        <td className="p-2 font-bold">{c.score.toFixed(3)}</td>
                        <td className="p-2">{c.scores.ssim.toFixed(3)}</td>
                        <td className="p-2">{c.scores.hist.toFixed(3)}</td>
                        <td className="p-2">{c.scores.flowError.toExponential(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);