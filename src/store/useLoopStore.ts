import { create } from 'zustand';
import { AnalysisResult, LoopCandidate, RenderOptions } from '../types';

type AppState = {
  videoFile: File | null;
  videoUrl: string | null;
  videoDimensions: { width: number; height: number } | null;
  analysisState: 'idle' | 'loading' | 'success' | 'error';
  analysisProgress: number;
  analysisMessage: string;
  analysisResult: AnalysisResult | null;
  selectedCandidate: LoopCandidate | null;
  renderState: 'idle' | 'loading' | 'success' | 'error';
  renderProgress: number;
  renderMessage: string;
  renderedVideoUrl: string | null;
  renderOptions: Omit<RenderOptions, 'candidate' | 'resolution'>;

  // Actions
  setVideoFile: (file: File) => void;
  startAnalysis: () => void;
  setAnalysisSuccess: (result: AnalysisResult) => void;
  setAnalysisError: (message: string) => void;
  setAnalysisProgress: (progress: number, message: string) => void;
  selectCandidate: (candidate: LoopCandidate | null) => void;
  startRender: () => void;
  setRenderSuccess: (url: string) => void;
  setRenderError: (message: string) => void;
  setRenderProgress: (progress: number, message: string) => void;
  setRenderOption: <K extends keyof AppState['renderOptions']>(key: K, value: AppState['renderOptions'][K]) => void;
  reset: () => void;
};

export const useLoopStore = create<AppState>((set, get) => ({
  // State
  videoFile: null,
  videoUrl: null,
  videoDimensions: null,
  analysisState: 'idle',
  analysisProgress: 0,
  analysisMessage: '',
  analysisResult: null,
  selectedCandidate: null,
  renderState: 'idle',
  renderProgress: 0,
  renderMessage: '',
  renderedVideoUrl: null,
  renderOptions: {
    format: 'mp4',
    crossfadeMs: 200,
    pingPong: false,
  },

  // Actions
  setVideoFile: (file) => {
    get().reset();
    const url = URL.createObjectURL(file);
    set({ videoFile: file, videoUrl: url, analysisState: 'idle' });
    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
        set({ videoDimensions: { width: videoEl.videoWidth, height: videoEl.videoHeight } });
        videoEl.remove();
    };
  },
  startAnalysis: () => set({ analysisState: 'loading', analysisProgress: 0, analysisMessage: 'Starting analysis...' }),
  setAnalysisSuccess: (result) => {
    set({ analysisState: 'success', analysisResult: result, selectedCandidate: result.candidates[0] || null, renderState: 'idle', renderedVideoUrl: null });
  },
  setAnalysisError: (message) => set({ analysisState: 'error', analysisMessage: message }),
  setAnalysisProgress: (progress, message) => set({ analysisProgress: progress, analysisMessage: message }),
  selectCandidate: (candidate) => set({ selectedCandidate: candidate, renderedVideoUrl: null, renderState: 'idle' }),
  startRender: () => set({ renderState: 'loading', renderProgress: 0, renderMessage: 'Starting render...' }),
  setRenderSuccess: (url) => set({ renderState: 'success', renderedVideoUrl: url }),
  setRenderError: (message) => set({ renderState: 'error', renderMessage: message }),
  setRenderProgress: (progress, message) => set({ renderProgress: progress, renderMessage: message }),
  setRenderOption: (key, value) => {
    set((state) => ({
      renderOptions: { ...state.renderOptions, [key]: value },
    }));
  },
  reset: () => {
    const { videoUrl, renderedVideoUrl } = get();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (renderedVideoUrl) URL.revokeObjectURL(renderedVideoUrl);
    set({
      videoFile: null,
      videoUrl: null,
      videoDimensions: null,
      analysisState: 'idle',
      analysisResult: null,
      selectedCandidate: null,
      renderState: 'idle',
      renderedVideoUrl: null,
    });
  },
}));
