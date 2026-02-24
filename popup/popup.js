const powerToggle = document.getElementById('power-toggle');
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

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
chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
    populateTracks();

    powerToggle.checked = data.enabled !== false; // Default to true
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
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value
    };

    chrome.storage.local.set(settings);
}

powerToggle.addEventListener('change', updateSettings);
volumeSlider.addEventListener('input', updateSettings);
trackSelect.addEventListener('change', updateSettings);

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
