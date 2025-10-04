# Loop Forge ✨

**Discover the infinite rhythm within your videos.**

Loop Forge is an intelligent, browser-based video looping tool. Given any input video, the application uses a sophisticated analysis engine to find the best loop points and outputs a seamlessly looping clip. It can even synthesize or edit transitional frames to make the loop appear truly infinite.

---

## 🚀 Core Features

-   **🤖 Automatic Loop Detection:** Simply upload a video, and the app's analysis engine automatically finds the best moments to create a seamless loop.
-   **🔬 Advanced Analysis:** Utilizes a combination of **SSIM** (Structural Similarity Index), **color histogram comparison**, and **optical flow** to score and rank the best potential loop candidates.
-   **🎨 Multiple Render Modes:**
    -   **Simple Cut:** The fastest option for a direct, clean cut between loop points.
    -   **Crossfade:** Creates a smooth dissolve for a gentle, seamless transition.
    -   **Flow Morph:** The highest quality option. Uses advanced frame interpolation to blend motion between the end and start frames for visually perfect loops.
-   **🔄 Ping-Pong Mode:** Creates a classic forward-and-reverse boomerang-style loop.
-   **💡 AI-Powered Title Suggestions:** Leverages the **Google Gemini API** to analyze the video's content and suggest creative, evocative titles perfect for social media.
-   **💾 Multiple Export Formats:** Download your final creation as a high-quality **MP4**, **WebM**, or an animated **GIF**.
-   **📊 Interactive Timeline:** Visualize all the top-scoring loop candidates on an interactive timeline. Click to select and preview any candidate instantly.
-   **🔍 Seam Inspection Tool:** A handy loupe tool allows you to closely examine the start and end frames of a potential loop to ensure a perfect match.

---

## 🛠️ Tech Stack

This project runs entirely in the browser, leveraging modern web technologies to perform tasks traditionally done on a server.

-   **Frontend:** **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **Zustand** (for global state management).
-   **Core Video & Image Processing:**
    -   **FFmpeg.wasm:** For all heavy-duty video processing: frame extraction, cutting, filtering, crossfading, and rendering into final formats.
    -   **OpenCV.js:** For computer vision tasks, including image comparison (SSIM, histogram), and optical flow analysis.
    -   **Web Workers:** The entire analysis and rendering pipelines run in background threads, ensuring the UI remains fast and responsive even during intensive computations.
-   **Artificial Intelligence:**
    -   **Google Gemini API:** For the "Suggest Titles" feature, sending extracted video frames for multimodal analysis.

---

## ⚙️ How It Works

1.  **Upload:** The user uploads a video file, which is loaded into the browser's memory. No data is uploaded to a server.
2.  **Analysis (in a Web Worker):**
    -   FFmpeg extracts frames from the video at a reduced resolution and a constant FPS to speed up analysis.
    -   OpenCV processes each frame, calculating its grayscale representation and color histogram.
    -   The worker iterates through all possible frame pairs (within a defined loop duration range).
    -   For each pair, it calculates a **composite score** based on:
        1.  **Structural Similarity (SSIM):** How structurally similar the two frames are.
        2.  **Histogram Comparison:** How similar the color distributions are.
        3.  **Optical Flow:** How much motion is detected between the frames. A lower motion value is better for a seamless loop.
    -   The highest-scoring frame pairs are identified as loop candidates and sent back to the main UI thread.
3.  **Selection & Preview:** The user sees the candidates on the timeline. Selecting a candidate updates the video player to continuously loop that specific segment.
4.  **Rendering (in a Web Worker):**
    -   Based on the user's selected candidate and render options (e.g., crossfade, flow morph), a complex FFmpeg command is constructed.
    -   FFmpeg executes this command in the worker to generate the final, perfectly looped video.
    -   The result is sent back as a Blob URL for final previewing and downloading.

---

## 💻 Getting Started

To run this project locally, follow these steps.

### Prerequisites

-   Node.js (v18 or newer)
-   npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/loop-forge.git
    cd loop-forge
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    The Gemini API is used for title suggestions. To enable this feature, you'll need an API key.

    -   Create a file named `.env.local` in the root of the project.
    -   Add your Gemini API key to this file:
        ```
        VITE_API_KEY=YOUR_GEMINI_API_KEY_HERE
        ```
    -   You can get a key from [Google AI Studio](https://aistudio.google.com/app/apikey).

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173`.

### Building for Production

To create a production-ready build:

```bash
npm run build
```

This will create a `dist` directory with the optimized, static assets for the application. You can preview the production build locally with `npm run preview`.