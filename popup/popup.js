const powerToggle = document.getElementById('power-toggle');
const volumeSlider = document.getElementById('volume-slider');
const trackSelect = document.getElementById('track-select');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');

// Load settings
chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
    powerToggle.checked = data.enabled;
    volumeSlider.value = data.volume;
    trackSelect.value = data.track;
});

// Save settings and notify background
function updateSettings() {
    const settings = {
        enabled: powerToggle.checked,
        volume: parseInt(volumeSlider.value),
        track: trackSelect.value
    };

    chrome.storage.local.set(settings);
    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
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
