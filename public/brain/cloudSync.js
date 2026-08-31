/**
 * Universal Live Cloud Storage & Auto-Sync Engine for ymertturk.dev
 * Real-time 24/7 cross-device state synchronization across all browsers and mobile devices.
 */

window.UniversalCloudSync = {
    appId: 'mindnexus',
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
                    
                    const localStorageKey = `ymertturk_app_data_${this.appId}`;
                    localStorage.setItem(localStorageKey, JSON.stringify(payload.data));

                    if (this.onCloudDataReceived) {
                        this.onCloudDataReceived(payload.data, isSilent);
                    }
                }
            }
        } catch (e) {}
    },

    async saveState(appId, stateData) {
        this.appId = appId || this.appId;
        const localStorageKey = `ymertturk_app_data_${this.appId}`;

        try {
            localStorage.setItem(localStorageKey, JSON.stringify(stateData));
        } catch(e) {}

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
        } catch (e) {}
    }
};
