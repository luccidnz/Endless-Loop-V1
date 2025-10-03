import React from 'react';
import { useLoopStore } from '../store/useLoopStore';

interface ControlsPanelProps {
  onAnalyze: () => void;
  onRender: () => void;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({ onAnalyze, onRender }) => {
  const { 
    analysisState, 
    renderState, 
    selectedCandidate,
    renderOptions,
    setRenderOption,
    reset,
  } = useLoopStore();

  const isAnalyzing = analysisState === 'loading';
  const isRendering = renderState === 'loading';
  const analysisDone = analysisState === 'success';

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col gap-6 h-full">
      <div>
        <h3 className="text-xl font-bold mb-4">Controls</h3>
        <div className="flex flex-col gap-4">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || isRendering}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            {analysisState === 'idle' && '1. Analyze Video'}
            {analysisState === 'loading' && 'Analyzing...'}
            {analysisState === 'success' && 'Re-Analyze'}
            {analysisState === 'error' && 'Retry Analysis'}
          </button>
          
          <button
            onClick={onRender}
            disabled={!selectedCandidate || isRendering || isAnalyzing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors"
          >
            {renderState === 'idle' && '2. Render Loop'}
            {renderState === 'loading' && 'Rendering...'}
            {renderState === 'success' && 'Render Again'}
            {renderState === 'error' && 'Retry Render'}
          </button>
        </div>
      </div>

      {analysisDone && (
        <div>
          <h3 className="text-xl font-bold mb-4">Render Options</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="crossfade" className="block text-sm font-medium text-gray-300">
                Crossfade: {renderOptions.crossfadeMs}ms
              </label>
              <input
                id="crossfade"
                type="range"
                min="0"
                max="500"
                step="10"
                value={renderOptions.crossfadeMs}
                onChange={(e) => setRenderOption('crossfadeMs', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="pingpong" className="text-sm font-medium text-gray-300">
                Ping-Pong Mode
              </label>
              <input
                id="pingpong"
                type="checkbox"
                checked={renderOptions.pingPong}
                onChange={(e) => setRenderOption('pingPong', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
            </div>
            <div>
              <label htmlFor="format" className="block text-sm font-medium text-gray-300">
                Export Format
              </label>
              <select
                id="format"
                value={renderOptions.format}
                onChange={(e) => setRenderOption('format', e.target.value as 'mp4' | 'webm' | 'gif')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 bg-gray-700 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
              >
                <option value="mp4">MP4</option>
                <option value="webm">WebM</option>
                <option value="gif">GIF</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-auto pt-6 border-t border-gray-700">
         <button
            onClick={reset}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Load New Video
          </button>
      </div>

    </div>
  );
};

export default ControlsPanel;
