/**
 * utils/serverFrameExtractor.js - Server-side video frame extraction via ffmpeg
 * Used for Google Drive videos where the client never downloads the file.
 * Extracts JPEG frames at a fixed interval, returns base64 strings for
 * the Cloud Vision emotion timeline pipeline.
 * Author: VocalIQ Team | CS651 Project 2
 */
const { execFile } = require("child_process");
const fs           = require("fs");
const os           = require("os");
const path         = require("path");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

/**
 * extractFramesFromBuffer — extracts JPEG frames from a raw video buffer using ffmpeg.
 *
 * @param {Buffer} videoBuffer    — raw video data (any format ffmpeg supports)
 * @param {string} mimeType       — MIME type to determine file extension
 * @param {number} intervalSecs   — capture one frame every N seconds (default 3)
 * @param {number} maxFrames      — hard cap on frames to prevent runaway (default 20)
 * @returns {Array}               — [{ second: number, base64: string }, ...]
 */
const extractFramesFromBuffer = async (
  videoBuffer,
  mimeType    = "video/mp4",
  intervalSecs = 3,
  maxFrames    = 20,
) => {
  // Derive a sensible temp-file extension from MIME type
  const ext =
    mimeType.includes("quicktime") ? "mov"  :
    mimeType.includes("webm")      ? "webm" :
    mimeType.includes("x-msvideo") ? "avi"  : "mp4";

  const ts       = Date.now();
  const tmpInput = path.join(os.tmpdir(), `vocaliq_in_${ts}.${ext}`);
  const tmpDir   = path.join(os.tmpdir(), `vocaliq_frames_${ts}`);

  fs.writeFileSync(tmpInput, videoBuffer);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Extract one frame every intervalSecs seconds, high-quality JPEG
    await execFileAsync("ffmpeg", [
      "-i",       tmpInput,
      "-vf",      `fps=1/${intervalSecs}`,
      "-frames:v", String(maxFrames),
      "-q:v",     "3",          // JPEG quality 1 (best) – 31 (worst); 3 is excellent
      "-f",       "image2",
      path.join(tmpDir, "frame_%04d.jpg"),
    ], { timeout: 120_000 });   // 2-minute hard limit

    const files  = fs.readdirSync(tmpDir).filter(f => f.endsWith(".jpg")).sort();
    const frames = files.map((file, i) => ({
      second: i * intervalSecs,
      base64: fs.readFileSync(path.join(tmpDir, file)).toString("base64"),
    }));

    console.log(`[frameExtractor] Extracted ${frames.length} frames server-side (${intervalSecs}s interval)`);
    return frames;

  } catch (err) {
    console.warn("[frameExtractor] ffmpeg extraction failed:", err.message);
    return [];
  } finally {
    // Always clean up temp files — don't let errors leave gigabytes of junk
    try { fs.unlinkSync(tmpInput); } catch (_) {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
  }
};

module.exports = { extractFramesFromBuffer };
