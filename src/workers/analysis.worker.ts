/// <reference lib="webworker" />
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Candidate, WorkerMessage } from '../types';

declare var cv: any;

let ffmpeg: FFmpeg | null = null;
let cvLoaded = false;

const VENDOR_URL = '/vendor';

// --- SSIM Calculation (Simplified, Global) ---
function calculateSSIM(img1: any, img2: any): number {
    const C1 = 6.5025, C2 = 58.5225;

    const gray1 = new cv.Mat();
    const gray2 = new cv.Mat();
    cv.cvtColor(img1, gray1, cv.COLOR_RGBA2GRAY, 0);
    cv.cvtColor(img2, gray2, cv.COLOR_RGBA2GRAY, 0);

    gray1.convertTo(gray1, cv.CV_32F);
    gray2.convertTo(gray2, cv.CV_32F);
    
    const mu1 = cv.mean(gray1)[0];
    const mu2 = cv.mean(gray2)[0];
    
    const mu1_sq = mu1 * mu1;
    const mu2_sq = mu2 * mu2;
    
    const sigma1_sq_mat = new cv.Mat();
    cv.multiply(gray1, gray1, sigma1_sq_mat);
    const sigma1_sq = cv.mean(sigma1_sq_mat)[0] - mu1_sq;

    const sigma2_sq_mat = new cv.Mat();
    cv.multiply(gray2, gray2, sigma2_sq_mat);
    const sigma2_sq = cv.mean(sigma2_sq_mat)[0] - mu2_sq;

    const sigma12_mat = new cv.Mat();
    cv.multiply(gray1, gray2, sigma12_mat);
    const sigma12 = cv.mean(sigma12_mat)[0] - mu1 * mu2;

    const ssim_num = (2 * mu1 * mu2 + C1) * (2 * sigma12 + C2);
    const ssim_den = (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2);
    const ssim = ssim_num / ssim_den;

    gray1.delete(); gray2.delete(); sigma1_sq_mat.delete(); sigma2_sq_mat.delete(); sigma12_mat.delete();

    return ssim;
}


self.onmessage = async (event: MessageEvent<{ file: File }>) => {
    try {
        const { file } = event.data;
        postMessage({ type: 'progress', payload: { progress: 0, message: 'Initializing tools...' } });

        await loadDependencies();
        if (!ffmpeg || !cvLoaded) throw new Error("FFmpeg or OpenCV failed to load.");

        postMessage({ type: 'progress', payload: { progress: 5, message: 'Loading video...' } });
        await ffmpeg.writeFile('input.mp4', await fetchFile(file));

        postMessage({ type: 'progress', payload: { progress: 10, message: 'Getting video info...' } });
        const info = await getVideoInfo('input.mp4');
        const duration = info.duration;
        const analysisFps = 15;
        const frameCount = Math.floor(duration * analysisFps);
        const frameInterval = 1 / analysisFps;

        const minLoopDuration = 2;
        const maxLoopDuration = Math.min(duration, 8);
        const minLoopFrames = Math.floor(minLoopDuration * analysisFps);
        const maxLoopFrames = Math.floor(maxLoopDuration * analysisFps);

        postMessage({ type: 'progress', payload: { progress: 20, message: 'Extracting frames...' } });

        await ffmpeg.exec(['-i', 'input.mp4', '-vf', `fps=${analysisFps},scale=-1:480`, '-vsync', 'vfr', 'frame-%04d.png']);
        
        postMessage({ type: 'progress', payload: { progress: 50, message: 'Analyzing frames...' } });

        const frameMats = [];
        const histograms = [];
        for (let i = 1; i <= frameCount; i++) {
            const frameNumber = i.toString().padStart(4, '0');
            const frameData = await ffmpeg.readFile(`frame-${frameNumber}.png`);
            
            const img = cv.imdecode(new Uint8Array(frameData as ArrayBuffer), cv.IMREAD_UNCHANGED);
            frameMats.push(img);

            const hsv = new cv.Mat();
            // FIX: FFMpeg's PNG output is RGBA. Correctly convert from RGBA to HSV.
            cv.cvtColor(img, hsv, cv.COLOR_RGBA2HSV);

            const hist = new cv.Mat();
            cv.calcHist([hsv], [0, 1], new cv.Mat(), hist, [50, 60], [0, 180, 0, 256], false);
            cv.normalize(hist, hist, 0, 1, cv.NORM_MINMAX, -1, new cv.Mat());
            
            histograms.push(hist);
            hsv.delete();
        }

        const scores: { i: number; j: number; score: number, ssim: number, histDelta: number }[] = [];
        const heatmap = Array(frameCount).fill(0).map(() => Array(frameCount).fill(Infinity));
        
        for (let i = 0; i < frameCount - minLoopFrames; i++) {
            postMessage({ type: 'progress', payload: { progress: 50 + (i / frameCount) * 45, message: `Comparing frames... ${i}/${frameCount}` } });
            for (let j = i + minLoopFrames; j < Math.min(i + maxLoopFrames, frameCount); j++) {
                const histDelta = cv.compareHist(histograms[i], histograms[j], cv.HISTCMP_BHATTACHARYYA);
                const ssim = calculateSSIM(frameMats[i], frameMats[j]);

                // Composite score: lower is better.
                // Weight SSIM dissimilarity higher than histogram difference.
                const score = (1.0 - ssim) * 0.7 + histDelta * 0.3;
                
                scores.push({ i, j, score, ssim, histDelta });
                heatmap[i][j] = score;
            }
        }

        histograms.forEach(h => h.delete());
        frameMats.forEach(m => m.delete());

        scores.sort((a, b) => a.score - b.score);

        const topCandidates: Candidate[] = scores.slice(0, 10).map(s => ({
            startTime: s.i * frameInterval,
            endTime: s.j * frameInterval,
            score: s.score,
            notes: {
                ssim: s.ssim,
                histDelta: s.histDelta
            }
        }));
        
        postMessage({ type: 'progress', payload: { progress: 100, message: 'Analysis complete!' } });
        postMessage({ type: 'result', payload: { candidates: topCandidates, heatmap, duration, frameInterval } });

    } catch (e: any) {
        postMessage({ type: 'error', payload: e.message });
    } finally {
        if (ffmpeg?.loaded) {
            ffmpeg.terminate();
            ffmpeg = null;
        }
    }
};

async function loadDependencies() {
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
    if (!cvLoaded) {
        importScripts(`${VENDOR_URL}/opencv/opencv.js`);
        if (cv && cv.Mat) {
            cvLoaded = true;
        }
    }
}

async function getVideoInfo(fileName: string): Promise<{ duration: number }> {
    if (!ffmpeg) throw new Error("FFmpeg not loaded for info");
    let log = '';
    const logger = ({message}: {message: string}) => log += message + '\n';
    ffmpeg.on('log', logger);
    try {
        await ffmpeg.exec(['-i', fileName, '-f', 'null', '-']);
    } catch(e) {
        // FFmpeg exits with non-zero code on info commands, so we catch and continue
    }
    ffmpeg.off('log', logger);
    const durationMatch = log.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
    if (durationMatch) {
        const [, hours, minutes, seconds, milliseconds] = durationMatch;
        const duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100;
        return { duration };
    }
    return { duration: 0 };
}