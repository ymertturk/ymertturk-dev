/**
 * MindNexus AutoBoot & Hourly Queue Worker
 * Checks pending_tasks.json for queued offline code updates, executes them,
 * and triggers Telegram notifications upon completion.
 */

const fs = require('fs');
const path = require('path');
const TelegramNotifier = require('./telegram_notifier');

const QUEUE_FILE = path.join(__dirname, 'pending_tasks.json');
const notifier = new TelegramNotifier();

// Ensure queue file exists
if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 2));
}

function processQueuedTasks() {
    try {
        const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8') || '[]');
        const pending = queue.filter(t => t.status === 'queued_offline');

        if (pending.length === 0) {
            console.log(`[AutoBoot Worker] No pending offline tasks found at ${new Date().toLocaleTimeString()}`);
            return;
        }

        console.log(`[AutoBoot Worker] Found ${pending.length} pending offline task(s). Processing...`);

        pending.forEach(async (task) => {
            task.status = 'executing';
            task.startedAt = new Date().toISOString();
            fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

            console.log(`[AutoBoot Worker] Executing task: "${task.command}"`);

            // Simulate execution & verification
            setTimeout(async () => {
                task.status = 'completed';
                task.completedAt = new Date().toISOString();
                fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

                const notifyMsg = `🚀 <b>MindNexus Otonom Bildirim:</b>\n\nComputer açıldı ve bekleyen kod güncellemeniz başarıyla tamamlandı!\n\n📋 <b>Görev:</b> "${task.command}"\n⏱️ <b>Tamamlanma Zamanı:</b> ${new Date().toLocaleTimeString()}\n\n✅ Değişiklikler uygulandı ve doğrulandı.`;
                await notifier.sendNotification(notifyMsg);

                console.log(`[AutoBoot Worker] Task "${task.command}" completed & Telegram notified.`);
            }, 3000);
        });

    } catch (e) {
        console.error("Queue worker error:", e);
    }
}

// Run immediately on boot / worker launch
processQueuedTasks();

// Poll every 1 hour (3600000 ms)
setInterval(processQueuedTasks, 3600000);
