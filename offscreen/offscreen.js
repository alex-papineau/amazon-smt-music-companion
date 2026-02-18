const player = document.getElementById('player');
let currentTrack = '';
let currentVolume = 50;
let isEnabled = true;

console.log("Offscreen document loaded");

// Helper to update player state
function updatePlayer(track, volume, enabled) {
    if (track !== undefined) {
        const trackUrl = chrome.runtime.getURL(track);
        if (track !== currentTrack && track) {
            console.log(`Changing track source to: ${trackUrl}`);
            currentTrack = track;
            player.src = trackUrl;
            player.load();
        }
    }

    if (volume !== undefined) {
        currentVolume = volume;
        player.volume = volume / 100;
    }

    if (enabled !== undefined) {
        isEnabled = enabled;
    }

    console.log(`State: enabled=${isEnabled}, volume=${currentVolume}, track=${currentTrack}`);

    if (isEnabled) {
        if (player.paused) {
            console.log("Starting playback");
            player.play().catch(err => {
                if (err.name !== 'AbortError') console.error("Playback failed:", err);
            });
        }
    } else {
        if (!player.paused) {
            console.log("Pausing playback");
            player.pause();
        }
    }
}

// Initial state fetch
function init() {
    console.log("Requesting initial state from background");
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS_FOR_OFFSCREEN' }, (data) => {
        if (data) {
            console.log("Received initial state:", data);
            updatePlayer(data.track, data.volume, data.enabled);
        } else {
            console.error("Failed to get initial state from background");
        }
    });
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SYNC_OFFSCREEN') {
        console.log("Sync message received:", message.settings);
        const { track, volume, enabled } = message.settings;
        updatePlayer(track, volume, enabled);
    } else if (message.type === 'RESTART_OFFSCREEN') {
        console.log("Restarting track");
        player.currentTime = 0;
        player.play().catch(err => console.error("Restart failed:", err));
    }
    return true;
});

init();
