# SMT IV: Amazon Edition

A Chrome Extension that plays the SMT IV Black Market OST while on Amazon. Complete with a popup UI to control the music.

*"You HAD to come now, didn't you?"*

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the root directory of this project.
5. **Visit Amazon.** THe song should play automatically. Click the extension icon in the toolbar to open the controls.

## How it works

This extension uses a service worker to play the SMT IV Black Market OST while on Amazon. It uses an offscreen document to play the music, which is required for background audio playback in Manifest V3.

## TODO List

### Song Selection (priority: high)
- [ ] Add more themes to the plugin selection.
- [ ] Implement local file picker/manager in the Plugin UI.

### Enhancements (priority: medium)
- [ ] Volume fade-in/out transitions.
- [ ] Add a "Random" button to the track select.
- [ ] UI Styling updates.

### Browser Support (priority: low)
- [ ] Port manifest to Firefox (Manifest V2/V3 compatibility).
- [ ] Test hidden audio playback logic for Firefox background scripts.
- [ ] Verify content script permissions across different browser engines.
