// Vercel Serverless Cloud Persistence Engine for ymertturk.dev
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const TMP_FILE = path.join('/tmp', 'ymertturk_cloud_sync_master.json');

function loadMemoryStore() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const content = fs.readFileSync(TMP_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {}
  return {};
}

function saveMemoryStore(store) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(store), 'utf-8');
  } catch (e) {}
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const appId = req.query.appId || 'tedarikci';
  let memoryStore = loadMemoryStore();

  if (req.method === 'POST') {
    const payload = req.body;
    if (payload && payload.data) {
      memoryStore[appId] = {
        data: payload.data,
        updatedAt: new Date().toISOString(),
      };
      saveMemoryStore(memoryStore);
      return res.status(200).json({ success: true, appId, updatedAt: memoryStore[appId].updatedAt });
    }
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (req.method === 'GET') {
    const record = memoryStore[appId] || null;
    return res.status(200).json({
      appId,
      data: record ? record.data : null,
      updatedAt: record ? record.updatedAt : null,
    });
  }

  return res.status(405).send('Method Not Allowed');
}
