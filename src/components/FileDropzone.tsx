import React, { useCallback } from 'react';
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

  return (
    <div className="w-full h-full min-h-[50vh] flex items-center justify-center p-4">
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
