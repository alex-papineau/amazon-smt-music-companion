# SMT IV: Amazon Edition

A Chrome Extension that plays the SMT IV Black Market OST while on Amazon. Complete with a popup UI to control the music.

*"Make sure you bring more Macca next time."*

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the root directory of this project.
5. **Visit Amazon.** The song should play automatically. Click the extension icon in the toolbar to open the controls.

## How it works

This extension uses a service worker to play the SMT IV Black Market OST while on Amazon. It uses an offscreen document to play the music, which is required for background audio playback in Manifest V3.

## TODO List

### Song Selection (priority: high)
- [x] Add Black Market theme to the plugin selection.
- [ ] Add Tanaka's Amazing Commodities theme to the plugin selection.
- [ ] Add Nocturne Junk Shop theme to the plugin selection.
- [ ] Add P1 Black Market theme to the plugin selection.
- [ ] Update plugin description and installation instructions.
- [ ] Implement local file picker/manager in the Plugin UI.

### Enhancements (priority: medium)
- [ ] Research alternative method for audio playback
- [ ] Volume fade-in/out transitions.
- [ ] Add a "Random" button to the track select.
- [ ] UI Styling updates.

### Browser Support (priority: low)
- [ ] Verify content script permissions across different browser engines.
