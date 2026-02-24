# Amazon SMT Music Companion

A Chrome and Firefox Extension that plays music from a selection of black market/shopping related tracks from ATLUS' various games (SMT 4, SMT 3, P1 and P3 so far) while browsing Amazon. Complete with a popup UI to control the music.

*"Make sure you bring more Macca next time."*

## Installation -- Chrome

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top right).
4. Click **Load unpacked** and select the root directory of this project.
5. **Visit Amazon.** The song should play automatically. Click the extension icon in the toolbar to open the controls.

## Installation -- Firefox (wip to no longer use temporary add-on)

1. Clone or download this repository.
2. Open Firefox and navigate to `about:debugging`.
3. Click **This Firefox** in the top left.
4. Click **Load Temporary Add-on** and select the `manifest.json` file in the root directory of this project.
5. **Visit Amazon.** The song should play automatically. Click the extension icon in the toolbar to open the controls.

## How it works

The extension uses a background script to monitor your active tabs for Amazon URLs. When an Amazon page is detected, it triggers audio playback of tracks hosted via GitHub Pages to ensure a lightweight installation. The popup interface communicates with the background script using the WebExtension API to allow users to switch between different SMT shop themes, adjust volume, and toggle playback.

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
- [x] Add a "Random" button to the track select.
- [x] UI Styling updates.

### Browser Support (priority: low)
- [ ] Verify content script permissions across different browser engines.
