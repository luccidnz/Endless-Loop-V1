import React, { useRef, useEffect, useState } from 'react';
import { useLoopStore } from '../store/useLoopStore';

const PreviewPlayer: React.FC = () => {
  const { videoUrl, renderedVideoUrl, selectedCandidate } = useLoopStore();
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCandidate || renderedVideoUrl) return;

    const loopStartSec = selectedCandidate.startMs / 1000;
    const loopEndSec = selectedCandidate.endMs / 1000;
    let rafId: number;

    const checkTime = () => {
      if (video.currentTime >= loopEndSec || video.currentTime < loopStartSec) {
        video.currentTime = loopStartSec;
      }
      rafId = requestAnimationFrame(checkTime);
    };

    if (video.currentTime < loopStartSec || video.currentTime > loopEndSec) {
      video.currentTime = loopStartSec;
    }
    
    rafId = requestAnimationFrame(checkTime);

    return () => {
      cancelAnimationFrame(rafId);
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
          onPlay={() => setIsPaused(false)}
          onPause={() => setIsPaused(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-glow-cyan/50">Video preview will appear here</p>
        </div>
      )}

      {selectedCandidate && !renderedVideoUrl && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm p-2 rounded-lg flex items-center gap-2">
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 border border-star-gold p-2 rounded-lg pointer-events-none flex items-center gap-2">
            <div className="w-40 h-24 overflow-hidden relative border border-glow-cyan/50 rounded">
                <p className="absolute top-1 left-1 text-xs bg-black/50 px-1 rounded z-10">End</p>
                <video src={displayUrl} muted className="w-full h-full object-cover" style={{transform: 'scale(1.5)'}} ref={v => v && (v.currentTime = selectedCandidate.endMs / 1000 - 0.03)} />
            </div>
            <div className="w-40 h-24 overflow-hidden relative border border-glow-cyan/50 rounded">
                <p className="absolute top-1 left-1 text-xs bg-black/50 px-1 rounded z-10">Start</p>
                <video src={displayUrl} muted className="w-full h-full object-cover" style={{transform: 'scale(1.5)'}} ref={v => v && (v.currentTime = selectedCandidate.startMs / 1000)} />
            </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPlayer;
