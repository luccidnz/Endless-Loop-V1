

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { RenderRequest, RenderWorkerMessage, WorkerMessage } from '../types';

let ffmpeg: FFmpeg | null = null;

// Using unpkg as a reliable CDN for ffmpeg core assets
const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_BASE_URL = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
const FFMPEG_CORE_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.js`;
const FFMPEG_WASM_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.wasm`;

async function getFfmpeg(): Promise<FFmpeg> {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
        postMessage({
            type: 'PROGRESS',
            payload: { progress: progress * 100, message: `Rendering video...` },
        });
    });
    await ffmpeg.load({ coreURL: FFMPEG_CORE_URL, wasmURL: FFMPEG_WASM_URL });
    return ffmpeg;
}

self.onmessage = async (event: MessageEvent<{ type: string, payload: RenderRequest }>) => {
  if (event.data.type !== 'RENDER') return;

  try {
    postMessage({ type: 'PROGRESS', payload: { progress: 0, message: 'Loading rendering engine...' } });
    const ffmpeg = await getFfmpeg();

    postMessage({ type: 'PROGRESS', payload: { progress: 5, message: 'Preparing video file...' } });
    const { file, options } = event.data.payload;
    const { candidate, format, crossfadeMs, pingPong, renderMode } = options;
    await ffmpeg.writeFile('input.vid', await fetchFile(file));
    
    const startSec = candidate.startMs / 1000;
    const endSec = candidate.endMs / 1000;
    const durationSec = endSec - startSec;
    const crossfadeSec = crossfadeMs / 1000;
    
    const outputFilename = `output.${format}`;
    let command: string[] = [];
    
    if (format === 'gif') {
      command = [
          '-i', 'input.vid',
          '-ss', `${startSec}`,
          '-t', `${durationSec}`,
          '-vf', 'fps=15,scale=512:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse',
          '-loop', '0',
          outputFilename
      ];
    } else if (pingPong) {
      command = [
          '-i', 'input.vid',
          '-filter_complex',
          `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v_forward];` +
          `[v_forward]reverse[v_reversed];` +
          `[v_forward][v_reversed]concat=n=2:v=1:a=0,framerate=30[v_out]`,
          '-map', '[v_out]', '-c:v', 'libx264', '-preset', 'fast', '-an',
          outputFilename
      ];
    } else if (renderMode === 'flow_morph' && crossfadeSec > 0) {
       const loopDuration = durationSec - crossfadeSec;
       const transitionTrimStart = crossfadeSec / 2;
       command = [
        '-i', 'input.vid',
        '-filter_complex',
        `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v];` +
        `[v]trim=duration=${loopDuration},setpts=PTS-STARTPTS[main];` +
        `[v]trim=start=${loopDuration},setpts=PTS-STARTPTS[end_part];` +
        `[v]trim=duration=${crossfadeSec},setpts=PTS-STARTPTS[start_part];` +
        `[end_part][start_part]concat=n=2:v=1[cross_section];` +
        `[cross_section]minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1[interpolated];` +
        `[interpolated]trim=start=${transitionTrimStart}:duration=${crossfadeSec},setpts=PTS-STARTPTS[transition];` +
        `[main][transition]concat=n=2:v=1,framerate=30[v_out]`,
        '-map', '[v_out]', '-c:v', 'libx264', '-preset', 'medium', '-an',
        outputFilename
       ];
    } else if (renderMode === 'crossfade' && crossfadeSec > 0) {
        const fadeOffset = durationSec - crossfadeSec;
        command = [
         '-i', 'input.vid',
         '-filter_complex',
         `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v];` +
         `[v]split[v_main][v_fade];` +
         `[v_main][v_fade]xfade=transition=fade:duration=${crossfadeSec}:offset=${fadeOffset},framerate=30[v_out]`,
         '-map', '[v_out]', '-c:v', 'libx264', '-preset', 'fast', '-an',
         outputFilename
        ];
    } else { // 'cut' mode - precise trim
      command = [
          '-i', 'input.vid',
          '-filter_complex',
          `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v_out]`,
          '-map', '[v_out]',
          '-c:v', 'libx264',
          '-preset', 'fast',
          '-an', // remove audio
          outputFilename
      ];
    }

    postMessage({ type: 'PROGRESS', payload: { progress: 10, message: 'Executing render command...' } });
    await ffmpeg.exec(command);

    postMessage({ type: 'PROGRESS', payload: { progress: 98, message: 'Finalizing...' } });
    const data = await ffmpeg.readFile(outputFilename);
    
    await ffmpeg.deleteFile('input.vid');
    await ffmpeg.deleteFile(outputFilename);
    
    const mimeType = format === 'gif' ? 'image/gif' : `video/${format}`;
    const blob = new Blob([(data as Uint8Array).buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    postMessage({
      type: 'RESULT',
      payload: { blob, url },
    });

  } catch (e: any) {
    console.error(e);
    postMessage({ type: 'ERROR', payload: { message: e.message || 'Render failed.' } });
  }
};

function postMessage(message: WorkerMessage<{ blob: Blob, url: string }>) {
    self.postMessage(message);
}