// Serverless Cloud Save API for Vercel
// Supports Vercel KV / Upstash Redis, or memory/external stores

export default async function handler(req, res) {
  // Enable CORS so GitHub Pages (itzxme741.github.io) can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const KV_URL = process.env.KV_REST_API_URL;
  const KV_TOKEN = process.env.KV_REST_API_TOKEN;

  // Fallback to Upstash Redis if configured
  const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || KV_URL;
  const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || KV_TOKEN;

  if (req.method === 'POST') {
    try {
      const { user, pass, data } = req.body || {};
      if (!user || !pass || !data) {
        return res.status(400).json({ error: 'Thiếu thông tin user, pass hoặc data' });
      }

      // Hash key for safety
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(`${user.trim().toLowerCase()}::${pass.trim()}`).digest('hex');
      const key = `phongnam:save:${hash}`;

      if (UPSTASH_URL && UPSTASH_TOKEN) {
        // Save to Upstash/Vercel KV
        const payload = JSON.stringify({
          user: String(user).slice(0, 20),
          savedAt: Date.now(),
          day: data.day || 1,
          season: data.season || 0,
          year: data.year || 1,
          gold: data.gold || 0,
          json: JSON.stringify(data)
        });

        const kvRes = await fetch(`${UPSTASH_URL}/set/${key}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          body: payload
        });
        const kvData = await kvRes.json();
        return res.status(200).json({ success: true, savedAt: Date.now(), kv: kvData });
      } else {
        return res.status(503).json({
          error: 'Vercel KV chưa được kích hoạt. Hãy bật Vercel KV trong tab Storage của Vercel (miễn phí) hoặc dùng Firebase.'
        });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { user, pass } = req.query || {};
      if (!user || !pass) {
        return res.status(400).json({ error: 'Thiếu user hoặc pass' });
      }

      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256').update(`${user.trim().toLowerCase()}::${pass.trim()}`).digest('hex');
      const key = `phongnam:save:${hash}`;

      if (UPSTASH_URL && UPSTASH_TOKEN) {
        const kvRes = await fetch(`${UPSTASH_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        const kvData = await kvRes.json();
        if (!kvData || !kvData.result) {
          return res.status(404).json({ error: 'Không tìm thấy nông trại với tên và mật khẩu này' });
        }
        const parsed = typeof kvData.result === 'string' ? JSON.parse(kvData.result) : kvData.result;
        return res.status(200).json(parsed);
      } else {
        return res.status(503).json({
          error: 'Vercel KV chưa được kích hoạt.'
        });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
