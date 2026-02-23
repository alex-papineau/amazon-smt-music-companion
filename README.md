# SMT IV: Amazon Edition

A Chrome and Firefox Extension that plays music from a selection of black market/shopping related tracks from ATLUS' various game while browsing Amazon. Complete with a popup UI to control the music.

*"Make sure you bring more Macca next time."*

## Installation -- Chrome

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the root directory of this project.
5. **Visit Amazon.** The song should play automatically. Click the extension icon in the toolbar to open the controls.

## Installation -- Firefox

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging`.
3. Click **This Firefox** in the top left.
4. Click **Load Temporary Add-on** and select the `manifest.json` file in the root directory of this project.
5. **Visit Amazon.** The song should play automatically. Click the extension icon in the toolbar to open the controls.

## How it works

This extension uses a service worker to play the selected track while on Amazon. It uses an offscreen document to play the music, which is required for background audio playback in Manifest V3.

## TODO List

### Song Selection (priority: high)
- [x] Implement alternative method for audio playback -- github page hosting
- [x] Add Black Market theme to the plugin selection.
- [x] Add Tanaka's Amazing Commodities theme to the plugin selection.
- [x] Add Nocturne Junk Shop theme to the plugin selection.
- [x] Add P1 Black Market theme to the plugin selection.
- [ ] Update plugin description and installation instructions.
- [x] Implement file picker/manager in the Plugin UI.

### Enhancements (priority: medium)
- [x] Research alternative method for audio playback -- github page hosting
- [ ] Volume fade-in/out transitions.
- [ ] Add a "Random" button to the track select.
- [ ] UI Styling updates.

### Browser Support (priority: low)
- [ ] Verify content script permissions across different browser engines.
