
# Endless Loop

An intelligent video looping tool built with React, TypeScript, Vite, FFmpeg.wasm, and OpenCV.js.

## V1 Scope

-   **Video Analysis:** Extracts frames, computes similarity scores using SSIM and color histograms, and identifies the top 3 potential loop points.
-   **Video Rendering:** Creates a seamless loop using a hard cut or a crossfade transition.
-   **UI:** A modern, responsive interface with a file dropzone, video preview, interactive timeline with a similarity heatmap, and detailed rendering controls.
-   **Export:** Outputs loops in MP4, WebM, or GIF format.
-   **Client-Side:** All processing happens in the browser using Web Workers.

## Setup & Running

### 1. Prerequisites

-   Node.js (v18+)
-   npm

### 2. Installation

Clone the repository and install the dependencies:

```bash
npm install
```

### 3. Required Third-Party Libraries & Samples

This project requires external libraries and sample videos to be placed in the `public/` directory.

1.  **FFmpeg.wasm**
    -   Download files from `unpkg.com/@ffmpeg/core@0.12.6/dist/umd/`: `ffmpeg-core.js`, `ffmpeg-core.wasm`, `ffmpeg-core.worker.js`.
    -   Place them in `public/vendor/ffmpeg/`.

2.  **OpenCV.js**
    -   Download `opencv.js` from an official release.
    -   Place it in `public/vendor/opencv/`.

3.  **Sample Videos (for Test Page)**
    -   Create a new directory: `public/samples`.
    -   Add two short MP4 video files named `sample1.mp4` and `sample2.mp4` inside it.

Your `public` directory should look like this:

```
public/
├── samples/
│   ├── sample1.mp4
│   └── sample2.mp4
└── vendor/
    ├── ffmpeg/
    │   ├── ...
    └── opencv/
        └── opencv.js
```

### 4. Running the Development Server

Start the Vite development server.

```bash
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

### 5. Build for Production

```bash
npm run build
```

## Testing

The application includes a test page to verify the analysis worker's performance on known video clips.

-   **Access the Test Page:** Navigate to `/test` (e.g., `http://localhost:5173/test`).
-   **Functionality:** The page loads the sample videos from `public/samples` and runs the analysis, displaying the seam quality metrics (SSIM and Histogram Difference) for the best loop candidate found.

## File Tree
```
endless-loop/
├── public/
│   ├── samples/
│   └── vendor/
├── src/
│   ├── App.tsx
│   ├── index.tsx
│   ├── Root.tsx
│   ├── TestPage.tsx
│   ├── types.ts
│   ├── components/
│   ├── store/
│   └── workers/
├── index.html
└── package.json
```
