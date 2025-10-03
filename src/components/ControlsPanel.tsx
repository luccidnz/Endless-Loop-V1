
import React from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { AppStatus } from '../types';

interface ControlsPanelProps {
    onAnalyze: () => void;
    onRender: () => void;
}

const Button: React.FC<{ onClick: () => void; disabled: boolean; children: React.ReactNode; className?: string }> = ({ onClick, disabled, children, className = '' }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-md font-bold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800
        ${disabled ? 'bg-gray-600 cursor-not-allowed' : `bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 ${className}`}`}
    >
        {children}
    </button>
);


export const ControlsPanel: React.FC<ControlsPanelProps> = ({ onAnalyze, onRender }) => {
    const { status, renderOptions, setRenderOptions, outputUrl } = useLoopStore();
    const isBusy = status === 'analyzing' || status === 'rendering';

    const handleDownload = () => {
        if (!outputUrl) return;
        const a = document.createElement('a');
        a.href = outputUrl;
        a.download = `endless-loop.${renderOptions.outputFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex-grow space-y-6">
                <h3 className="text-xl font-bold border-b border-gray-700 pb-2">Controls</h3>
                
                <div>
                    <Button onClick={onAnalyze} disabled={isBusy}>
                        {status === 'analyzing' ? 'Analyzing...' : 'Auto-Analyze Loop Points'}
                    </Button>
                </div>
                
                <h4 className="text-lg font-semibold">Render Options</h4>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="crossfade" className="block text-sm font-medium text-gray-300">
                            Crossfade ({renderOptions.crossfadeDuration * 1000}ms)
                        </label>
                        <input
                            type="range"
                            id="crossfade"
                            min="0"
                            max="0.5"
                            step="0.05"
                            value={renderOptions.crossfadeDuration}
                            onChange={(e) => setRenderOptions({ crossfadeDuration: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-300">Ping-Pong Loop</span>
                         <button
                            onClick={() => setRenderOptions({ pingPong: !renderOptions.pingPong })}
                            className={`${renderOptions.pingPong ? 'bg-brand-primary' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                          >
                            <span className={`${renderOptions.pingPong ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                          </button>
                    </div>

                    <div>
                        <label htmlFor="format" className="block text-sm font-medium text-gray-300">Export Format</label>
                        <select
                            id="format"
                            value={renderOptions.outputFormat}
                            onChange={(e) => setRenderOptions({ outputFormat: e.target.value as 'mp4' | 'webm' | 'gif' })}
                            className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-brand-primary focus:border-brand-primary"
                        >
                            <option value="mp4">MP4</option>
                            <option value="webm">WebM</option>
                            <option value="gif">GIF</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Button onClick={onRender} disabled={isBusy || status === 'idle' || status === 'loading_video'}>
                    {status === 'rendering' ? 'Rendering...' : 'Render Loop'}
                </Button>
                {status === 'render_done' && outputUrl && (
                    <Button onClick={handleDownload} disabled={!outputUrl} className="bg-green-600 hover:bg-green-500">
                        Download Result
                    </Button>
                )}
            </div>
        </div>
    );
};
