// Vercel Serverless Cloud Persistence Engine for ymertturk.dev
let memoryStore = {};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const appId = req.query.appId || 'fba_tracker';

  if (req.method === 'POST') {
    const payload = req.body;
    if (payload && payload.data) {
      memoryStore[appId] = {
        data: payload.data,
        updatedAt: new Date().toISOString()
      };
      return res.status(200).json({ success: true, appId, updatedAt: memoryStore[appId].updatedAt });
    }
    return res.status(400).json({ error: 'Invalid payload' });
  }

  if (req.method === 'GET') {
    const record = memoryStore[appId] || null;
    return res.status(200).json({
      appId,
      data: record ? record.data : null,
      updatedAt: record ? record.updatedAt : null
    });
  }

  return res.status(405).send('Method Not Allowed');
}
