const powerToggle = document.getElementById('power-toggle');
const activeTabToggle = document.getElementById('active-tab-toggle');
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const randomBtn = document.getElementById('random-btn');

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

    powerToggle.checked = data.enabled !== false; // Default to true
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
        enabled: powerToggle.checked,
        onlyActiveTab: activeTabToggle.checked,
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value
    };

    chrome.storage.local.set(settings);
}

powerToggle.addEventListener('change', updateSettings);
activeTabToggle.addEventListener('change', updateSettings);
volumeSlider.addEventListener('input', updateSettings);
trackSelect.addEventListener('change', updateSettings);

// Listen for background changes (like Randomization) to keep UI in sync
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.track) {
        trackSelect.value = changes.track.newValue;
    }
});

playBtn.addEventListener('click', () => {
    powerToggle.checked = true;
    updateSettings();
});

pauseBtn.addEventListener('click', () => {
    powerToggle.checked = false;
    updateSettings();
});

restartBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESTART_TRACK' });
});

randomBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RANDOMIZE_TRACK' });
});
