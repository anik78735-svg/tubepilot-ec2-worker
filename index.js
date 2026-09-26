// index.js
// Ye EC2 server par chalne wala chhota API hai.
// Render backend isi API ko call karke FFmpeg ko start/stop karwayega.

require('dotenv').config();
const express = require('express');
const path = require('path');
const ffmpegManager = require('./ffmpegManager');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const WORKER_SECRET_KEY = process.env.WORKER_SECRET_KEY;
const VIDEO_STORAGE_PATH = process.env.VIDEO_STORAGE_PATH || '/home/ubuntu/tubepilot-live/videos';

// --- Security Middleware ---
// Sirf wahi request allow hogi jisme sahi secret key ho (Render backend ke paas ye key hogi)
function verifySecretKey(req, res, next) {
  const providedKey = req.headers['x-worker-secret'];

  if (!providedKey || providedKey !== WORKER_SECRET_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized - galat secret key.' });
  }
  next();
}

// Health check - ye check karne ke liye ki server zinda hai
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'EC2 worker chal raha hai.' });
});

// Stream shuru karo
app.post('/start', verifySecretKey, (req, res) => {
  const { streamId, videoFileName, youtubeStreamKey } = req.body;

  if (!streamId || !videoFileName || !youtubeStreamKey) {
    return res.status(400).json({
      success: false,
      message: 'streamId, videoFileName aur youtubeStreamKey zaroori hain.'
    });
  }

  const videoPath = path.join(VIDEO_STORAGE_PATH, videoFileName);
  const result = ffmpegManager.startStream(streamId, videoPath, youtubeStreamKey);

  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json(result);
});

// Stream band karo
app.post('/stop', verifySecretKey, (req, res) => {
  const { streamId } = req.body;

  if (!streamId) {
    return res.status(400).json({ success: false, message: 'streamId zaroori hai.' });
  }

  const result = ffmpegManager.stopStream(streamId);
  const statusCode = result.success ? 200 : 400;
  res.status(statusCode).json(result);
});

// Ek stream ka status check karo
app.get('/status/:streamId', verifySecretKey, (req, res) => {
  const status = ffmpegManager.getStreamStatus(req.params.streamId);
  res.json({ success: true, ...status });
});

// Saari active streams dekhne ke liye (monitoring)
app.get('/active-streams', verifySecretKey, (req, res) => {
  const streams = ffmpegManager.listActiveStreams();
  res.json({ success: true, streams });
});

app.listen(PORT, () => {
  console.log(`TubePilot EC2 worker chal raha hai port ${PORT} par`);
});
