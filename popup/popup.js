const activeTabToggle = document.getElementById('active-tab-toggle');
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const toggleBtn = document.getElementById('toggle-btn');
const restartBtn = document.getElementById('restart-btn');
const randomBtn = document.getElementById('random-btn');
const repeatBtn = document.getElementById('repeat-btn');
const marketStatus = document.getElementById('market-status');
const progressBar = document.getElementById('progress-bar');
const timeDisplay = document.getElementById('time-display');

const PLAY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
const PAUSE_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;

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
chrome.storage.local.get(['enabled', 'volume', 'track', 'onlyActiveTab', 'repeat'], (data) => {
    populateTracks();

    isMusicEnabled = data.enabled !== false; // Default to true
    updateToggleIcon(isMusicEnabled);

    activeTabToggle.checked = data.onlyActiveTab !== false; // Default to true
    volumeSlider.value = data.volume || 50;

    let track = data.track || getDefaultTrackUrl();
    trackSelect.value = track;

    updateRepeatState(!!data.repeat);
    checkAmazonTab();
});

function updateSettings() {
    const settings = {
        enabled: isMusicEnabled,
        onlyActiveTab: activeTabToggle.checked,
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value,
        repeat: repeatBtn.classList.contains('active')
    };

    chrome.storage.local.set(settings);
    updateToggleIcon(settings.enabled);
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
        marketStatus.textContent = "CONNECTED: Market is open.";
        marketStatus.style.color = "#fff";
    } else {
        marketStatus.textContent = "WAITING: No market detected in sector.";
        marketStatus.style.color = "#ff3e3e";
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
        }
    });
}

// Start polling for progress
const progressInterval = setInterval(updateProgress, 500);

progressBar.addEventListener('input', () => {
    const seekTo = progressBar.value;
    chrome.runtime.sendMessage({ type: 'SEEK_TRACK', progress: parseFloat(seekTo) });
});

function updateToggleIcon(enabled) {
    toggleBtn.innerHTML = enabled ? PAUSE_ICON : PLAY_ICON;
}

activeTabToggle.addEventListener('change', updateSettings);
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
        updateToggleIcon(isMusicEnabled);
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
    // Turning on power when clicking Restart for less buggy UX
    isMusicEnabled = true;
    updateSettings();
    chrome.runtime.sendMessage({ type: 'RESTART_TRACK' });
});

randomBtn.addEventListener('click', () => {
    // Turning on power when clicking Random for less buggy UX
    isMusicEnabled = true;
    updateSettings();
    chrome.runtime.sendMessage({ type: 'RANDOMIZE_TRACK' });
});

repeatBtn.addEventListener('click', () => {
    const newState = !repeatBtn.classList.contains('active');
    updateRepeatState(newState);
    updateSettings();
});
