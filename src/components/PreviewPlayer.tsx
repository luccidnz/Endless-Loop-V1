import React, { useRef, useEffect } from 'react';
import { useLoopStore } from '../store/useLoopStore';

const PreviewPlayer: React.FC = () => {
  const { videoUrl, renderedVideoUrl, selectedCandidate, analysisResult } = useLoopStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  const displayUrl = renderedVideoUrl || videoUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedCandidate || !analysisResult || renderedVideoUrl) return;

    // This logic creates a "preview loop" on the original video element
    // by seeking when the playback reaches the loop end point.
    const loopStartSec = selectedCandidate.startMs / 1000;
    const loopEndSec = selectedCandidate.endMs / 1000;

    const handleTimeUpdate = () => {
      if (video.currentTime >= loopEndSec || video.currentTime < loopStartSec) {
        video.currentTime = loopStartSec;
        video.play();
      }
    };
    
    // Set initial time to loop start
    if (video.currentTime < loopStartSec || video.currentTime > loopEndSec) {
      video.currentTime = loopStartSec;
    }

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [selectedCandidate, analysisResult, renderedVideoUrl]);
  
  useEffect(() => {
    // When rendered URL appears, make it loop natively
    if (renderedVideoUrl && videoRef.current) {
        videoRef.current.loop = true;
        videoRef.current.currentTime = 0;
        videoRef.current.play();
    } else if (videoRef.current) {
        videoRef.current.loop = false;
    }
  }, [renderedVideoUrl])

  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
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
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <p className="text-gray-500">Video preview will appear here</p>
        </div>
      )}
    </div>
  );
};

export default PreviewPlayer;
