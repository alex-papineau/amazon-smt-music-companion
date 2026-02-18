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

// Helper to sync offscreen document state with current browser state
async function syncOffscreenState() {
    const { enabled } = await chrome.storage.local.get(['enabled']);

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

    if (enabled && hasAmazonTabs) {
        await ensureOffscreen();
        // Give a tiny moment for document to wake up if just created
        const settings = await chrome.storage.local.get(['enabled', 'volume', 'track']);
        setTimeout(() => {
            chrome.runtime.sendMessage({ type: 'SYNC_OFFSCREEN', settings }).catch(() => { });
        }, 100);
    } else {
        await closeOffscreen();
    }
}

async function ensureOffscreen() {
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
    if (await chrome.offscreen.hasDocument()) {
        console.log("Closing offscreen document");
        await chrome.offscreen.closeDocument();
    }
}

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AMAZON_VISITED') {
        syncOffscreenState();
    } else if (message.type === 'RESTART_TRACK') {
        chrome.runtime.sendMessage({ type: 'RESTART_OFFSCREEN' }).catch(() => { });
    } else if (message.type === 'GET_SETTINGS_FOR_OFFSCREEN') {
        chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
            sendResponse(data);
        });
        return true;
    }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.enabled) {
            syncOffscreenState();
        } else if (changes.volume || changes.track) {
            chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
                chrome.runtime.sendMessage({ type: 'SYNC_OFFSCREEN', settings: data }).catch(() => { });
            });
        }
    }
});

// Tab event listeners
chrome.tabs.onRemoved.addListener(syncOffscreenState);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // We sync on URL changes or status completion to be safe
    if (changeInfo.url || changeInfo.status === 'complete') {
        syncOffscreenState();
    }
});

// Initial sync on service worker wake
syncOffscreenState();
