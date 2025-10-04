// FIX: Added a triple-slash directive to provide DOM type definitions, resolving the error "Cannot find name 'HTMLVideoElement'".
/// <reference lib="dom" />

import React, { useRef, useEffect, useState } from 'react';
import { useLoopStore } from '../store/useLoopStore';
import { suggestTitlesForVideo } from '../lib/gemini';
import { logger } from '../lib/logger';

const PreviewPlayer: React.FC = () => {
  const { 
    videoUrl, renderedVideoUrl, selectedCandidate,
    startTitleSuggestion, setTitleSuggestionSuccess, setTitleSuggestionError,
    isSuggestingTitles, suggestedTitles
  } = useLoopStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showLoupe, setShowLoupe] = useState(false);
  const displayUrl = renderedVideoUrl || videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPaused(false);
    const handlePause = () => setIsPaused(true);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    if (renderedVideoUrl) {
      video.loop = true;
      video.currentTime = 0;
    } else {
      video.loop = false;
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [renderedVideoUrl]);

  // FIX: Re-implemented preview looping logic to be robust. It now correctly starts and stops based on the video's
  // play/pause/seeking state, preventing the previous infinite loop that ignored user controls.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCandidate || renderedVideoUrl) return;

    let rafId: number;
    const loopStartSec = selectedCandidate.startMs / 1000;
    const loopEndSec = selectedCandidate.endMs / 1000;

    const checkTime = () => {
      if (video && !video.paused && video.currentTime >= loopEndSec) {
        video.currentTime = loopStartSec;
      }
      rafId = requestAnimationFrame(checkTime);
    };

    const handlePlay = () => {
      cancelAnimationFrame(rafId); // Ensure no multiple loops are running
      // When play is initiated, if we are outside the loop region, jump to the start.
      if (video.currentTime < loopStartSec || video.currentTime >= loopEndSec) {
        video.currentTime = loopStartSec;
      }
      rafId = requestAnimationFrame(checkTime);
    };

    const handlePauseOrSeek = () => {
      cancelAnimationFrame(rafId);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseOrSeek);
    video.addEventListener('seeking', handlePauseOrSeek);

    // Initial nudge into the loop zone if the video is loaded outside of it
    if (video.currentTime < loopStartSec || video.currentTime > loopEndSec) {
      video.currentTime = loopStartSec;
    }

    // If video is already playing when the candidate changes, kick off the loop
    if (!video.paused) {
      handlePlay();
    }

    return () => {
      cancelAnimationFrame(rafId);
      if (video) {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePauseOrSeek);
        video.removeEventListener('seeking', handlePauseOrSeek);
      }
    };
  }, [selectedCandidate, renderedVideoUrl]);

  const stepFrame = (direction: 'forward' | 'backward') => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    const frameTime = 1 / 30; // Assume 30fps for stepping
    video.currentTime += direction === 'forward' ? frameTime : -frameTime;
  };

  const seekToSeam = () => {
    const video = videoRef.current;
    if (!video || !selectedCandidate) return;
    video.pause();
    video.currentTime = selectedCandidate.endMs / 1000 - (1/30);
  }

  const handleSuggestTitles = async () => {
    if (!videoRef.current || isSuggestingTitles) return;
    startTitleSuggestion();
    try {
      const titles = await suggestTitlesForVideo(videoRef.current);
      setTitleSuggestionSuccess(titles);
    } catch (e: any) {
      useLoopStore.getState().setError(e.message || "Failed to get suggestions.");
      setTitleSuggestionError(e.message);
    }
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) return;
    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    const format = useLoopStore.getState().renderOptions.format;
    a.download = `loop-forge-loop.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    logger.info('Title copied to clipboard', { title });
  };

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative from-deep-purple to-cosmic-blue bg-gradient-to-br border-2 border-glow-cyan/20">
      {displayUrl ? (
        <video
          ref={videoRef}
          key={displayUrl}
          src={displayUrl}
          controls
          autoPlay
          muted
          className="w-full h-full object-contain"
          playsInline
          crossOrigin="anonymous"
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-glow-cyan/50">Video preview will appear here</p>
        </div>
      )}

      {renderedVideoUrl && (
        <div className="absolute top-4 right-4 flex flex-col gap-3 items-end z-20">
          <div className="flex gap-2">
            <button
              onClick={handleSuggestTitles}
              disabled={isSuggestingTitles}
              className="px-4 py-2 bg-nebula-purple hover:bg-nebula-purple/80 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              title="Generate titles with AI"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              Suggest Titles
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-star-gold hover:bg-yellow-600 text-deep-purple font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
              title="Download the looped video"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              Download
            </button>
          </div>
          {suggestedTitles.length > 0 && (
            <div className="bg-deep-purple/80 backdrop-blur-sm border border-glow-cyan/30 rounded-lg p-3 w-64 shadow-2xl">
              <h4 className="text-star-gold font-semibold mb-2">AI Suggestions:</h4>
              <ul className="space-y-2 text-sm">
                {suggestedTitles.map((title, index) => (
                  <li key={index} className="flex justify-between items-center group">
                    <span className="text-glow-cyan/90">{title}</span>
                    <button onClick={() => handleCopyTitle(title)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1" title="Copy title">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-glow-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedCandidate && !renderedVideoUrl && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2 z-20">
          <button onClick={() => stepFrame('backward')} title="Step Back" className="px-2 py-1 hover:bg-glow-cyan/20 rounded">
            &lt;&lt;
          </button>
          <button onClick={seekToSeam} onMouseEnter={() => setShowLoupe(true)} onMouseLeave={() => setShowLoupe(false)} title="Seek to Seam" className="px-3 py-1 bg-nebula-purple/80 hover:bg-nebula-purple rounded">
            Inspect Seam
          </button>
          <button onClick={() => stepFrame('forward')} title="Step Forward" className="px-2 py-1 hover:bg-glow-cyan/20 rounded">
            &gt;&gt;
          </button>
        </div>
      )}
      
      {showLoupe && selectedCandidate && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-star-gold p-2 rounded-lg pointer-events-none flex items-center gap-2 z-30">
            <div className="w-40 h-24 overflow-hidden relative border border-glow-cyan/50 rounded">
                <p className="absolute top-1 left-1 text-xs bg-black/50 px-1 rounded z-10 font-semibold text-star-gold">End Frame</p>
                {/* FIX: Changed ref callback to a block statement to avoid returning a value, resolving TypeScript error. */}
                <video src={displayUrl} muted className="w-full h-full object-cover" style={{transform: 'scale(1.5)'}} ref={v => {if (v) v.currentTime = selectedCandidate.endMs / 1000 - 0.03}} />
            </div>
            <div className="w-40 h-24 overflow-hidden relative border border-glow-cyan/50 rounded">
                <p className="absolute top-1 left-1 text-xs bg-black/50 px-1 rounded z-10 font-semibold text-star-gold">Start Frame</p>
                {/* FIX: Changed ref callback to a block statement to avoid returning a value, resolving TypeScript error. */}
                <video src={displayUrl} muted className="w-full h-full object-cover" style={{transform: 'scale(1.5)'}} ref={v => {if (v) v.currentTime = selectedCandidate.startMs / 1000}} />
            </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPlayer;