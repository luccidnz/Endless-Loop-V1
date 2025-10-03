
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
            const totalDuration = options.candidate.endTime - options.candidate.startTime;
            const percentage = Math.max(0, Math.min(1, time / (totalDuration * 1000 * 1000))) * 100;
            postMessage({ type: 'progress', payload: { progress: percentage, message: `Encoding...` } });
        });
        
        postMessage({ type: 'progress', payload: { progress: 5, message: 'Loading video data...' } });
        await ffmpeg.writeFile('input.mp4', await fetchFile(file));

        const { candidate, crossfadeDuration, pingPong, outputFormat } = options;
        const outputFilename = `output.${outputFormat}`;
        const startTime = candidate.startTime;
        const loopDuration = candidate.endTime - startTime;

        let command: string[];

        if (pingPong) {
             postMessage({ type: 'progress', payload: { progress: 20, message: 'Building ping-pong loop...' } });
             command = [
                '-i', 'input.mp4',
                '-filter_complex',
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS[v_fwd];` +
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS,reverse[v_rev];` +
                `[v_fwd][v_rev]concat=n=2:v=1:a=0[v_out]`,
                '-map', '[v_out]',
                outputFilename
            ];
        } else if (crossfadeDuration > 0) {
            postMessage({ type: 'progress', payload: { progress: 20, message: 'Building crossfade loop...' } });
            command = [
                '-i', 'input.mp4',
                '-filter_complex',
                `[0:v]trim=start=${startTime}:end=${candidate.endTime},setpts=PTS-STARTPTS[v_loop];` +
                `[v_loop]split[v1][v2];` +
                `[v1]trim=end=${crossfadeDuration},setpts=PTS-STARTPTS[fadeoutsrc];`+
                `[v2]trim=start=${loopDuration-crossfadeDuration},setpts=PTS-STARTPTS[fadeinsrc];`+
                `[fadeoutsrc][fadeinsrc]xfade=transition=fade:duration=${crossfadeDuration}:offset=${loopDuration - crossfadeDuration}[v_x];` +
                `[v_loop]trim=start=${crossfadeDuration}:end=${loopDuration-crossfadeDuration},setpts=PTS-STARTPTS[v_main];` +
                `[v_main][v_x]concat=n=2:v=1:a=0[v_out]`,
                '-map', '[v_out]',
                outputFilename
            ];
        } else { // Hard cut
            postMessage({ type: 'progress', payload: { progress: 20, message: 'Creating simple loop...' } });
            command = [
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-to', candidate.endTime.toString(),
                '-c', 'copy',
                outputFilename
            ];
        }

        if(outputFormat === 'gif') {
            postMessage({ type: 'progress', payload: { progress: 20, message: 'Building GIF...' } });
            command = [
                '-i', 'input.mp4',
                '-ss', startTime.toString(),
                '-to', candidate.endTime.toString(),
                '-vf', 'fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                outputFilename
            ]
        }

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
            postMessage({ type: 'log', payload: message });
        });
        await ffmpeg.load({
            coreURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.wasm`,
            workerURL: `${VENDOR_URL}/ffmpeg/ffmpeg-core.worker.js`,
        });
    }
}
