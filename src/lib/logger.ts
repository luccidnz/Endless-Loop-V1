// src/lib/logger.ts
import { create } from 'zustand';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
}

interface LogState {
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, context?: any) => void;
  clearLogs: () => void;
}

const MAX_LOGS = 200;

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (level, message, context) => {
    const newLog = { timestamp: new Date(), level, message, context };
    console.log(`[${level}] ${message}`, context || '');
    set((state) => ({
      logs: [...state.logs, newLog].slice(-MAX_LOGS), // Keep only the last MAX_LOGS entries
    }));
  },
  clearLogs: () => set({ logs: [] }),
}));

// Global logger instance for convenience, allowing calls from anywhere in the app.
export const logger = {
  info: (message: string, context?: any) => useLogStore.getState().addLog('INFO', message, context),
  warn: (message: string, context?: any) => useLogStore.getState().addLog('WARN', message, context),
  error: (message: string, context?: any) => useLogStore.getState().addLog('ERROR', message, context),
  debug: (message: string, context?: any) => useLogStore.getState().addLog('DEBUG', message, context),
};
