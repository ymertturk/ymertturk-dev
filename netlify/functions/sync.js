// Netlify Serverless Cloud Persistence Engine for ymertturk.dev (ES Module)
let inMemoryStore = {};

export async function handler(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const appId = (event.queryStringParameters && event.queryStringParameters.appId) || 'fba_tracker';

  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body);
      if (payload && payload.data) {
        inMemoryStore[appId] = {
          data: payload.data,
          updatedAt: new Date().toISOString()
        };
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, appId, updatedAt: inMemoryStore[appId].updatedAt })
        };
      }
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  if (event.httpMethod === 'GET') {
    const record = inMemoryStore[appId] || null;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        appId,
        data: record ? record.data : null,
        updatedAt: record ? record.updatedAt : null
      })
    };
  }

  return { statusCode: 405, headers, body: 'Method Not Allowed' };
}
