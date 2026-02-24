const activeTabToggle = document.getElementById('active-tab-toggle');
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const toggleBtn = document.getElementById('toggle-btn');
const restartBtn = document.getElementById('restart-btn');
const randomBtn = document.getElementById('random-btn');

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
chrome.storage.local.get(['enabled', 'volume', 'track', 'onlyActiveTab'], (data) => {
    populateTracks();

    isMusicEnabled = data.enabled !== false; // Default to true
    updateToggleIcon(isMusicEnabled);

    activeTabToggle.checked = data.onlyActiveTab !== false; // Default to true
    volumeSlider.value = data.volume || 50;

    let track = data.track || getDefaultTrackUrl();

    // For legacy support/safety if someone has an old local path stored or old name/repo
    const isOldPath = track.startsWith('assets/') || track.startsWith('content/');
    const isOldRepo = track.includes('smt-music-amazon-plugin');
    const isOldFilename = track.endsWith('/black_market.webm') && !track.includes('smt4_') && !track.includes('p1_');

    if (isOldPath || isOldRepo || isOldFilename) {
        track = getDefaultTrackUrl();
    }

    trackSelect.value = track;
});

// Save settings
function updateSettings() {
    const settings = {
        enabled: isMusicEnabled,
        onlyActiveTab: activeTabToggle.checked,
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value
    };

    chrome.storage.local.set(settings);
    updateToggleIcon(settings.enabled);
}

function updateToggleIcon(enabled) {
    toggleBtn.innerHTML = enabled ? PAUSE_ICON : PLAY_ICON;
}

activeTabToggle.addEventListener('change', updateSettings);
volumeSlider.addEventListener('input', updateSettings);
trackSelect.addEventListener('change', updateSettings);

// Listen for background changes (like Randomization) to keep UI in sync
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.track) {
        trackSelect.value = changes.track.newValue;
    }
    if (area === 'local' && changes.enabled) {
        isMusicEnabled = changes.enabled.newValue;
        updateToggleIcon(isMusicEnabled);
    }
});

toggleBtn.addEventListener('click', () => {
    isMusicEnabled = !isMusicEnabled;
    updateSettings();
});

restartBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESTART_TRACK' });
});

randomBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RANDOMIZE_TRACK' });
});
