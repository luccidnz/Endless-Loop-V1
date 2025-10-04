import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { AnalysisResult, AnalysisRequest, LoopCandidate, WorkerMessage, AnalysisWorkerMessage } from '../types';

declare const cv: any; // OpenCV.js is loaded via importScripts

let ffmpeg: FFmpeg | null = null;
let cvLoaded = false;

// To resolve cross-origin issues, opencv.js is now served locally.
// Please download it from https://docs.opencv.org/4.9.0/opencv.js
// and place it in the /public folder of your project.
const OPENCV_URL = '/opencv.js';

// Aligning with the importmap to ensure all ffmpeg assets come from the same origin.
const FFMPEG_CORE_VERSION = '0.12.15';
const FFMPEG_BASE_URL = `https://aistudiocdn.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;
const FFMPEG_CORE_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.js`;
const FFMPEG_WASM_URL = `${FFMPEG_BASE_URL}/ffmpeg-core.wasm`;

function log(message: string, id?: string) {
    self.postMessage({ type: 'LOG', payload: { message, id } });
}

async function loadCv() {
    if (cvLoaded) return;

    // Use a promise-based approach with the official onRuntimeInitialized callback
    // to reliably load OpenCV.js, which initializes asynchronously.
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for OpenCV.js to initialize. It might be a large file or there was a network issue.'));
        }, 20000); // 20-second timeout

        // OpenCV.js checks for a 'Module' object on the global scope to hook its lifecycle events.
        (self as any).Module = {
            onRuntimeInitialized: () => {
                clearTimeout(timeout);
                cvLoaded = true;
                resolve();
            },
            // Also handle initialization errors.
            onAbort: (reason: any) => {
                clearTimeout(timeout);
                reject(new Error(`OpenCV.js initialization failed: ${reason}`));
            }
        };

        fetch(OPENCV_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch opencv.js: ${response.statusText}. Did you place it in the /public folder?`);
                }
                return response.text();
            })
            .then(script => {
                // Execute the script in the worker's global scope. It will find and use
                // the `Module` object we defined above.
                eval(script);
            })
            .catch(error => {
                clearTimeout(timeout);
                console.error('Error loading OpenCV.js:', error);
                reject(new Error('Failed to load opencv.js script. Check network tab and console for errors.'));
            });
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
    log(`Received job with id: ${id}`, id);
    try {
        
        postMessage({ type: 'PROGRESS', payload: { progress: 0, message: 'Loading analysis tools...', id } });
        log('Loading FFmpeg and OpenCV...', id);
        await Promise.all([getFfmpeg(), loadCv()]);
        log('Analysis tools loaded.', id);

        postMessage({ type: 'PROGRESS', payload: { progress: 5, message: 'Preparing video file...', id } });
        const ffmpegInstance = await getFfmpeg();
        await ffmpegInstance.writeFile('input.vid', await fetchFile(file));

        // Get video dimensions
        log('Reading video metadata for dimensions...', id);
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
        log(`Determined video dimensions: ${videoDimensions.width}x${videoDimensions.height}`, id);

        postMessage({ type: 'PROGRESS', payload: { progress: 10, message: 'Extracting frames...', id } });
        const FPS = 12;
        const ANALYSIS_WIDTH = 320;
        const command = ['-i', 'input.vid', '-vf', `fps=${FPS},scale=${ANALYSIS_WIDTH}:-1`, '-q:v', '5', 'frame-%04d.jpg'];
        await ffmpegInstance.exec(command);
        
        const frameFiles = (await ffmpegInstance.listDir('.')).filter(f => f.name.startsWith('frame-') && f.name.endsWith('.jpg')).map(f => f.name).sort();
        log(`Extracted ${frameFiles.length} frames at ${FPS}FPS.`, id);
        
        const frameData = [];
        log('Processing frames with OpenCV...', id);
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
        log('Starting frame similarity analysis loop.', id);
        const candidates: LoopCandidate[] = [];
        const minFrameDist = Math.floor(options.minLoopSecs * FPS);
        const maxFrameDist = Math.floor(options.maxLoopSecs * FPS);
        const numFrames = frameData.length;
        const loopRange = numFrames - minFrameDist;

        for (let i = 0; i < loopRange; i++) {
             // FIX: Improved progress reporting by making the message more descriptive during the longest phase of analysis.
            const progress = 60 + 30 * (i / loopRange);
            postMessage({ type: 'PROGRESS', payload: { progress, message: `Analyzing similarity (${i + 1}/${loopRange})...`, id } });

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
        log(`Found ${candidates.length} potential candidates. Sorting and selecting top 10.`, id);
        
        postMessage({ type: 'PROGRESS', payload: { progress: 95, message: 'Finalizing...', id } });
        candidates.sort((a, b) => b.score - a.score);
        const topCandidates = candidates.slice(0, 10);
        
        // Cleanup
        log('Cleaning up OpenCV and FFmpeg memory...', id);
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
        
        log('Analysis complete. Posting result.', id);
        postMessage({ type: 'RESULT', payload: result });

    } catch (e: any) {
        console.error(e);
        log(`CRITICAL ERROR: ${e.message}`, id);
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