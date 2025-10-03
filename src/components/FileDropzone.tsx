
import React, { useCallback, useState } from 'react';
import { useLoopStore } from '../store/useLoopStore';

const VideoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1 1 0 011.45.89V15.1a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

export const FileDropzone: React.FC = () => {
    const setVideoFile = useLoopStore((state) => state.setVideoFile);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                setVideoFile(file);
            } else {
                alert('Please upload a valid video file.');
            }
        }
    };

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    return (
        <div 
            className={`flex flex-col items-center justify-center w-full h-full p-8 border-2 border-dashed rounded-lg transition-colors
            ${isDragging ? 'border-brand-primary bg-gray-700' : 'border-gray-600 hover:border-gray-500'}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <VideoIcon />
            <p className="mt-4 text-lg font-semibold text-gray-300">Drag & drop a video file here</p>
            <p className="text-gray-500">or</p>
            <label htmlFor="file-upload" className="cursor-pointer mt-2 px-4 py-2 bg-brand-primary text-white rounded-md font-semibold hover:bg-indigo-500 transition-colors">
                Browse Files
            </label>
            <input 
                id="file-upload" 
                type="file" 
                className="hidden"
                accept="video/*"
                onChange={(e) => handleFileChange(e.target.files)}
            />
        </div>
    );
};
