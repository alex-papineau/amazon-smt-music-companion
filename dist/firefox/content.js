// Notify background that a valid Amazon page is loaded
chrome.runtime.sendMessage({ type: 'AMAZON_VISITED' });

// Keep-alive connection for Firefox background script
let port = null;

function connectKeepAlive() {
  port = chrome.runtime.connect({ name: 'keep-alive' });
  port.onDisconnect.addListener(() => {
    console.log("Keep-alive port disconnected. Attempting to reconnect...");
    setTimeout(connectKeepAlive, 5000); // Reconnect after 5 seconds
  });
}

connectKeepAlive();

// Periodic ping to keep background alive in Firefox MV3
setInterval(() => {
  if (port) {
    try {
      port.postMessage({ type: 'ping' });
    } catch (e) {
      // Port might be closed, handled by onDisconnect
    }
  }
}, 15000);


// Create a stylish toast notification
function showSamuraiToast(trackName) {
  const toast = document.createElement('div');
  toast.id = 'smt4-toast';
  const bodyText = trackName || "Oh, a Hunter...";
  toast.innerHTML = `
    <div class="toast-header">Amazon SMT Music Companion</div>
    <div class="toast-body">Now Playing: ${bodyText}</div>
  `;
  document.body.appendChild(toast);

  // Remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 1000);
  }, 4000);
}

// Only show toast once per session if enabled
chrome.storage.local.get(['enabled', 'track'], (data) => {
  const hasShownToast = sessionStorage.getItem('smt4_toast_shown');
  if (data.enabled && !hasShownToast) {
    let trackName = null;
    if (data.track) {
      const trackObj = CONFIG.TRACKS.find(t => getTrackUrl(t.filename) === data.track);
      if (trackObj) trackName = trackObj.name;
    }
    showSamuraiToast(trackName);
    sessionStorage.setItem('smt4_toast_shown', 'true');
  }
});