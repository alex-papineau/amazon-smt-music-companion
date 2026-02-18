const player = document.getElementById('player');
let currentTrack = '';

function init() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (data) => {
        if (data && data.enabled) {
            updatePlayer(data.track, data.volume, data.enabled);
        }
    });
}

function updatePlayer(track, volume, enabled) {
    // Convert relative extension path to full URL
    const trackUrl = chrome.runtime.getURL(track);

    if (track !== currentTrack) {
        currentTrack = track;
        player.src = trackUrl;
        player.load();
    }

    player.volume = volume / 100;

    if (enabled) {
        player.play().catch(err => console.error("Playback failed:", err));
    } else {
        player.pause();
    }
}

// Listen for updates from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SYNC_OFFSCREEN') {
        const { track, volume, enabled } = message.settings;
        updatePlayer(track, volume, enabled);
    } else if (message.type === 'RESTART_OFFSCREEN') {
        player.currentTime = 0;
        player.play().catch(err => console.error("Restart failed:", err));
    }
});

init();
