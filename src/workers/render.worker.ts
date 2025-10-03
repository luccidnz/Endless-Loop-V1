import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { RenderWorkerMessage } from '../types';

let ffmpeg: FFmpeg | null = null;

self.onmessage = async (event: MessageEvent<RenderWorkerMessage>) => {
  if (event.data.type !== 'RENDER') return;

  try {
    if (!ffmpeg) {
      ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => {
        // console.log(message);
      });
      ffmpeg.on('progress', ({ progress, time }) => {
        self.postMessage({
          type: 'PROGRESS',
          payload: { progress: Math.min(progress, 1) * 100, message: `Rendering...` },
        });
      });
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    }

    self.postMessage({ type: 'PROGRESS', payload: { progress: 0, message: 'Preparing render...' } });
    const { file, options } = event.data.payload;
    const { candidate, format, crossfadeMs, pingPong } = options;

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
          '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
          '-loop', '0',
          outputFilename
      ];
    } else if (pingPong) {
      command = [
          '-i', 'input.vid',
          '-filter_complex',
          `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v_forward];` +
          `[v_forward]reverse[v_reversed];` +
          `[v_forward][v_reversed]concat=n=2:v=1:a=0[v_out]`,
          '-map', '[v_out]',
          outputFilename
      ];
    } else if (crossfadeMs > 0 && durationSec > crossfadeSec * 2) {
       // Using xfade filter for simplicity and robustness
       const fadeOffset = durationSec - crossfadeSec;
       command = [
        '-i', 'input.vid',
        '-filter_complex',
        `[0:v]trim=${startSec}:${endSec},setpts=PTS-STARTPTS[v];` +
        `[v]split[v_main][v_fade];` +
        `[v_main][v_fade]xfade=transition=fade:duration=${crossfadeSec}:offset=${fadeOffset}[v_out]`,
        '-map', '[v_out]',
        '-c:v', 'libx264',
        outputFilename
       ];
    } else {
      command = [
          '-ss', `${startSec}`,
          '-i', 'input.vid',
          '-t', `${durationSec}`,
          '-c:v', 'libx264', // Re-encode to ensure clean cut
          '-preset', 'fast',
          outputFilename
      ];
    }

    self.postMessage({ type: 'PROGRESS', payload: { progress: 20, message: 'Executing FFMPEG...' } });
    await ffmpeg.exec(command);

    self.postMessage({ type: 'PROGRESS', payload: { progress: 95, message: 'Finalizing...' } });
    const data = await ffmpeg.readFile(outputFilename);
    
    await ffmpeg.deleteFile('input.vid');
    await ffmpeg.deleteFile(outputFilename);
    
    const mimeType = format === 'gif' ? 'image/gif' : `video/${format}`;
    const blob = new Blob([(data as Uint8Array).buffer], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    self.postMessage({
      type: 'RESULT',
      payload: { blob, url },
    });

  } catch (e: any) {
    console.error(e);
    self.postMessage({ type: 'ERROR', payload: { message: e.message || 'Render failed.' } });
  }
};
