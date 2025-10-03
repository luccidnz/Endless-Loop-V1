export interface LoopCandidate {
  startMs: number;
  endMs: number;
  score: number;
  notes?: string;
}

export interface AnalysisResult {
  candidates: LoopCandidate[];
  heatmap?: number[]; // Representing loopability score over time
  durationMs: number;
}

export interface RenderOptions {
  candidate: LoopCandidate;
  format: 'mp4' | 'webm' | 'gif';
  duration?: number;
  crossfadeMs: number;
  pingPong: boolean;
  resolution: { width: number; height: number };
  fileSizeTargetMb?: number;
}

export type AnalysisWorkerMessage = 
  | { type: 'ANALYZE'; payload: { file: File, options: any } }
  | { type: 'PROGRESS'; payload: { message: string, progress: number } }
  | { type: 'RESULT'; payload: AnalysisResult }
  | { type: 'ERROR'; payload: { message: string } };

export type RenderWorkerMessage = 
  | { type: 'RENDER'; payload: { file: File, options: RenderOptions } }
  | { type: 'PROGRESS'; payload: { message: string, progress: number } }
  | { type: 'RESULT'; payload: { blob: Blob, url: string } }
  | { type: 'ERROR'; payload: { message: string } };
