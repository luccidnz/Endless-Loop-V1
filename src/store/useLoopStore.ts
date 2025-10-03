
import { create } from 'zustand';
import { AppStatus, AnalyzeResult, RenderOptions, Candidate } from '../types';

interface LoopState {
  videoFile: File | null;
  videoUrl: string | null;
  status: AppStatus;
  progress: number;
  progressMessage: string;
  analysisResult: AnalyzeResult | null;
  selectedCandidate: Candidate | null;
  renderOptions: Omit<RenderOptions, 'candidate'>;
  outputUrl: string | null;
  error: string | null;

  setVideoFile: (file: File) => void;
  setStatus: (status: AppStatus) => void;
  setProgress: (progress: number, message: string) => void;
  setAnalysisResult: (result: AnalyzeResult) => void;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  setRenderOptions: (options: Partial<Omit<RenderOptions, 'candidate'>>) => void;
  setOutputUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
    videoFile: null,
    videoUrl: null,
    status: 'idle' as AppStatus,
    progress: 0,
    progressMessage: '',
    analysisResult: null,
    selectedCandidate: null,
    renderOptions: {
        crossfadeDuration: 0.1,
        stabilization: 0,
        pingPong: false,
        outputFormat: 'mp4' as 'mp4' | 'webm' | 'gif',
    },
    outputUrl: null,
    error: null,
};

export const useLoopStore = create<LoopState>((set, get) => ({
    ...initialState,
    setVideoFile: (file) => {
        get().reset();
        const url = URL.createObjectURL(file);
        set({ videoFile: file, videoUrl: url, status: 'loading_video' });
    },
    setStatus: (status) => set({ status }),
    setProgress: (progress, message) => set({ progress, progressMessage: message }),
    setAnalysisResult: (result) => {
        set({ analysisResult: result, selectedCandidate: result.candidates[0] || null });
    },
    setSelectedCandidate: (candidate) => set({ selectedCandidate: candidate }),
    setRenderOptions: (options) => {
        set((state) => ({ renderOptions: { ...state.renderOptions, ...options } }));
    },
    setOutputUrl: (url) => set({ outputUrl: url }),
    setError: (error) => set({ error, status: 'error' }),
    reset: () => {
        const { videoUrl, outputUrl } = get();
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        if (outputUrl) URL.revokeObjectURL(outputUrl);
        set(initialState);
    },
}));
