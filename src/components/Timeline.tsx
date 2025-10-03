
import React, { useEffect, useRef, useState } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { Candidate } from '../types';

export const Timeline: React.FC = () => {
    const { analysisResult, selectedCandidate, setSelectedCandidate, status } = useLoopStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!analysisResult || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { heatmap, duration } = analysisResult;
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        if (!heatmap || heatmap.length === 0) return;
        
        const scores = heatmap.flat().filter(s => s < Infinity && s > -Infinity);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);

        const frameCount = heatmap.length;
        const barWidth = width / frameCount;

        for (let i = 0; i < frameCount; i++) {
            let bestScoreInColumn = Infinity;
            for(let j=0; j < heatmap[i].length; j++) {
                if(heatmap[i][j] < bestScoreInColumn) {
                    bestScoreInColumn = heatmap[i][j];
                }
            }
            if(bestScoreInColumn === Infinity) continue;

            const normalizedScore = 1 - ((bestScoreInColumn - minScore) / (maxScore - minScore || 1));
            
            ctx.fillStyle = `rgba(0, 255, 0, ${Math.max(0.1, normalizedScore * 0.7)})`;
            ctx.fillRect(i * barWidth, 0, barWidth, height);
        }

    }, [analysisResult]);
    
    const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substr(14, 5);

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Loop Candidates</h3>
            {status === 'analyzing' && <p className="text-gray-400">Analyzing video...</p>}
            {analysisResult ? (
                <>
                    <div className="relative w-full h-16 bg-gray-700 rounded-md overflow-hidden mb-2">
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width="1000" height="64" />
                        {analysisResult.candidates.map((candidate, index) => {
                            const left = (candidate.startTime / analysisResult.duration) * 100;
                            const width = ((candidate.endTime - candidate.startTime) / analysisResult.duration) * 100;
                            const isSelected = selectedCandidate?.startTime === candidate.startTime && selectedCandidate?.endTime === candidate.endTime;
                            return (
                                <div
                                    key={index}
                                    className={`absolute h-full top-0 border-2 transition-all cursor-pointer ${isSelected ? 'bg-brand-primary/50 border-brand-primary' : 'bg-white/20 border-white/30 hover:bg-white/30'}`}
                                    style={{ left: `${left}%`, width: `${width}%` }}
                                    onClick={() => setSelectedCandidate(candidate)}
                                    title={`Score: ${candidate.score.toFixed(4)}`}
                                />
                            );
                        })}
                    </div>
                    <div className="space-y-2">
                        {analysisResult.candidates.map((candidate, index) => {
                            const isSelected = selectedCandidate?.startTime === candidate.startTime && selectedCandidate?.endTime === candidate.endTime;
                            return (
                                <div
                                    key={index}
                                    className={`p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-primary/20' : 'bg-gray-700 hover:bg-gray-600'}`}
                                    onClick={() => setSelectedCandidate(candidate)}
                                >
                                    <p className="font-semibold">
                                        Candidate {index + 1}: {formatTime(candidate.startTime)} - {formatTime(candidate.endTime)}
                                    </p>
                                    <p className="text-sm text-gray-400">Composite Score: {candidate.score.toFixed(4)} (lower is better)</p>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                status !== 'analyzing' && <p className="text-gray-400">Run analysis to find loop points.</p>
            )}
        </div>
    );
};
