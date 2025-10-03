
export interface Candidate {
  startTime: number; // in seconds
  endTime: number; // in seconds
  score: number; // Composite score, lower is better
  notes: {
    ssim: number; // Structural Similarity Index, higher is better (closer to 1)
    histDelta: number; // Histogram difference, lower is better (closer to 0)
  };
}

export interface AnalyzeOptions {
  minLoopDuration: number; // in seconds
  maxLoopDuration: number; // in seconds
  frameRate: number; // fps for analysis
}

export interface AnalyzeResult {
  candidates: Candidate[];
  heatmap: number[][]; // 2D array of similarity scores for timeline
  duration: number; // video duration in seconds
  thumbnails: string[]; // base64 data URLs for thumbnails
  frameInterval: number;
}

export interface RenderOptions {
  candidate: Candidate;
  crossfadeDuration: number; // in seconds
  stabilization: number; // 0-100 (placeholder)
  pingPong: boolean;
  outputFormat: 'mp4' | 'webm' | 'gif';
}

export type AppStatus =
  | 'idle'
  | 'loading_video'
  | 'analyzing'
  | 'analysis_done'
  | 'rendering'
  | 'render_done'
  | 'error';

export interface WorkerMessage {
  type: 'progress' | 'result' | 'error' | 'log' | 'info';
  payload: any;
}
