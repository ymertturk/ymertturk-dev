/**
 * MindNexus Telegram Notification Dispatcher
 * Sends instant notifications to user's Telegram when offline tasks are completed upon Mac boot.
 */

const https = require('https');

class TelegramNotifier {
    constructor(botToken = '', chatId = '') {
        // Can be set via environment variables or UI configuration
        this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || 'DEMO_BOT_TOKEN';
        this.chatId = chatId || process.env.TELEGRAM_CHAT_ID || 'DEMO_CHAT_ID';
    }

    sendNotification(message) {
        return new Promise((resolve, reject) => {
            console.log(`[Telegram Notifier Log]: ${message}`);

            if (this.botToken === 'DEMO_BOT_TOKEN') {
                console.log(`[Telegram Simulation]: Message logged to queue. (Configure your Telegram Bot Token & Chat ID in MindNexus Settings to receive live push notifications).`);
                resolve({ success: true, simulated: true });
                return;
            }

            const data = JSON.stringify({
                chat_id: this.chatId,
                text: message,
                parse_mode: 'HTML'
            });

            const options = {
                hostname: 'api.telegram.org',
                port: 443,
                path: `/bot${this.botToken}/sendMessage`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length
                }
            };

            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', chunk => responseBody += chunk);
                res.on('end', () => {
                    resolve({ success: true, body: responseBody });
                });
            });

            req.on('error', (e) => {
                console.error("Telegram notify error:", e.message);
                resolve({ success: false, error: e.message });
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = TelegramNotifier;
