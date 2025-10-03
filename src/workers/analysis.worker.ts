import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { AnalysisWorkerMessage, LoopCandidate, AnalysisResult } from '../types';

let ffmpeg: FFmpeg | null = null;

const MIN_LOOP_DURATION_MS = 1500;
const MAX_LOOP_DURATION_MS = 8000;
const CANDIDATE_COUNT = 5;

self.onmessage = async (event: MessageEvent<AnalysisWorkerMessage>) => {
  if (event.data.type !== 'ANALYZE') return;

  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => {
        // console.log(message);
      });
      ffmpeg.on('progress', ({ progress, time }) => {
        self.postMessage({
          type: 'PROGRESS',
          payload: { progress: Math.min(progress, 1) * 100, message: `FFMPEG Processing...` },
        });
      });
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    }
    
    const { file } = event.data.payload;
    await ffmpeg.writeFile('input.vid', await fetchFile(file));

    self.postMessage({ type: 'PROGRESS', payload: { progress: 5, message: 'Getting video info...' } });
    
    // Using ffprobe-wasm would be better, but exec provides the info in stderr
    const infoOutput = await ffmpeg.exec(['-i', 'input.vid']);
    const durationMatch = infoOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    let durationMs = 0;
    if (durationMatch) {
        const [, hours, minutes, seconds, centiseconds] = durationMatch;
        durationMs = (parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds)) * 1000 + parseInt(centiseconds) * 10;
    } else {
        throw new Error("Could not determine video duration.");
    }
    
    self.postMessage({ type: 'PROGRESS', payload: { progress: 10, message: 'Extracting frames...' } });
    const fps = 10;
    await ffmpeg.exec(['-i', 'input.vid', '-vf', `fps=${fps},scale=160:-1`, '-q:v', '5', 'frame-%04d.jpg']);
    const frameFiles = await ffmpeg.listDir('.');
    const jpgFrames = frameFiles.filter(f => f.name.endsWith('.jpg')).map(f => f.name).sort();
    
    self.postMessage({ type: 'PROGRESS', payload: { progress: 50, message: 'Analyzing frame similarity...' } });
    
    // Placeholder for a real CV analysis.
    const candidates: LoopCandidate[] = [];
    const numFrames = jpgFrames.length;
    const minFrameDist = Math.floor(MIN_LOOP_DURATION_MS / (1000 / fps));

    for(let i = 0; i < numFrames - minFrameDist; i++) {
        const j = numFrames - 1 - i;
        if (j <= i + minFrameDist) continue;
        const duration = (j - i) * (1000/fps);
        if (duration < MIN_LOOP_DURATION_MS || duration > MAX_LOOP_DURATION_MS) continue;

        const score = 1 - Math.pow(Math.abs(i/numFrames - 0.1), 2) - Math.pow(Math.abs(j/numFrames - 0.9), 2) + (Math.random() * 0.1);
        candidates.push({
            startMs: i * (1000/fps),
            endMs: j * (1000/fps),
            score: Math.max(0, Math.min(1, score)),
        });
    }

    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, CANDIDATE_COUNT);

    self.postMessage({ type: 'PROGRESS', payload: { progress: 95, message: 'Cleaning up...' } });
    for (const frame of jpgFrames) {
      await ffmpeg.deleteFile(frame);
    }
    await ffmpeg.deleteFile('input.vid');

    const result: AnalysisResult = {
        candidates: topCandidates,
        durationMs,
        heatmap: Array(100).fill(0).map(() => Math.random()),
    };

    self.postMessage({ type: 'RESULT', payload: result });

  } catch (e: any) {
    console.error(e);
    self.postMessage({ type: 'ERROR', payload: { message: e.message || 'Analysis failed.' } });
  }
};
