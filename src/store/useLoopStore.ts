// FIX: Added a triple-slash directive to provide DOM type definitions, resolving the error "Cannot find name 'document'".
/// <reference lib="dom" />

import { create } from 'zustand';
import { AnalysisResult, LoopCandidate, RenderMode, RenderOptions } from '../types';
import { logger } from '../lib/logger';

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
  
  analysisJobId: string | null;

  renderOptions: Omit<RenderOptions, 'candidate' | 'resolution'>;

  // AI Suggestions
  suggestedTitles: string[];
  isSuggestingTitles: boolean;

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
  clearError: () => void;
  startTitleSuggestion: () => void;
  setTitleSuggestionSuccess: (titles: string[]) => void;
  setTitleSuggestionError: (message: string) => void;
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
  analysisJobId: null,
  
  renderOptions: {
    format: 'mp4',
    renderMode: 'crossfade',
    crossfadeMs: 150,
    pingPong: false,
  },

  suggestedTitles: [],
  isSuggestingTitles: false,

  // Actions
  setVideoFile: (file) => {
    logger.info('New video file selected.', { name: file.name, size: file.size, type: file.type });
    get().reset();
    const url = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
        const duration = videoEl.duration * 1000;
        logger.info('Video metadata loaded.', { url, duration });
        set({
          videoFile: file,
          videoUrl: url,
          videoDuration: duration,
          status: 'idle',
        });
        videoEl.remove();
    };
    videoEl.onerror = () => {
        logger.error('Failed to load video metadata.');
        set({ status: 'error', message: 'Could not load video metadata.' });
        URL.revokeObjectURL(url);
        videoEl.remove();
    }
  },

  startAnalysis: () => {
    const newJobId = crypto.randomUUID();
    logger.info('Analysis started.', { jobId: newJobId });
    set({ 
    status: 'analyzing', 
    progress: 0, 
    message: 'Initiating analysis...',
    analysisJobId: newJobId,
    renderedVideoUrl: null, // New analysis invalidates old render
  })},
  
  setAnalysisSuccess: (result) => {
    logger.info('Analysis succeeded.', { jobId: result.id, candidateCount: result.candidates.length });
    set({ 
      status: 'analysis_done', 
      analysisResult: result, 
      selectedCandidate: result.candidates[0] || null, 
      renderedVideoUrl: null 
    });
  },
  
  setError: (message) => {
    logger.error('Store status set to ERROR.', { message });
    set({ status: 'error', message })
  },
  
  setProgress: (progress, message) => set({ progress, message }),

  selectCandidate: (candidate) => {
    logger.info('Candidate selected.', { candidate });
    set({ selectedCandidate: candidate, renderedVideoUrl: null, status: 'analysis_done' })
  },
  
  startRender: () => {
    logger.info('Render started.');
    set({ status: 'rendering', progress: 0, message: 'Initiating render...' })
  },
  
  setRenderSuccess: (url) => {
    logger.info('Render succeeded.', { url });
    set({ status: 'render_done', renderedVideoUrl: url, suggestedTitles: [] }) // Clear old titles
  },

  setRenderOption: (key, value) => {
    logger.info('Render option changed.', { key, value });
    set((state) => ({
      renderOptions: { ...state.renderOptions, [key]: value },
    }));
  },

  clearError: () => {
    logger.warn('Error cleared by user.');
    set(state => ({
      status: state.analysisResult ? 'analysis_done' : 'idle',
      message: '',
    }))
  },

  reset: () => {
    logger.warn('State reset.');
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
      analysisJobId: null,
      suggestedTitles: [],
      isSuggestingTitles: false,
    });
  },

  startTitleSuggestion: () => {
    logger.info('Title suggestion started.');
    set({ isSuggestingTitles: true, suggestedTitles: [], message: 'Asking the AI for creative titles...' });
  },
  setTitleSuggestionSuccess: (titles) => {
    logger.info('Title suggestion succeeded.', { titles });
    set({ isSuggestingTitles: false, suggestedTitles: titles, message: '' });
  },
  setTitleSuggestionError: (message) => {
    logger.error('Title suggestion failed.', { message });
    set({ isSuggestingTitles: false, message: '' });
  },
}));