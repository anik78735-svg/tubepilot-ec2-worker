// ffmpegManager.js
// Ye file FFmpeg process ko start/stop/monitor karti hai.
// Har active stream ek "streamId" ke against track hoti hai is memory Map mein.

const { spawn } = require('child_process');
const fs = require('fs');

// In-memory store: streamId -> { process, videoPath, streamKey, startedAt }
const activeStreams = new Map();

/**
 * Ek video ko loop karke YouTube RTMP par bhejna shuru karta hai.
 * @param {string} streamId - unique id jo Render backend deta hai
 * @param {string} videoPath - server par video file ka full path
 * @param {string} youtubeStreamKey - user ke YouTube channel ki stream key
 * @returns {object} result { success, message }
 */
function startStream(streamId, videoPath, youtubeStreamKey) {
  // Agar ye streamId already chal raha hai to dobara start mat karo
  if (activeStreams.has(streamId)) {
    return { success: false, message: 'Ye stream already chal raha hai.' };
  }

  // Check karo video file exist karti hai ya nahi
  if (!fs.existsSync(videoPath)) {
    return { success: false, message: 'Video file server par nahi mili: ' + videoPath };
  }

  const rtmpUrl = `rtmp://a.rtmp.youtube.com/live2/${youtubeStreamKey}`;

  // FFmpeg command: video ko infinite loop karo (-stream_loop -1)
  // -re: real-time speed mein read karo (live streaming ke liye zaroori)
  // -c copy: bina re-encode kiye seedha bhej do (fast, kam CPU use hota hai)
  // -f flv: YouTube RTMP ke liye required format
  const ffmpegArgs = [
    '-re',
    '-stream_loop', '-1',
    '-i', videoPath,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-b:v', '2500k',
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    '-f', 'flv',
    rtmpUrl
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  ffmpegProcess.stderr.on('data', (data) => {
    // FFmpeg apni saari progress/errors stderr mein likhta hai (ye normal hai)
    console.log(`[Stream ${streamId}] ${data.toString().slice(0, 200)}`);
  });

  ffmpegProcess.on('close', (code) => {
    console.log(`[Stream ${streamId}] FFmpeg process band ho gayi. Exit code: ${code}`);
    activeStreams.delete(streamId);
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`[Stream ${streamId}] FFmpeg start hone mein error:`, err.message);
    activeStreams.delete(streamId);
  });

  activeStreams.set(streamId, {
    process: ffmpegProcess,
    videoPath,
    startedAt: Date.now()
  });

  return { success: true, message: 'Stream shuru ho gaya.' };
}

/**
 * Ek chal rahi stream ko band karta hai.
 * @param {string} streamId
 */
function stopStream(streamId) {
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return { success: false, message: 'Ye stream active nahi hai.' };
  }

  stream.process.kill('SIGKILL');
  activeStreams.delete(streamId);

  return { success: true, message: 'Stream band kar diya gaya.' };
}

/**
 * Kisi stream ka current status batata hai.
 */
function getStreamStatus(streamId) {
  const stream = activeStreams.get(streamId);

  if (!stream) {
    return { active: false };
  }

  const uptimeSeconds = Math.floor((Date.now() - stream.startedAt) / 1000);
  return { active: true, uptimeSeconds, videoPath: stream.videoPath };
}

/**
 * Saari active streams ki list (debugging/monitoring ke liye)
 */
function listActiveStreams() {
  const list = [];
  for (const [streamId, data] of activeStreams.entries()) {
    list.push({
      streamId,
      uptimeSeconds: Math.floor((Date.now() - data.startedAt) / 1000)
    });
  }
  return list;
}

module.exports = {
  startStream,
  stopStream,
  getStreamStatus,
  listActiveStreams
};
