/**
 * Universal Cloud Storage & Sync Engine for ymertturk.dev apps
 * Handles 24/7 cross-device data persistence between mobile, desktop & cloud.
 */

window.UniversalCloudSync = {
    // Save state to LocalStorage + Cloud Store API
    async saveState(appId, stateData) {
        const localStorageKey = `ymertturk_app_data_${appId}`;
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(stateData));
            
            // Try saving to backend API if active server running
            fetch('/api/sync-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId, data: stateData, timestamp: new Date().toISOString() })
            }).catch(e => {
                // Background sync silently
            });
        } catch (e) {
            console.warn(`[CloudSync] Local save failed for ${appId}`, e);
        }
    },

    // Load state from Cloud Store / LocalStorage
    async loadState(appId, fallbackData) {
        const localStorageKey = `ymertturk_app_data_${appId}`;
        
        // 1. Check local storage first
        let localData = null;
        const saved = localStorage.getItem(localStorageKey);
        if (saved) {
            try { localData = JSON.parse(saved); } catch(e) {}
        }

        // 2. Fetch remote cloud state if available
        try {
            const res = await fetch(`/api/sync-state?appId=${appId}`);
            if (res.ok) {
                const cloudPayload = await res.json();
                if (cloudPayload && cloudPayload.data) {
                    // Update local storage with fresh cloud state
                    localStorage.setItem(localStorageKey, JSON.stringify(cloudPayload.data));
                    return cloudPayload.data;
                }
            }
        } catch (e) {
            // Offline mode or static host fallback
        }

        return localData || fallbackData;
    }
};
