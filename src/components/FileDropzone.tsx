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
    accept: {
      'video/*': ['.mp4', '.webm', '.mov', '.avi'],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-2xl h-64 border-4 border-dashed rounded-xl flex flex-col justify-center items-center transition-colors duration-300 cursor-pointer
        ${isDragActive ? 'border-purple-500 bg-gray-800' : 'border-gray-600 hover:border-purple-400'}`}
    >
      <input {...getInputProps()} />
      <p className="text-xl text-gray-300">
        {isDragActive ? 'Drop the video here...' : 'Drag & drop a video file here, or click to select'}
      </p>
      <p className="text-sm text-gray-500 mt-2">
        (MP4, WebM, MOV, etc.)
      </p>
    </div>
  );
};

export default FileDropzone;
