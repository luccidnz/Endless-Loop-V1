/// <reference lib="webworker" />
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { RenderOptions, WorkerMessage } from '../types';

let ffmpeg: FFmpeg | null = null;
const VENDOR_URL = '/vendor';

self.onmessage = async (event: MessageEvent<{ file: File; options: RenderOptions }>) => {
    try {
        const { file, options } = event.data;
        postMessage({ type: 'progress', payload: { progress: 0, message: 'Initializing renderer...' } });

        await loadFFmpeg();
        if (!ffmpeg) throw new Error("FFmpeg failed to load.");
        
        ffmpeg.on('progress', ({ progress, time }) => {
            // The time property from FFmpeg progress is not always reliable for total duration
            // We'll use a simple progress percentage instead.
            const p = Math.round(progress * 100);
            postMessage({ type: 'progress', payload: { progress: Math.max(10, Math.min(95, p)), message: `Encoding...` } });
        });
        
        postMessage({ type: 'progress', payload: { progress: 5, message: 'Loading video data...' } });
        await ffmpeg.writeFile('input.mp4', await fetchFile(file));

        const { candidate, crossfadeDuration, pingPong, outputFormat } = options;
        const outputFilename = `output.${outputFormat}`;
        const startTime = candidate.startTime;
        const loopDuration = candidate.endTime - startTime;

        let command: string[];

        postMessage({ type: 'progress', payload: { progress: 10, message: 'Building commands...' } });

        if (pingPong) {
             command = [
                '-i', 'input.mp4',
                '-filter_complex',
                // Trim the forward segment
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS[v_fwd];` +
                // Trim and reverse the backward segment
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS,reverse[v_rev];` +
                // Concatenate forward and backward parts
                `[v_fwd][v_rev]concat=n=2:v=1[v_out]`,
                '-map', '[v_out]', '-an', // Explicitly remove audio
                outputFilename
            ];
        } else if (crossfadeDuration > 0) {
            command = [
                '-i', 'input.mp4',
                '-filter_complex',
                // 1. Trim the main loop segment and split it into two streams
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS,split=2[v_main][v_fade_src];` +
                // 2. From the second stream, take just the beginning for the fade-in part
                `[v_fade_src]trim=duration=${crossfadeDuration},setpts=PTS-STARTPTS[v_fade_in];` +
                // 3. Crossfade the fade-in part over the end of the main part
                `[v_main][v_fade_in]xfade=transition=fade:duration=${crossfadeDuration}:offset=${loopDuration - crossfadeDuration}[v_out]`,
                '-map', '[v_out]', '-an',
                outputFilename
            ];
        } else { // Hard cut
            // FIX: Remove "-c copy" to allow for frame-accurate cuts by re-encoding.
            command = [
                '-ss', startTime.toString(),
                '-to', candidate.endTime.toString(),
                '-i', 'input.mp4',
                '-an', // No audio
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '22',
                outputFilename
            ];
        }

        if(outputFormat === 'gif') {
            command = [
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-to', candidate.endTime.toString(),
                '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                '-loop', '0', // FIX: Loop GIF infinitely
                outputFilename
            ]
        }
        
        postMessage({ type: 'progress', payload: { progress: 20, message: 'Executing render...' } });
        await ffmpeg.exec(command);
        
        postMessage({ type: 'progress', payload: { progress: 95, message: 'Finalizing...' } });
        const data = await ffmpeg.readFile(outputFilename);
        const mimeTypeMap = {
            mp4: 'video/mp4',
            webm: 'video/webm',
            gif: 'image/gif',
        };

        postMessage({
            type: 'result',
            payload: {
                data: data,
                mimeType: mimeTypeMap[outputFormat],
            },
        });

    } catch (e: any) {
        postMessage({ type: 'error', payload: e.message });
    } finally {
        if (ffmpeg?.loaded) {
            ffmpeg.terminate();
            ffmpeg = null;
        }
    }
};


async function loadFFmpeg() {
    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => {
            // console.log(message) // Uncomment for deep debugging
        });
        await ffmpeg.load({
            coreURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.wasm`,
            workerURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.worker.js`,
        });
    }
}