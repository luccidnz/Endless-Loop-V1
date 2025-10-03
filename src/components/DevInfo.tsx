
import React from 'react';
import { useLoopStore } from '../store/useLoopStore';

export const DevInfo: React.FC = () => {
    const { selectedCandidate } = useLoopStore();

    if (!selectedCandidate) return null;

    return (
        <div className="mt-4 p-4 bg-gray-900 rounded-lg">
            <h4 className="text-md font-semibold text-gray-300">Seam Quality (Selected Loop)</h4>
            <div className="mt-2 text-sm text-gray-400 space-y-1">
                <p><strong>Composite Score:</strong> {selectedCandidate.score.toFixed(5)} (lower is better)</p>
                <p>
                    <strong>SSIM:</strong> {selectedCandidate.notes.ssim.toFixed(4)} (Structural similarity, closer to 1 is better)
                </p>
                <p>
                    <strong>Histogram Δ:</strong> {selectedCandidate.notes.histDelta.toFixed(4)} (Color difference, closer to 0 is better)
                </p>
            </div>
        </div>
    );
};
