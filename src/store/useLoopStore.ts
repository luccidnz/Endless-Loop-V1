import { create } from 'zustand';
import { AnalysisResult, LoopCandidate, RenderMode, RenderOptions } from '../types';

type AppState = {
  videoFile: File | null;
  videoUrl: string | null;
  videoDuration: number | null;
  
  status: 'idle' | 'analyzing' | 'analysis_done' | 'rendering' | 'render_done' | 'error';
  progress: number;
  message: string;

  analysisResult: AnalysisResult | null;
  selectedCandidate: LoopCandidate | null;
  renderedVideoUrl: string | null;
  
  renderOptions: Omit<RenderOptions, 'candidate' | 'resolution'>;

  // Actions
  setVideoFile: (file: File) => void;
  startAnalysis: () => void;
  setAnalysisSuccess: (result: AnalysisResult) => void;
  setError: (message: string) => void;
  setProgress: (progress: number, message: string) => void;
  selectCandidate: (candidate: LoopCandidate | null) => void;
  startRender: () => void;
  setRenderSuccess: (url: string) => void;
  setRenderOption: <K extends keyof AppState['renderOptions']>(key: K, value: AppState['renderOptions'][K]) => void;
  reset: () => void;
};

export const useLoopStore = create<AppState>((set, get) => ({
  // State
  videoFile: null,
  videoUrl: null,
  videoDuration: null,
  
  status: 'idle',
  progress: 0,
  message: '',

  analysisResult: null,
  selectedCandidate: null,
  renderedVideoUrl: null,
  renderOptions: {
    format: 'mp4',
    renderMode: 'crossfade',
    crossfadeMs: 150,
    pingPong: false,
  },

  // Actions
  setVideoFile: (file) => {
    get().reset();
    const url = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
        set({
          videoFile: file,
          videoUrl: url,
          videoDuration: videoEl.duration * 1000,
          status: 'idle',
        });
        videoEl.remove();
    };
    videoEl.onerror = () => {
        set({ status: 'error', message: 'Could not load video metadata.' });
        URL.revokeObjectURL(url);
        videoEl.remove();
    }
  },

  startAnalysis: () => set({ status: 'analyzing', progress: 0, message: 'Initiating analysis...' }),
  
  setAnalysisSuccess: (result) => {
    set({ 
      status: 'analysis_done', 
      analysisResult: result, 
      selectedCandidate: result.candidates[0] || null, 
      renderedVideoUrl: null 
    });
  },
  
  setError: (message) => set({ status: 'error', message }),
  
  setProgress: (progress, message) => set({ progress, message }),

  selectCandidate: (candidate) => set({ selectedCandidate: candidate, renderedVideoUrl: null, status: 'analysis_done' }),
  
  startRender: () => set({ status: 'rendering', progress: 0, message: 'Initiating render...' }),
  
  setRenderSuccess: (url) => set({ status: 'render_done', renderedVideoUrl: url }),

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
      videoDuration: null,
      status: 'idle',
      analysisResult: null,
      selectedCandidate: null,
      renderedVideoUrl: null,
      progress: 0,
      message: '',
    });
  },
}));
