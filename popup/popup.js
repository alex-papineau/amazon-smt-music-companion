
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const toggleBtn = document.getElementById('toggle-btn');
const restartBtn = document.getElementById('restart-btn');
const randomBtn = document.getElementById('random-btn');
const repeatBtn = document.getElementById('repeat-btn');
const marketStatus = document.getElementById('market-status');
const progressBar = document.getElementById('progress-bar');
const timeDisplay = document.getElementById('time-display');

const PLAY_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_ICON = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

let isMusicEnabled = true;

// Populate track list from CONFIG
function populateTracks() {
    trackSelect.innerHTML = '';
    CONFIG.TRACKS.forEach(track => {
        const option = document.createElement('option');
        option.value = getTrackUrl(track.filename);
        option.textContent = track.name;
        trackSelect.appendChild(option);
    });
}

// Load settings
chrome.storage.local.get(['enabled', 'volume', 'track', 'playEverywhere', 'repeat'], (data) => {
    populateTracks();

    isMusicEnabled = data.enabled !== false; // Default to true
    // Initially assume paused if unknown, it will sync in 500ms
    updateToggleIcon(isMusicEnabled, true);

    // activeTabToggle.checked = !!data.playEverywhere; // REMOVED
    volumeSlider.value = data.volume || 50;

    let track = data.track || getDefaultTrackUrl();
    trackSelect.value = track;

    updateRepeatState(!!data.repeat);
    checkAmazonTab();
});

function updateSettings() {
    const settings = {
        enabled: isMusicEnabled,
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value,
        repeat: repeatBtn.classList.contains('active')
    };

    chrome.storage.local.set(settings);
    // Optimistic UI update while waiting for actual sync
    updateToggleIcon(settings.enabled, !settings.enabled);
}

function updateRepeatState(isRepeating) {
    if (isRepeating) {
        repeatBtn.classList.add('active');
    } else {
        repeatBtn.classList.remove('active');
    }
}

async function checkAmazonTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url || "";
    const isAmazon = url.includes('amazon.com') || url.includes('amazon.ca') || url.includes('amazon.co.uk') ||
        url.includes('amazon.de') || url.includes('amazon.fr') || url.includes('amazon.it') ||
        url.includes('amazon.es') || url.includes('amazon.co.jp');

    if (isAmazon) {
        marketStatus.textContent = "ONLINE";
        marketStatus.style.color = "#fff";
        marketStatus.style.opacity = "1";
    } else {
        marketStatus.textContent = "OFFLINE // NO TARGET DETECTED";
        marketStatus.style.color = "var(--accent-red)";
        marketStatus.style.opacity = "0.8";
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateProgress() {
    chrome.runtime.sendMessage({ type: 'GET_PROGRESS' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response) {
            const { currentTime, duration, paused } = response;
            if (duration > 0) {
                progressBar.value = (currentTime / duration) * 100;
                timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
            // Update icon in real-time based on actual playback state
            chrome.storage.local.get('enabled', (data) => {
                updateToggleIcon(!!data.enabled, paused);
            });
        }
    });
}

// Start polling for progress
const progressInterval = setInterval(updateProgress, 500);

progressBar.addEventListener('input', () => {
    const seekTo = progressBar.value;
    chrome.runtime.sendMessage({ type: 'SEEK_TRACK', progress: parseFloat(seekTo) });
});

function updateToggleIcon(enabled, actualPaused) {
    // If enabled is false (Power Off), always show Play
    // If enabled is true (Power On) but context is wrong (actualPaused is true), show Play but maybe dim
    // If actually playing, show Pause
    
    toggleBtn.innerHTML = (enabled && !actualPaused) ? PAUSE_ICON : PLAY_ICON;
    
    // Use the glow-btn class or similar to show Power state
    if (enabled) {
        toggleBtn.classList.add('active-power');
    } else {
        toggleBtn.classList.remove('active-power');
    }

    const statusIcon = document.getElementById('status-icon');
    if (statusIcon) {
        statusIcon.style.opacity = (enabled && !actualPaused) ? "1" : "0.5";
        statusIcon.style.filter = (enabled && !actualPaused) ? "none" : "grayscale(1)";
    }
}


volumeSlider.addEventListener('input', updateSettings);
trackSelect.addEventListener('change', () => {
    isMusicEnabled = true;
    updateSettings();
});

// Keep UI in sync with storage
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.track) {
        trackSelect.value = changes.track.newValue;
    }
    if (area === 'local' && changes.enabled) {
        isMusicEnabled = changes.enabled.newValue;
        // Don't update icon here, let the poll handle it for accuracy
        // or do an optimistic update if you prefer.
    }
    if (area === 'local' && changes.repeat) {
        updateRepeatState(changes.repeat.newValue);
    }
});

toggleBtn.addEventListener('click', () => {
    isMusicEnabled = !isMusicEnabled;
    updateSettings();
});

restartBtn.addEventListener('click', () => {
    isMusicEnabled = true;
    updateSettings();
    chrome.runtime.sendMessage({ type: 'RESTART_TRACK' });
    
    // Quick flash effect
    restartBtn.style.backgroundColor = "#fff";
    setTimeout(() => restartBtn.style.backgroundColor = "", 150);
});

randomBtn.addEventListener('click', () => {
    isMusicEnabled = true;
    updateSettings();
    chrome.runtime.sendMessage({ type: 'RANDOMIZE_TRACK' });

    // Quick flash effect
    randomBtn.style.backgroundColor = "#fff";
    setTimeout(() => randomBtn.style.backgroundColor = "", 150);
});

repeatBtn.addEventListener('click', () => {
    const newState = !repeatBtn.classList.contains('active');
    updateRepeatState(newState);
    updateSettings();
});
