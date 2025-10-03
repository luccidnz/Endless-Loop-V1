import React from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { LoopCandidate } from '../types';

const Timeline: React.FC = () => {
    const { analysisResult, selectedCandidate, selectCandidate, status } = useLoopStore();

    if (status === 'idle' || status === 'analyzing') {
        return (
            <div className="h-48 bg-deep-purple/50 border-2 border-glow-cyan/20 rounded-lg flex items-center justify-center p-4">
                <p className="text-glow-cyan/70 text-center">Timeline and candidates will appear after analysis.</p>
            </div>
        );
    }
    
    if (!analysisResult) return null;
    
    const { candidates, durationMs } = analysisResult;

    return (
        <div className="bg-deep-purple/50 border-2 border-glow-cyan/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-star-gold">Loop Candidates</h3>
            <div className="relative h-10 w-full bg-cosmic-blue rounded-full overflow-hidden border border-glow-cyan/30">
                {candidates.map((c, index) => {
                    const startPercent = (c.startMs / durationMs) * 100;
                    const endPercent = (c.endMs / durationMs) * 100;
                    const isSelected = selectedCandidate?.startMs === c.startMs && selectedCandidate?.endMs === c.endMs;

                    return (
                        <div
                            key={index}
                            className={`absolute top-0 h-full transition-all duration-200 cursor-pointer group
                              ${isSelected ? 'bg-star-gold/40 z-10' : 'bg-glow-cyan/30 hover:bg-glow-cyan/40'}`}
                            style={{
                                left: `${startPercent}%`,
                                width: `${Math.max(0.5, endPercent - startPercent)}%`,
                            }}
                            onClick={() => selectCandidate(c)}
                            title={`Score: ${c.score.toFixed(3)}`}
                        >
                           <div className={`w-1 h-full absolute top-0 left-0 ${isSelected ? 'bg-star-gold' : 'bg-glow-cyan'}`} />
                           <div className={`w-1 h-full absolute top-0 right-0 ${isSelected ? 'bg-star-gold' : 'bg-glow-cyan'}`} />
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 max-h-48 overflow-y-auto pr-2">
                {candidates.length > 0 ? (
                    <ul className="space-y-2">
                        {candidates.map((c, i) => (
                             <li 
                                key={i} 
                                onClick={() => selectCandidate(c)}
                                className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border-2
                                  ${selectedCandidate === c ? 'bg-nebula-purple border-star-gold' : 'bg-deep-purple/80 border-glow-cyan/30 hover:border-glow-cyan/70'}`}>
                                <div className="flex justify-between items-center">
                                    <span className="font-semibold text-glow-cyan">Candidate #{i + 1}</span>
                                    <span className={`font-bold px-2 py-0.5 rounded-full text-sm ${selectedCandidate === c ? 'bg-star-gold text-deep-purple' : 'bg-cosmic-blue text-star-gold'}`}>
                                      Score: {c.score.toFixed(3)}
                                    </span>
                                </div>
                                <div className="text-xs text-glow-cyan/70 mt-1.5 flex justify-between">
                                  <span>{(c.startMs / 1000).toFixed(2)}s &rarr; {(c.endMs / 1000).toFixed(2)}s</span>
                                  <span className="font-mono">
                                    SSIM: {c.scores.ssim.toFixed(2)} | HIST: {c.scores.hist.toFixed(2)} | FLOW: {c.scores.flowError.toFixed(3)}
                                  </span>
                                </div>
                             </li>
                        ))}
                    </ul>
                ) : (
                     <div className="h-32 flex items-center justify-center">
                        <p className="text-glow-cyan/70 text-center">No suitable loop candidates found.</p>
                     </div>
                )}
            </div>
        </div>
    );
};

export default Timeline;
