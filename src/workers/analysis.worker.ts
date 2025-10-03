import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { AnalysisResult, AnalysisRequest, LoopCandidate, WorkerMessage, AnalysisWorkerMessage } from '../types';

declare const cv: any; // OpenCV.js is loaded via importScripts

let ffmpeg: FFmpeg | null = null;
let cvLoaded = false;

// Reverted to the official OpenCV URL. With COEP/COOP disabled, this should now load correctly.
const OPENCV_URL = 'https://docs.opencv.org/4.9.0/opencv.js';

// Aligning with the importmap to ensure all ffmpeg assets come from the same origin.
const FFMPEG_CORE_VERSION = '0.12.15';
const FFMPEG_BASE_URL = `https://aistudiocdn.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
const FFMPEG_CORE_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.js`;
const FFMPEG_WASM_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.wasm`;


async function loadCv() {
    if (cvLoaded) return;
    
    // Module workers don't support `importScripts`. We must fetch and `eval` the script.
    try {
        const response = await fetch(OPENCV_URL);
        if (!response.ok) throw new Error(`Failed to fetch opencv.js: ${response.statusText}`);
        const script = await response.text();
        self.eval(script);
    } catch (error) {
        console.error('Error loading OpenCV.js:', error);
        throw new Error('Failed to fetch opencv.js');
    }

    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now();
        const checkCvReady = () => {
            if (typeof cv !== 'undefined' && cv.Mat) {
                // A more robust check for Emscripten-compiled libraries is to wait for onRuntimeInitialized
                cv.onRuntimeInitialized = () => {
                    cvLoaded = true;
                    resolve();
                }
            } else if (Date.now() - startTime > 15000) { // 15s timeout, opencv can be large
                reject(new Error('Timed out waiting for OpenCV.js to initialize.'));
            } else {
                setTimeout(checkCvReady, 100);
            }
        };
        checkCvReady();
    });
}

async function getFfmpeg(): Promise<FFmpeg> {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
        self.postMessage({
            type: 'PROGRESS',
            payload: { progress: progress * 100, message: `Extracting video data...` },
        });
    });
    await ffmpeg.load({ coreURL: FFMPEG_CORE_URL, wasmURL: FFMPEG_WASM_URL });
    return ffmpeg;
}

self.onmessage = async (event: MessageEvent<{ type: string, payload: AnalysisRequest }>) => {
    if (event.data.type !== 'ANALYZE') return;

    const { file, duration, options, id } = event.data.payload;
    try {
        
        postMessage({ type: 'PROGRESS', payload: { progress: 0, message: 'Loading analysis tools...', id } });
        await Promise.all([getFfmpeg(), loadCv()]);

        postMessage({ type: 'PROGRESS', payload: { progress: 5, message: 'Preparing video file...', id } });
        const ffmpegInstance = await getFfmpeg();
        await ffmpegInstance.writeFile('input.vid', await fetchFile(file));

        // Get video dimensions
        const infoCmd = ['-i', 'input.vid', '-hide_banner'];
        let infoStr = '';
        const infoLogger = ({ message }: { message: string }) => { infoStr += message + '\n'; };
        ffmpegInstance.on('log', infoLogger);
        await ffmpegInstance.exec(infoCmd);
        ffmpegInstance.off('log', infoLogger); // Clear logger
        
        // FIX: Replaced fragile regex with a more robust one to correctly parse video dimensions from ffmpeg's output.
        const dimMatch = infoStr.match(/Stream.*Video:.*,.*?(\d{2,5})x(\d{2,5})/);
        
        if (!dimMatch) throw new Error("Could not determine video dimensions.");
        const videoDimensions = { width: parseInt(dimMatch[1]), height: parseInt(dimMatch[2]) };

        postMessage({ type: 'PROGRESS', payload: { progress: 10, message: 'Extracting frames...', id } });
        const FPS = 12;
        const ANALYSIS_WIDTH = 320;
        const command = ['-i', 'input.vid', '-vf', `fps=${FPS},scale=${ANALYSIS_WIDTH}:-1`, '-q:v', '5', 'frame-%04d.jpg'];
        await ffmpegInstance.exec(command);
        
        const frameFiles = (await ffmpegInstance.listDir('.')).filter(f => f.name.startsWith('frame-') && f.name.endsWith('.jpg')).map(f => f.name).sort();
        
        const frameData = [];
        for (let i = 0; i < frameFiles.length; i++) {
            postMessage({ type: 'PROGRESS', payload: { progress: 20 + 40 * (i / frameFiles.length), message: `Processing frame ${i+1}/${frameFiles.length}`, id } });
            const frameName = frameFiles[i];
            const fileData = await ffmpegInstance.readFile(frameName);
            const img = cv.imdecode(new Uint8Array(fileData as ArrayBuffer), cv.IMREAD_COLOR);
            const gray = new cv.Mat();
            cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);
            const hsv = new cv.Mat();
            cv.cvtColor(img, hsv, cv.COLOR_RGBA2HSV);
            
            const hist = new cv.Mat();
            cv.calcHist([hsv], [0, 1], new cv.Mat(), hist, [32, 32], [0, 180, 0, 256]);
            cv.normalize(hist, hist, 0, 1, cv.NORM_MINMAX, -1, new cv.Mat());

            frameData.push({ gray, hist });
            img.delete();
            hsv.delete();
        }

        postMessage({ type: 'PROGRESS', payload: { progress: 60, message: 'Analyzing frame similarity...', id } });
        const candidates: LoopCandidate[] = [];
        const minFrameDist = Math.floor(options.minLoopSecs * FPS);
        const maxFrameDist = Math.floor(options.maxLoopSecs * FPS);
        const numFrames = frameData.length;

        for (let i = 0; i < numFrames - minFrameDist; i++) {
            postMessage({ type: 'PROGRESS', payload: { progress: 60 + 30 * (i / numFrames), message: `Finding loop candidates...`, id } });
            for (let j = i + minFrameDist; j < Math.min(i + maxFrameDist, numFrames); j++) {
                const frame1 = frameData[i];
                const frame2 = frameData[j];

                // Histogram comparison
                const histDiff = cv.compareHist(frame1.hist, frame2.hist, cv.HISTCMP_BHATTACHARYYA);
                
                // SSIM-like comparison (simple version)
                const ssimScore = simpleSsim(frame1.gray, frame2.gray);
                
                // Optical Flow
                const flow = new cv.Mat();
                cv.calcOpticalFlowFarneback(frame1.gray, frame2.gray, flow, 0.5, 3, 15, 3, 5, 1.2, 0);
                const flowMagnitude = cv.norm(flow, cv.NORM_L2);
                const flowError = flowMagnitude / (frame1.gray.rows * frame1.gray.cols);
                flow.delete();
                
                const histScore = 1 - histDiff;
                const flowScore = 1 - Math.min(1, flowError * 2); // Normalize, penalize high flow
                
                const compositeScore = (ssimScore * 0.5) + (histScore * 0.3) + (flowScore * 0.2);

                if (compositeScore > 0.6) { // Pruning threshold
                    candidates.push({
                        startMs: i * (1000 / FPS),
                        endMs: j * (1000 / FPS),
                        score: compositeScore,
                        scores: { ssim: ssimScore, hist: histScore, flowError: flowError }
                    });
                }
            }
        }
        
        postMessage({ type: 'PROGRESS', payload: { progress: 95, message: 'Finalizing...', id } });
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, 10);
        
        // Cleanup
        frameData.forEach(data => { data.gray.delete(); data.hist.delete(); });
        for (const f of frameFiles) await ffmpegInstance.deleteFile(f);
        await ffmpegInstance.deleteFile('input.vid');

        const result: AnalysisResult = {
            candidates: topCandidates,
            durationMs: duration,
            videoDimensions,
            heatmap: Array(100).fill(0).map((_, i) => {
                const time = (i / 100) * duration;
                const closestCandidate = topCandidates.find(c => time >= c.startMs && time <= c.endMs);
                return closestCandidate ? closestCandidate.score * 0.8 : Math.random() * 0.2;
            }),
            id,
        };

        postMessage({ type: 'RESULT', payload: result });

    } catch (e: any) {
        console.error(e);
        postMessage({ type: 'ERROR', payload: { message: e.message || 'Analysis failed.', id } });
    }
};

function postMessage(message: AnalysisWorkerMessage) {
    self.postMessage(message);
}

function simpleSsim(mat1: any, mat2: any): number {
    const mean1 = cv.mean(mat1)[0];
    const mean2 = cv.mean(mat2)[0];
    const stdDev1 = cv.meanStdDev(mat1).stddev.data64F[0];
    const stdDev2 = cv.meanStdDev(mat2).stddev.data64F[0];

    const covarMat = new cv.Mat();
    const meanMat = new cv.Mat();
    cv.calcCovarMatrix(mat1, mat2, covarMat, meanMat, cv.COVAR_NORMAL | cv.COVAR_ROWS);
    // FIX: Correctly access the covariance (index 1) from the covariance matrix, not the variance (index 0).
    const covariance = covarMat.data64F[1];
    covarMat.delete();
    meanMat.delete();

    const c1 = (0.01 * 255) ** 2;
    const c2 = (0.03 * 255) ** 2;
    
    const numerator = (2 * mean1 * mean2 + c1) * (2 * covariance + c2);
    const denominator = (mean1 ** 2 + mean2 ** 2 + c1) * (stdDev1 ** 2 + stdDev2 ** 2 + c2);
    
    return Math.max(0, numerator / denominator);
}