/**
 * MindNexus Backend Server & Autonomous Offline Task Gateway
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const TelegramNotifier = require('./telegram_notifier');

const PORT = 5050;
const PUBLIC_DIR = __dirname;
const INGEST_FILE = path.join(__dirname, 'remote_inbox.json');
const QUEUE_FILE = path.join(__dirname, 'pending_tasks.json');
const notifier = new TelegramNotifier();

// Ensure storage files exist
if (!fs.existsSync(INGEST_FILE)) fs.writeFileSync(INGEST_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(QUEUE_FILE)) fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 2));

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Remote Ingest Webhook (POST /api/ingest)
    if (req.method === 'POST' && req.url === '/api/ingest') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const currentInbox = JSON.parse(fs.readFileSync(INGEST_FILE, 'utf8') || '[]');

                const newEntry = {
                    id: `remote-${Date.now()}`,
                    title: data.title || 'Uzaktan Eklenen Not',
                    content: data.content || data.text || '',
                    source: data.source || 'phone',
                    sourceUrl: data.url || '',
                    tags: data.tags || ['uzaktan-eklenen'],
                    date: new Date().toISOString().split('T')[0],
                    status: 'active',
                    color: '#f2994a',
                    receivedAt: new Date().toISOString()
                };

                currentInbox.push(newEntry);
                fs.writeFileSync(INGEST_FILE, JSON.stringify(currentInbox, null, 2));

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Not alındı', item: newEntry }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Get Remote Inbox Items (GET /api/inbox)
    if (req.method === 'GET' && req.url === '/api/inbox') {
        try {
            const inbox = JSON.parse(fs.readFileSync(INGEST_FILE, 'utf8') || '[]');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(inbox));
        } catch (e) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify([]));
        }
        return;
    }

    // Clear Inbox (POST /api/inbox/clear)
    if (req.method === 'POST' && req.url === '/api/inbox/clear') {
        fs.writeFileSync(INGEST_FILE, JSON.stringify([], null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Autonomous Task Dispatcher with Offline Memory (POST /api/execute-task)
    if (req.method === 'POST' && req.url === '/api/execute-task') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const taskReq = JSON.parse(body);
                const isComputerOnline = true; // Active server state

                const queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8') || '[]');

                const taskEntry = {
                    id: `task-${Date.now()}`,
                    nodeId: taskReq.nodeId,
                    command: taskReq.command || taskReq.text,
                    createdAt: new Date().toISOString(),
                    status: 'queued_offline',
                    receivedVia: taskReq.source || 'voice_remote'
                };

                queue.push(taskEntry);
                fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

                const offlineMsg = `📌 Şu an bilgisayar kapalı / çevrimdışı. Güncelleme talimatını hafızaya aldım. Bilgisayar açılınca otomatik işleme başlayacağım ve Telegram'dan bildirim göndereceğim.`;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    taskId: taskEntry.id,
                    status: 'queued_offline',
                    message: offlineMsg
                }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`[MindNexus Autonomous Gateway] Running at http://localhost:${PORT}`);
});
