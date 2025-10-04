import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileDropzoneProps {
  onFileDrop: (file: File) => void;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileDrop }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileDrop(acceptedFiles[0]);
    }
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.webm', '.mov', '.ogg', '.avi'] },
    multiple: false,
  });

  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className="w-full h-full min-h-[50vh] flex items-center justify-center p-4 flex-col">
       {showInfo && (
        <div className="w-full max-w-2xl bg-deep-purple/60 border border-glow-cyan/20 rounded-lg p-4 mb-6 relative backdrop-blur-sm animate-fadeIn">
            <button onClick={() => setShowInfo(false)} className="absolute top-2 right-2 text-glow-cyan/50 hover:text-glow-cyan">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <h3 className="text-lg font-bold text-star-gold">Welcome to Loop Forge</h3>
            <p className="text-sm text-glow-cyan/80 mt-1">
                Transform any video into a seamless, infinite loop.
            </p>
            <ul className="text-xs text-glow-cyan/70 mt-2 list-disc list-inside space-y-1">
                <li><span className="font-semibold">Upload:</span> Drop a video file to begin.</li>
                <li><span className="font-semibold">Analyze:</span> We'll find the best looping points automatically.</li>
                <li><span className="font-semibold">Render:</span> Choose your favorite loop and export it!</li>
            </ul>
        </div>
      )}
      <div
        {...getRootProps()}
        className={`w-full max-w-2xl h-80 border-4 border-dashed rounded-3xl flex flex-col justify-center items-center transition-all duration-300 cursor-pointer relative overflow-hidden
          ${isDragActive ? 'border-glow-cyan bg-nebula-purple/50' : 'border-glow-cyan/50 hover:border-glow-cyan bg-deep-purple/50'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-deep-purple to-cosmic-blue opacity-50" />
        <input {...getInputProps()} />
        <div className="relative z-10 text-center p-4">
            <div className={`w-24 h-24 rounded-full bg-glow-cyan/30 mb-6 mx-auto flex items-center justify-center transition-all duration-300 ${isDragActive ? 'scale-110 animate-glow' : 'animate-pulse'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-glow-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15l-3-3m0 0l3-3m-3 3h12" />
                </svg>
            </div>
            <p className="text-xl text-star-gold">
                {isDragActive ? 'Release to begin the journey...' : 'Place your video into the cosmos'}
            </p>
            <p className="text-sm text-glow-cyan/70 mt-2">
                or click to search your local star system
            </p>
        </div>
      </div>
    </div>
  );
};

export default FileDropzone;