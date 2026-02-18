// Initialize storage with defaults and handle migrations
chrome.runtime.onInstalled.addListener(async (details) => {
    const data = await chrome.storage.local.get(['enabled', 'volume', 'track']);

    const defaults = {
        enabled: data.enabled ?? true,
        volume: data.volume ?? 50,
        track: data.track ?? 'assets/black_market.webm',
        activeTabs: []
    };

    // Migrate old content/ path to assets/
    if (defaults.track.startsWith('content/')) {
        defaults.track = defaults.track.replace('content/', 'assets/');
    }

    await chrome.storage.local.set(defaults);
});

// Clear active tabs on restart/startup
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.set({ activeTabs: [] });
});

// Force clear active tabs on every service worker start (including reloads)
chrome.storage.local.set({ activeTabs: [] });

async function ensureOffscreen() {
    if (await chrome.offscreen.hasDocument()) {
        console.log("Offscreen document already exists");
        return;
    }

    try {
        console.log("Creating offscreen document...");
        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play SMT IV background music while browsing Amazon.'
        });
        console.log("Offscreen document created");
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

// Handle messages from content script, popup, and offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AMAZON_VISITED') {
        console.log(`Amazon visited on tab ${sender.tab.id}`);
        handleAmazonVisit(sender.tab.id);
    } else if (message.type === 'RESTART_TRACK') {
        console.log("Restart message received");
        chrome.runtime.sendMessage({ type: 'RESTART_OFFSCREEN' }).catch(() => { });
    } else if (message.type === 'GET_SETTINGS_FOR_OFFSCREEN') {
        chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
            sendResponse(data);
        });
        return true;
    }
});

// Listen for storage changes to sync with offscreen document
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.enabled || changes.volume || changes.track) {
            console.log("Storage changed,Fetching latest settings to notify offscreen...");
            chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
                chrome.runtime.sendMessage({
                    type: 'SYNC_OFFSCREEN',
                    settings: {
                        enabled: data.enabled,
                        volume: data.volume,
                        track: data.track
                    }
                }).catch(() => {
                    // Offscreen might not be open, that's fine
                });
            });
        }
    }
});

async function handleAmazonVisit(tabId) {
    const { enabled, activeTabs } = await chrome.storage.local.get(['enabled', 'activeTabs']);

    if (!enabled) {
        console.log("Plugin disabled, ignoring visit");
        return;
    }

    if (!activeTabs.includes(tabId)) {
        const updatedTabs = [...activeTabs, tabId];
        console.log(`Adding tab ${tabId} to active list. Total: ${updatedTabs.length}`);
        await chrome.storage.local.set({ activeTabs: updatedTabs });

        if (updatedTabs.length === 1) {
            await ensureOffscreen();
        }
    }
}

// Monitor tab removals
chrome.tabs.onRemoved.addListener(async (tabId) => {
    const data = await chrome.storage.local.get(['activeTabs']);
    const activeTabs = data.activeTabs || [];

    if (activeTabs.includes(tabId)) {
        const updatedTabs = activeTabs.filter(id => id !== tabId);
        await chrome.storage.local.set({ activeTabs: updatedTabs });

        if (updatedTabs.length === 0) {
            await closeOffscreen();
        }
    }
});
