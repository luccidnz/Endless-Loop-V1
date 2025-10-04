// src/lib/gemini.ts
// FIX: Removed the failing 'vite/client' type reference. The necessary global types for
// `import.meta.env` are provided by a declaration in a higher-level component (App.tsx).

import { GoogleGenAI, Type } from "@google/genai";
import { logger } from "./logger";

// FIX: Switched from `process.env.API_KEY` to `import.meta.env.VITE_API_KEY`.
// `process.env` is not available in the browser with Vite by default, causing a runtime crash and a blank screen.
// `import.meta.env` is the correct way to access environment variables in Vite.
const API_KEY = import.meta.env.VITE_API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  // Update the error message to reflect the correct variable name.
  logger.error("VITE_API_KEY not found in environment variables. AI features will be disabled.");
}

/**
 * Extracts a specified number of frames from a video element as base64 strings.
 */
async function extractFramesFromVideo(videoElement: HTMLVideoElement, frameCount: number): Promise<string[]> {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const frames: string[] = [];
  const duration = videoElement.duration;
  
  if (duration === 0) {
    throw new Error("Video duration is 0, cannot extract frames.");
  }
  
  // Ensure video is ready to be processed
  await new Promise<void>(resolve => {
    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      resolve();
    } else {
      videoElement.onloadeddata = () => resolve();
    }
  });

  const originalTime = videoElement.currentTime;

  for (let i = 0; i < frameCount; i++) {
    const time = (duration / frameCount) * i;
    videoElement.currentTime = time;
    
    // Wait for the frame to be ready at the new time
    await new Promise<void>(resolve => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };
      videoElement.addEventListener('seeked', onSeeked, { once: true });
    });

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Remove 'data:image/jpeg;base64,' prefix
    frames.push(dataUrl.substring(dataUrl.indexOf(',') + 1));
  }
  
  // Restore video time
  videoElement.currentTime = originalTime;

  return frames;
}


/**
 * Generates creative titles for a video using Gemini.
 * @param videoElement The HTMLVideoElement containing the rendered loop.
 * @returns A promise that resolves to an array of suggested titles.
 */
export async function suggestTitlesForVideo(videoElement: HTMLVideoElement): Promise<string[]> {
  // FIX: Added a check to ensure the AI client is initialized before use.
  // This prevents runtime errors if the API key is missing.
  if (!ai) {
     throw new Error("Gemini AI is not initialized. Please ensure VITE_API_KEY is configured.");
  }
  try {
    logger.info("Extracting frames for Gemini analysis...");
    const base64Frames = await extractFramesFromVideo(videoElement, 4);
    logger.info(`Extracted ${base64Frames.length} frames.`);

    const imageParts = base64Frames.map(frame => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: frame,
      },
    }));

    const textPart = {
      text: "Analyze these frames from a short, looping video clip. Generate 5 creative, short, and evocative titles for it. The titles should be suitable for social media. They should capture the mood or action of the video."
    };
    
    logger.info("Calling Gemini API to suggest titles...");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [textPart, ...imageParts] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 5 creative titles for the video.",
            }
          }
        },
      }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);

    if (result.titles && Array.isArray(result.titles)) {
      logger.info("Successfully received titles from Gemini.", { titles: result.titles });
      return result.titles;
    } else {
      throw new Error("Invalid response format from Gemini API");
    }

  } catch (error) {
    logger.error("Error generating titles with Gemini:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
       throw new Error("The Gemini API key is not valid. Please check your configuration.");
    }
    throw new Error("Could not generate titles. Please try again later.");
  }
}
