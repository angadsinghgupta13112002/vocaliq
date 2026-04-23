/**
 * utils/frameExtractor.js - Browser-side Video Frame Extractor
 * Extracts JPEG frames from a video Blob at regular intervals using Canvas API.
 * Frames are returned as base64 strings for submission to Cloud Vision API.
 * Author: Samuel Paul Chetty | CS651 Project 2
 */

/**
 * extractFrames - Extracts frames from a video Blob at regular intervals.
 * Uses the HTML5 Video element and Canvas API — no server-side ffmpeg needed.
 *
 * @param {Blob}   videoBlob     - The recorded or uploaded video Blob
 * @param {number} intervalSecs  - Extract one frame every N seconds (default: 3)
 * @param {number} maxFrames     - Maximum number of frames to extract (default: 20)
 * @param {number} quality       - JPEG quality 0–1 (default: 0.7)
 * @returns {Promise<Array>}     - [{ second: number, base64: string }, ...]
 */
export const extractFrames = (videoBlob, intervalSecs = 3, maxFrames = 20, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Create a temporary object URL from the video Blob
    const videoUrl = URL.createObjectURL(videoBlob);
    const video    = document.createElement("video");
    const canvas   = document.createElement("canvas");
    const ctx      = canvas.getContext("2d");

    // Frames collected as { second, base64 }
    const frames = [];

    // Set canvas to a reduced resolution — 320x240 is sufficient for face detection
    const FRAME_WIDTH  = 320;
    const FRAME_HEIGHT = 240;
    canvas.width  = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;

    // Error handling
    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Could not load video for frame extraction."));
    };

    // Once metadata is loaded, we know the video duration
    video.onloadedmetadata = () => {
      const duration = video.duration;

      if (!duration || duration === Infinity) {
        URL.revokeObjectURL(videoUrl);
        // Can't extract frames from a video with unknown duration — return empty
        resolve([]);
        return;
      }

      // Calculate which seconds to extract frames at
      const seconds = [];
      for (let t = 0; t < duration && seconds.length < maxFrames; t += intervalSecs) {
        seconds.push(Math.round(t * 10) / 10); // round to 1 decimal
      }

      let index = 0;

      // Process one frame at a time by seeking the video and capturing the frame
      const captureNextFrame = () => {
        if (index >= seconds.length) {
          // All frames captured — clean up and resolve
          URL.revokeObjectURL(videoUrl);
          resolve(frames);
          return;
        }

        const second = seconds[index];
        video.currentTime = second;
      };

      // Fires each time the video finishes seeking to a new timestamp
      video.onseeked = () => {
        try {
          // Draw the current video frame to canvas
          ctx.drawImage(video, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

          // Export canvas as base64 JPEG (strip the data:image/jpeg;base64, prefix)
          const dataUrl  = canvas.toDataURL("image/jpeg", quality);
          const base64   = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

          frames.push({ second: seconds[index], base64 });
          index++;
          captureNextFrame();
        } catch (err) {
          // Skip this frame if drawing fails (e.g. cross-origin issue)
          index++;
          captureNextFrame();
        }
      };

      // Start extraction
      captureNextFrame();
    };

    // Trigger metadata load
    video.preload  = "metadata";
    video.muted    = true;
    video.src      = videoUrl;
    video.load();
  });
};
