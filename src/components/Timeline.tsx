import React from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { LoopCandidate } from '../types';

const Timeline: React.FC = () => {
    const { analysisResult, selectedCandidate, selectCandidate } = useLoopStore();

    if (!analysisResult) {
        return (
            <div className="h-32 bg-gray-800 rounded-lg flex items-center justify-center p-4">
                <p className="text-gray-500 text-center">Timeline and candidates will appear after analysis.</p>
            </div>
        );
    }
    
    const { candidates, durationMs } = analysisResult;

    const handleCandidateClick = (candidate: LoopCandidate) => {
        selectCandidate(candidate);
    };
    
    const getHeatmapColor = (value: number) => {
        const g = Math.floor(200 * value);
        const r = Math.floor(200 * (1 - value));
        return `rgb(${r}, ${g}, 50)`;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Loop Candidates</h3>
            <div className="relative h-12 w-full bg-gray-700 rounded">
                {analysisResult.heatmap && (
                    <div className="absolute top-0 left-0 w-full h-full flex overflow-hidden rounded">
                        {analysisResult.heatmap.map((value, index) => (
                            <div key={index} className="h-full flex-1" style={{ backgroundColor: getHeatmapColor(value) }} />
                        ))}
                    </div>
                )}
                {candidates.map((c, index) => {
                    const startPercent = (c.startMs / durationMs) * 100;
                    const endPercent = (c.endMs / durationMs) * 100;
                    const isSelected = selectedCandidate?.startMs === c.startMs && selectedCandidate?.endMs === c.endMs;

                    return (
                        <div
                            key={index}
                            className={`absolute top-0 h-full border-x-2 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-purple-500/30 border-purple-400 z-10' : 'bg-green-500/20 border-green-400 hover:bg-green-500/30'}`}
                            style={{
                                left: `${startPercent}%`,
                                width: `${Math.max(0.5, endPercent - startPercent)}%`,
                            }}
                            onClick={() => handleCandidateClick(c)}
                            title={`Candidate ${index + 1} (Score: ${c.score.toFixed(3)})`}
                        >
                            <div className={`absolute -top-5 text-xs px-1 rounded ${isSelected ? 'bg-purple-500' : 'bg-green-500'}`}>
                                #{index + 1}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4">
                {candidates.length > 0 ? (
                    <ul className="space-y-2">
                        {candidates.map((c, i) => (
                             <li 
                                key={i} 
                                onClick={() => handleCandidateClick(c)}
                                className={`p-2 rounded cursor-pointer transition-colors ${selectedCandidate === c ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                Candidate #{i + 1}: {(c.startMs / 1000).toFixed(2)}s to {(c.endMs / 1000).toFixed(2)}s (Score: {c.score.toFixed(3)})
                             </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-400 text-center">No suitable loop candidates found.</p>
                )}
            </div>
        </div>
    );
};

export default Timeline;
