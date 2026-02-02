// ═══════════════════════════════════════════════════════════════
// HYPERFOCUS // SKYNETLABS v2.1 — Offscreen Audio Controller
// Manifest V3 compliant audio playback via Offscreen Document
// www.skynetjoe.com
// ═══════════════════════════════════════════════════════════════

'use strict';

const audioPlayer = document.getElementById('audioPlayer');

// Audio file mapping
const AUDIO_FILES = {
  'focus-start': 'audio/focus-start.mp3',
  'focus-end': 'audio/focus-end.mp3',
  'focus-complete': 'audio/focus-complete.mp3',
  'task-complete': 'audio/task-complete.mp3',
  'level-up': 'audio/level-up.mp3',
  'achievement': 'audio/achievement.mp3',
  'notification': 'audio/notification.mp3',
  'tick': 'audio/tick.mp3',
  'warning': 'audio/warning.mp3',
  'locked': 'audio/locked.mp3'
};

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') {
    return;
  }

  switch (message.action) {
    case 'playSound':
      playSound(message.sound, message.volume)
        .then(() => sendResponse({ success: true }))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true; // Keep channel open for async response

    case 'stopSound':
      stopSound();
      sendResponse({ success: true });
      break;

    case 'setVolume':
      setVolume(message.volume);
      sendResponse({ success: true });
      break;

    case 'ping':
      sendResponse({ success: true, status: 'ready' });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

/**
 * Play a sound effect
 * @param {string} soundId - The sound identifier
 * @param {number} volume - Volume level (0-1)
 */
async function playSound(soundId, volume = 0.5) {
  try {
    const audioFile = AUDIO_FILES[soundId];
    if (!audioFile) {
      console.warn(`[HYPERFOCUS Audio] Unknown sound: ${soundId}`);
      return;
    }

    // Stop any currently playing audio
    audioPlayer.pause();
    audioPlayer.currentTime = 0;

    // Set source and volume
    audioPlayer.src = chrome.runtime.getURL(audioFile);
    audioPlayer.volume = Math.max(0, Math.min(1, volume));

    // Play the sound
    await audioPlayer.play();
    console.log(`[HYPERFOCUS Audio] Playing: ${soundId}`);
  } catch (err) {
    console.error(`[HYPERFOCUS Audio] Error playing ${soundId}:`, err);
    throw err;
  }
}

/**
 * Stop currently playing audio
 */
function stopSound() {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  console.log('[HYPERFOCUS Audio] Stopped');
}

/**
 * Set the volume level
 * @param {number} volume - Volume level (0-1)
 */
function setVolume(volume) {
  audioPlayer.volume = Math.max(0, Math.min(1, volume));
  console.log(`[HYPERFOCUS Audio] Volume set to: ${volume}`);
}

// Log initialization
console.log('[HYPERFOCUS Audio] Offscreen document initialized');
