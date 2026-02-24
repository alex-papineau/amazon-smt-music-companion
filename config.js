const CONFIG = {
    BASE_URL: 'https://alex-papineau.github.io/amazon-smt-music-companion/music/',
    TRACKS: [
        {
            id: 'smt4_black_market',
            name: 'SMT IV: Black Market',
            filename: 'smt4_black_market.webm'
        },
        {
            id: 'p1_black_market',
            name: 'Persona 1: Black Market',
            filename: 'p1_black_market.webm'
        },
        {
            id: 'smt3_junk_shop',
            name: 'SMT III: Junk Shop',
            filename: 'smt3_junk_shop.mp3'
        },
        {
            id: 'p3_tanaka',
            name: "P3: Tanaka's Amazing Commodities",
            filename: 'p3_tanakas_amazing_commodities.mp3'
        }
    ],
    DEFAULT_TRACK_INDEX: 0
};

// Helper to get full URL for a track
function getTrackUrl(trackFilename) {
    if (!trackFilename) return '';
    if (trackFilename.startsWith('http://') || trackFilename.startsWith('https://')) {
        return trackFilename;
    }
    return CONFIG.BASE_URL + trackFilename;
}

// Get default track URL
function getDefaultTrackUrl() {
    return getTrackUrl(CONFIG.TRACKS[CONFIG.DEFAULT_TRACK_INDEX].filename);
}

// Pick a random track from the list
function getRandomTrackUrl() {
    const randomIndex = Math.floor(Math.random() * CONFIG.TRACKS.length);
    return getTrackUrl(CONFIG.TRACKS[randomIndex].filename);
}
