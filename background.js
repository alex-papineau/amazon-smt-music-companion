// Initialize storage with defaults
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        enabled: true,
        volume: 50,
        track: 'content/black_market.webm', // Local file
        activeTabs: []
    });
});

async function ensureOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;

    try {
        await chrome.offscreen.createDocument({
            url: 'offscreen/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play SMT IV background music while browsing Amazon.'
        });
    } catch (err) {
        if (!err.message.includes('Only a single offscreen document may be created')) {
            console.error(err);
        }
    }
}

async function closeOffscreen() {
    if (await chrome.offscreen.hasDocument()) {
        await chrome.offscreen.closeDocument();
    }
}

// Handle messages from content script, popup, and offscreen
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AMAZON_VISITED') {
        handleAmazonVisit(sender.tab.id);
    } else if (message.type === 'UPDATE_SETTINGS') {
        // Forward settings to offscreen if it exists
        chrome.runtime.sendMessage({ type: 'SYNC_OFFSCREEN', settings: message.settings }).catch(() => { });
    } else if (message.type === 'GET_SETTINGS') {
        chrome.storage.local.get(['enabled', 'volume', 'track'], (data) => {
            sendResponse(data);
        });
        return true; // Keep message channel open for async response
    } else if (message.type === 'RESTART_TRACK') {
        chrome.runtime.sendMessage({ type: 'RESTART_OFFSCREEN' }).catch(() => { });
    }
});

async function handleAmazonVisit(tabId) {
    const { enabled, activeTabs } = await chrome.storage.local.get(['enabled', 'activeTabs']);

    if (!enabled) return;

    if (!activeTabs.includes(tabId)) {
        const updatedTabs = [...activeTabs, tabId];
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
