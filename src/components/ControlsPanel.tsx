import React from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { RenderMode } from '../types';

interface ControlsPanelProps {
  onAnalyze: () => void;
  onRender: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ onAnalyze, onRender }) => {
  const { 
    status,
    selectedCandidate,
    renderOptions,
    setRenderOption,
    reset,
  } = useLoopStore();

  const isBusy = status === 'analyzing' || status === 'rendering';
  const analysisDone = status === 'analysis_done' || status === 'render_done';

  const renderModeOptions: { id: RenderMode; name: string; desc: string }[] = [
    { id: 'cut', name: 'Simple Cut', desc: 'Fastest. A direct cut with no transition.' },
    { id: 'crossfade', name: 'Crossfade', desc: 'A smooth dissolve between the end and start.' },
    { id: 'flow_morph', name: 'Flow Morph', desc: 'Best quality. Blends motion for seamless loops.' },
  ];

  return (
    <div className="bg-deep-purple/50 border-2 border-glow-cyan/20 p-6 rounded-lg shadow-lg flex flex-col gap-6 h-full">
      <div>
        <h3 className="text-xl font-bold mb-4 text-star-gold">Control Orb</h3>
        <div className="flex flex-col gap-4">
          <button
            onClick={onAnalyze}
            disabled={isBusy}
            className="w-full bg-gradient-to-r from-nebula-purple to-deep-purple hover:from-nebula-purple/80 border-2 border-glow-cyan/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-glow-cyan/20"
          >
            {status === 'idle' && '1. Awaken Analysis'}
            {status === 'analyzing' && 'Analyzing...'}
            {(status === 'analysis_done' || status === 'render_done' || status === 'error') && 'Re-Analyze'}
          </button>
          
          <button
            onClick={onRender}
            disabled={!selectedCandidate || isBusy}
            className="w-full bg-gradient-to-r from-star-gold to-yellow-600 hover:from-star-gold/80 border-2 border-star-gold/50 disabled:opacity-50 disabled:cursor-not-allowed text-deep-purple font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-star-gold/20"
          >
            {status !== 'rendering' && '2. Manifest Loop'}
            {status === 'rendering' && 'Manifesting...'}
          </button>
        </div>
      </div>

      {analysisDone && (
        <div className="flex-grow">
          <h3 className="text-xl font-bold mb-4 text-star-gold">Render Configuration</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-glow-cyan mb-2">Transition Mode</label>
              <div className="flex flex-col gap-2">
                {renderModeOptions.map(opt => (
                  <button key={opt.id} onClick={() => setRenderOption('renderMode', opt.id)} className={`p-2 rounded-lg text-left border-2 transition-all ${renderOptions.renderMode === opt.id ? 'bg-nebula-purple border-star-gold' : 'bg-deep-purple border-glow-cyan/30 hover:border-glow-cyan/70'}`}>
                    <p className="font-semibold text-glow-cyan">{opt.name}</p>
                    <p className="text-xs text-glow-cyan/70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-glow-cyan mb-2">
                Export Format
              </label>
              <select
                id="format"
                value={renderOptions.format}
                onChange={(e) => setRenderOption('format', e.target.value as 'mp4' | 'webm' | 'gif')}
                className="block w-full p-2 text-base border-glow-cyan/30 bg-deep-purple focus:outline-none focus:ring-star-gold focus:border-star-gold sm:text-sm rounded-md"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="gif">GIF</option>
              </select>
            </div>
             <div className="flex items-center justify-between">
              <label htmlFor="pingpong" className="text-sm font-medium text-glow-cyan">
                Ping-Pong Mode
              </label>
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  id="pingpong"
                  type="checkbox"
                  checked={renderOptions.pingPong}
                  onChange={(e) => setRenderOption('pingPong', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-cosmic-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nebula-purple"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-auto pt-6 border-t border-glow-cyan/20">
         <button
            onClick={reset}
            className="w-full bg-red-800/50 hover:bg-red-700/50 border-2 border-red-500/50 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Choose New Video
          </button>
      </div>
    </div>
  );
};

export default ControlsPanel;
