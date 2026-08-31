/**
 * Universal Live Cloud Storage & Auto-Sync Engine for ymertturk.dev
 * Real-time 24/7 cross-device state synchronization across all browsers and mobile devices.
 */

window.UniversalCloudSync = {
    appId: 'fba_tracker',
    lastSyncTime: null,

    init(appId, onCloudDataReceived) {
        this.appId = appId;
        this.onCloudDataReceived = onCloudDataReceived;

        // 1. Initial live fetch on load
        this.fetchCloudState();

        // 2. Poll cloud server every 10 seconds for live updates from other devices
        setInterval(() => {
            this.fetchCloudState(true);
        }, 10000);
    },

    async fetchCloudState(isSilent = false) {
        try {
            const res = await fetch(`/.netlify/functions/sync?appId=${this.appId}`);
            if (res.ok) {
                const payload = await res.json();
                if (payload && payload.data && payload.updatedAt !== this.lastSyncTime) {
                    this.lastSyncTime = payload.updatedAt;
                    
                    // Update LocalStorage
                    const localStorageKey = `ymertturk_app_data_${this.appId}`;
                    localStorage.setItem(localStorageKey, JSON.stringify(payload.data));

                    if (this.onCloudDataReceived) {
                        this.onCloudDataReceived(payload.data, isSilent);
                    }
                }
            }
        } catch (e) {
            // Silence network errors
        }
    },

    async saveState(appId, stateData) {
        this.appId = appId || this.appId;
        const localStorageKey = `ymertturk_app_data_${this.appId}`;

        // 1. Save local
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(stateData));
        } catch(e) {}

        // 2. Push to live serverless Cloud Storage endpoint
        try {
            const res = await fetch(`/.netlify/functions/sync?appId=${this.appId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId: this.appId, data: stateData })
            });
            if (res.ok) {
                const payload = await res.json();
                this.lastSyncTime = payload.updatedAt;
            }
        } catch (e) {
            console.warn('[CloudSync] Serverless push failed', e);
        }
    }
};
