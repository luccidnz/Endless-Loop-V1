
import React from 'react';

interface PreviewPlayerProps {
    src: string | null;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ src }) => {
    return (
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
            {src ? (
                <video
                    key={src} // Important to force re-render when src changes
                    src={src}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                    <p>Video Preview</p>
                </div>
            )}
        </div>
    );
};
