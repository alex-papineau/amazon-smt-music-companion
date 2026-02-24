// Initialize storage with defaults and handle migrations
chrome.runtime.onInstalled.addListener(async (details) => {
    const data = await chrome.storage.local.get(['enabled', 'volume', 'track']);

    // Migration logic
    const defaults = {
        enabled: data.enabled ?? true,
        volume: data.volume ?? 50,
        track: data.track ?? getRandomTrackUrl(),
        onlyActiveTab: data.onlyActiveTab ?? true
    };

    // Ensure track is remote and using the correct repo
    const isOldPath = defaults.track.startsWith('assets/') || defaults.track.startsWith('content/');
    const isOldRepo = defaults.track.includes('smt-music-amazon-plugin');
    const isOldFilename = defaults.track.endsWith('/black_market.webm') && !defaults.track.includes('smt4_') && !defaults.track.includes('p1_');

    if (isOldPath || isOldRepo || isOldFilename) {
        defaults.track = getDefaultTrackUrl();
    }

    await chrome.storage.local.set(defaults);
});

// Detect environment capabilities
const HAS_DOM = typeof window !== 'undefined' && typeof window.document !== 'undefined';
let audioPlayer = null;
let currentTrack = '';
let currentVolume = 50;
let isAudioEnabled = true;

if (HAS_DOM) {
    console.log("Environment supports DOM access. Utilizing direct audio playback.");
    audioPlayer = new Audio();
    audioPlayer.loop = true;
    audioPlayer.crossOrigin = 'anonymous';
} else {
    console.log("Environment is Service Worker. Utilizing Offscreen API.");
}

// Function to handle direct audio playback (Firefox mainly)
function updateDirectAudio(track, volume, enabled) {
    if (!audioPlayer) return;

    if (track !== undefined) {
        const trackUrl = (track.startsWith('http://') || track.startsWith('https://'))
            ? track
            : chrome.runtime.getURL(track);

        if (track !== currentTrack && track) {
            console.log(`Changing track source to: ${trackUrl}`);
            currentTrack = track;
            audioPlayer.src = trackUrl;
            audioPlayer.load();
        }
    }

    if (volume !== undefined) {
        currentVolume = volume;
        audioPlayer.volume = volume / 100;
    }

    if (enabled !== undefined) {
        isAudioEnabled = enabled;
    }

    console.log(`Direct Audio State: enabled=${isAudioEnabled}, volume=${currentVolume}, track=${currentTrack}`);
}

// Separated play/pause logic so it can be called synchronously
function applyPlaybackState() {
    if (!audioPlayer) return;
    if (isAudioEnabled) {
        if (audioPlayer.paused) {
            console.log('Starting direct playback');
            audioPlayer.play().catch(err => {
                if (err.name !== 'AbortError') console.error('Direct playback failed:', err);
            });
        }
    } else {
        if (!audioPlayer.paused) {
            console.log('Pausing direct playback');
            audioPlayer.pause();
        }
    }
}

// Helper to sync offscreen document state or direct audio with current browser state
async function syncState() {
    let { enabled, volume, track, onlyActiveTab } = await chrome.storage.local.get(['enabled', 'volume', 'track', 'onlyActiveTab']);

    // Default onlyActiveTab if not set
    if (onlyActiveTab === undefined) onlyActiveTab = true;

    // Robust Migration: Always check if the current track is a legacy local path or old repo
    const isOldPath = track && (track.startsWith('assets/') || track.startsWith('content/'));
    const isOldRepo = track && track.includes('smt-music-amazon-plugin');
    const isOldFilename = track && track.endsWith('/black_market.webm') && !track.includes('smt4_') && !track.includes('p1_');

    if (isOldPath || isOldRepo || isOldFilename) {
        console.log("Migration triggered: correcting legacy track path.");
        track = getDefaultTrackUrl();
        await chrome.storage.local.set({ track });
    }

    // Check if any Amazon tabs are open
    const amazonTabs = await chrome.tabs.query({
        url: [
            "https://*.amazon.com/*",
            "https://*.amazon.ca/*",
            "https://*.amazon.co.uk/*",
            "https://*.amazon.de/*",
            "https://*.amazon.fr/*",
            "https://*.amazon.it/*",
            "https://*.amazon.es/*",
            "https://*.amazon.co.jp/*"
        ]
    });

    const hasAmazonTabs = amazonTabs.length > 0;

    // Check if current active tab is Amazon
    let isActiveTabAmazon = false;
    if (onlyActiveTab) {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (activeTab && activeTab.url) {
            const url = activeTab.url;
            isActiveTabAmazon = url.includes('amazon.com') || url.includes('amazon.ca') || url.includes('amazon.co.uk') ||
                url.includes('amazon.de') || url.includes('amazon.fr') || url.includes('amazon.it') ||
                url.includes('amazon.es') || url.includes('amazon.co.jp');
        }
    }

    const shouldPlay = enabled && hasAmazonTabs && (!onlyActiveTab || isActiveTabAmazon);

    console.log(`Sync check: enabled=${enabled}, active amazon tabs=${amazonTabs.length}, onlyActiveTab=${onlyActiveTab}, isActiveTabAmazon=${isActiveTabAmazon}, track=${track}`);

    // Priority Logic: Use Offscreen for Chrome (Service Workers), but Direct Audio for Firefox (Background Pages)
    // UNLESS direct audio fails or isn't possible.
    if (!HAS_DOM) {
        // Service Worker / Offscreen Logic (Chrome)
        if (shouldPlay) {
            await ensureOffscreen();
            setTimeout(() => {
                chrome.runtime.sendMessage({ type: 'SYNC_OFFSCREEN', settings: { enabled, volume, track } }).catch(() => { });
            }, 100);
        } else {
            await closeOffscreen();
        }
    } else {
        // Direct Audio Logic (Firefox)
        // Only update state here - actual play() is called synchronously from the message handler
        updateDirectAudio(track, volume, shouldPlay);
    }
}

