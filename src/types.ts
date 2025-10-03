
export interface LoopCandidate {
  startMs: number;
  endMs: number;
  score: number; // Composite score
  scores: {
    ssim: number;
    hist: number;
    flowError: number;
  };
}

export interface AnalysisResult {
  candidates: LoopCandidate[];
  heatmap: number[];
  durationMs: number;
  videoDimensions: { width: number, height: number };
}

export type RenderMode = 'cut' | 'crossfade' | 'flow_morph';

export interface RenderOptions {
  candidate: LoopCandidate;
  format: 'mp4' | 'webm' | 'gif';
  renderMode: RenderMode;
  crossfadeMs: number;
  pingPong: boolean;
  resolution: { width: number; height: number };
}

// === Worker Message Types ===

export type AnalysisRequest = {
  file: File;
  duration: number;
  options: {
    minLoopSecs: number;
    maxLoopSecs: number;
  };
};

export type RenderRequest = {
  file: File;
  options: RenderOptions;
};

export type WorkerMessage<T> =
  | { type: 'PROGRESS'; payload: { message: string, progress: number } }
  | { type: 'RESULT'; payload: T }
  | { type: 'ERROR'; payload: { message: string } };

export type AnalysisWorkerMessage = WorkerMessage<AnalysisResult>;
export type RenderWorkerMessage = WorkerMessage<{ blob: Blob, url: string }>;
