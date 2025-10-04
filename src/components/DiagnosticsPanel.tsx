// src/components/DiagnosticsPanel.tsx
import React, { useState } from 'react';
import { useLogStore, LogEntry, LogLevel } from '../lib/logger';

const LogLevelColors: { [key in LogLevel]: string } = {
  INFO: 'text-glow-cyan/80',
  WARN: 'text-yellow-400',
  ERROR: 'text-red-400',
  DEBUG: 'text-gray-500',
};

export const DiagnosticsPanel: React.FC = () => {
  const { logs, clearLogs } = useLogStore();
  const [isCopied, setIsCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const formatLog = (log: LogEntry) => {
    const time = log.timestamp.toLocaleTimeString('en-US', { hour12: false });
    let contextStr = '';
    if (log.context) {
      try {
        contextStr = JSON.stringify(log.context);
      } catch {
        contextStr = '[Unserializable context]';
      }
    }
    return `${time} [${log.level}] ${log.message} ${contextStr}`;
  };

  const handleCopy = () => {
    const logText = logs.map(formatLog).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xl w-full font-mono text-xs">
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full text-left p-2 bg-nebula-purple text-white font-bold rounded-t-lg shadow-lg"
      >
        Diagnostics Logs ({logs.length}) {isCollapsed ? 'Show' : 'Hide'}
      </button>
      {!isCollapsed && (
        <div className="bg-cosmic-blue/90 backdrop-blur-sm border-2 border-nebula-purple p-2 max-h-80 overflow-y-auto">
          <div className="flex gap-2 mb-2">
            <button onClick={handleCopy} className="bg-deep-purple px-2 py-1 rounded hover:bg-deep-purple/70">
              {isCopied ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={clearLogs} className="bg-red-800/50 px-2 py-1 rounded hover:bg-red-700/50">
              Clear
            </button>
          </div>
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={index} className={`whitespace-pre-wrap ${LogLevelColors[log.level]}`}>
                <span className="text-gray-600 select-none mr-1">
                  {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className="font-bold mx-1">[{log.level}]</span>
                <span>{log.message}</span>
                {log.context && <span className="text-gray-500 ml-2">{JSON.stringify(log.context)}</span>}
              </div>
            ))
          ) : (
            <p className="text-gray-500">No logs yet.</p>
          )}
        </div>
      )}
    </div>
  );
};