async function ensureOffscreen() {
    if (HAS_DOM) return; // Should not happen given logic, but safety check

    // Check if offscreen API is available (it might not be in Firefox even if no DOM, though unlikely combo)
    if (!chrome.offscreen) {
        console.warn("chrome.offscreen API not available.");
        return;
    }

    if (await chrome.offscreen.hasDocument()) return;

    try {
        console.log("Creating offscreen document...");
        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play SMT IV background music while browsing Amazon.'
        });
    } catch (err) {
        if (!err.message.includes('Only a single offscreen document may be created')) {
            console.error("Failed to create offscreen document:", err);
        }
    }
}

async function closeOffscreen() {
    if (HAS_DOM) return;

    if (chrome.offscreen && await chrome.offscreen.hasDocument()) {
        console.log("Closing offscreen document");
        await chrome.offscreen.closeDocument();
    }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AMAZON_VISITED') {
        // Trigger sync to update tab count and verify state
        syncState().then(() => {
            if (HAS_DOM) {
                // For Firefox: we play immediately when sync is done.
                // The delay the user saw might be because syncState waits for tabs.query.
                // Since this message came FROM an Amazon tab, we already know we have at least one.
                applyPlaybackState();
            }
        });
    } else if (message.type === 'RANDOMIZE_TRACK') {
        randomizeTrack();
    } else if (message.type === 'RESTART_TRACK') {
        if (HAS_DOM) {
            if (audioPlayer) {
                console.log("Restarting direct track");
                audioPlayer.currentTime = 0;
                audioPlayer.play().catch(console.error);
            }
        } else {
            chrome.runtime.sendMessage({ type: 'RESTART_OFFSCREEN' }).catch(() => { });
        }
    } else if (message.type === 'GET_SETTINGS_FOR_OFFSCREEN') {
        chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
            sendResponse(data || {});
        });
        return true;
    }

    // Explicitly return false for unhandled messages to avoid "Promise response went out of scope" error in Firefox
    return false;
});

// Select a random track and update storage
async function randomizeTrack() {
    const newTrack = getRandomTrackUrl();
    await chrome.storage.local.set({ track: newTrack });
    syncState().then(() => {
        if (HAS_DOM) applyPlaybackState();
    });
}

// Keep-alive for Firefox
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keep-alive') {
        // console.log("Keep-alive port connected");
        port.onMessage.addListener((msg) => {
            if (msg.type === 'ping') {
                // console.log("Received keep-alive ping");
            }
        });
        port.onDisconnect.addListener(() => {
            // console.log("Keep-alive port disconnected");
        });
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        syncState().then(() => {
            if (HAS_DOM) applyPlaybackState();
        });
    }
});

// Fallback heartbeat for Firefox MV3 (alarms keep the script alive)
chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'heartbeat') {
        // Just waking up
        // console.log("Background heartbeat alarm fired");
    }
});

// Tab event listeners
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    // Give a small delay to ensure tab is fully removed from query results
    setTimeout(() => {
        syncState().then(() => {
            if (HAS_DOM) applyPlaybackState();
        });
    }, 100);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // We sync on URL changes or status completion to be safe
    if (changeInfo.url || changeInfo.status === 'complete') {
        // Also delay slightly to ensure tab status is reflected
        setTimeout(() => {
            syncState().then(() => {
                if (HAS_DOM) applyPlaybackState();
            });
        }, 100);
    }
});

// New listeners for "Active Tab Only" mode
chrome.tabs.onActivated.addListener(() => {
    syncState().then(() => {
        if (HAS_DOM) applyPlaybackState();
    });
});

chrome.windows.onFocusChanged.addListener(() => {
    syncState().then(() => {
        if (HAS_DOM) applyPlaybackState();
    });
});

// Initial sync
syncState();
