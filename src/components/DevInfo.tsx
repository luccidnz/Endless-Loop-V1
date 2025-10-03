import React from 'react';
import { useLoopStore } from '../store/useLoopStore';

const DevInfo: React.FC = () => {
  const { analysisState, analysisMessage, renderState, renderMessage } = useLoopStore();
  
  const analysisStatus = `Analysis: ${analysisState} - ${analysisMessage}`;
  const renderStatus = `Render: ${renderState} - ${renderMessage}`;

  return (
    <div className="bg-gray-800 text-gray-400 text-xs p-2 rounded mb-4 font-mono max-w-full overflow-x-auto">
      <p>{analysisStatus}</p>
      <p>{renderStatus}</p>
    </div>
  );
};

export default DevInfo;
