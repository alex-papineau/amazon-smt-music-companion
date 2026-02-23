// Initialize storage with defaults and handle migrations
chrome.runtime.onInstalled.addListener(async (details) => {
    const data = await chrome.storage.local.get(['enabled', 'volume', 'track']);

    const defaults = {
        enabled: data.enabled ?? true,
        volume: data.volume ?? 50,
        track: data.track ?? 'assets/black_market.webm'
    };

    // Migrate old content/ path to assets/
    if (defaults.track.startsWith('content/')) {
        defaults.track = defaults.track.replace('content/', 'assets/');
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
} else {
    console.log("Environment is Service Worker. Utilizing Offscreen API.");
}

// Function to handle direct audio playback (Firefox mainly)
function updateDirectAudio(track, volume, enabled) {
    if (!audioPlayer) return;

    if (track !== undefined) {
        const trackUrl = chrome.runtime.getURL(track);
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

    if (isAudioEnabled) {
        if (audioPlayer.paused) {
            console.log("Starting direct playback");
            audioPlayer.play().catch(err => {
                if (err.name !== 'AbortError') console.error("Direct playback failed:", err);
            });
        }
    } else {
        if (!audioPlayer.paused) {
            console.log("Pausing direct playback");
            audioPlayer.pause();
        }
    }
}

// Helper to sync offscreen document state or direct audio with current browser state
async function syncState() {
    const { enabled, volume, track } = await chrome.storage.local.get(['enabled', 'volume', 'track']);

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
    console.log(`Sync check: enabled=${enabled}, active amazon tabs=${amazonTabs.length}`);

    if (HAS_DOM) {
        // Direct Audio Logic
        if (enabled && hasAmazonTabs) {
            updateDirectAudio(track, volume, true);
        } else {
            updateDirectAudio(track, volume, false);
        }
    } else {
        // Service Worker / Offscreen Logic
        if (enabled && hasAmazonTabs) {
            await ensureOffscreen();
            // Give a tiny moment for document to wake up if just created
            setTimeout(() => {
                chrome.runtime.sendMessage({ type: 'SYNC_OFFSCREEN', settings: { enabled, volume, track } }).catch(() => { });
            }, 100);
        } else {
            await closeOffscreen();
        }
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
        syncState();
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
            sendResponse(data);
        });
        return true;
    }
});

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
        syncState(); // active tabs check is integrated in syncState, simplifed handling
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
    setTimeout(syncState, 100);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // We sync on URL changes or status completion to be safe
    if (changeInfo.url || changeInfo.status === 'complete') {
        // Also delay slightly to ensure tab status is reflected
        setTimeout(syncState, 100);
    }
});

// Initial sync
syncState();
