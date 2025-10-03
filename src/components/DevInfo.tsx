import React from 'react';
import { useLoopStore } from '../store/useLoopStore';

const DevInfo: React.FC = () => {
  const { status, message, progress, selectedCandidate } = useLoopStore();
  
  const stateString = `Status: ${status} | Progress: ${progress.toFixed(1)}% | Msg: ${message}`;
  const candidateString = selectedCandidate ? 
    `Selected: ${ (selectedCandidate.startMs / 1000).toFixed(2) }s-${ (selectedCandidate.endMs / 1000).toFixed(2) }s | S: ${selectedCandidate.score.toFixed(3)} (S:${selectedCandidate.scores.ssim.toFixed(2)} H:${selectedCandidate.scores.hist.toFixed(2)} F:${selectedCandidate.scores.flowError.toFixed(3)})`
    : 'No candidate selected.';

  return (
    <div className="bg-cosmic-blue/50 text-glow-cyan/70 text-xs p-2 rounded mb-4 font-mono max-w-full overflow-x-auto border border-glow-cyan/20">
      <p>{stateString}</p>
      <p>{candidateString}</p>
    </div>
  );
};

export default DevInfo;
