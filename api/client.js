const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

const ALLOWED_FIELDS = ['names', 'date', 'welcomeMessage', 'accentColor', 'bgPreset', 'bgImage', 'fontHeading', 'logo', 'challenges', 'published'];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const event = String((req.query && req.query.event) || '').trim();
    const key   = String((req.query && req.query.key)   || '').trim();

    if (!event || !key) return res.status(400).json({ error: 'event and key required' });

    try {
        const config = await redis.get(`event:${event}`);
        if (!config) return res.status(404).json({ error: 'event not found' });
        if (config.clientKey !== key) return res.status(401).json({ error: 'invalid key' });

        if (req.method === 'GET') {
            return res.status(200).json(config);
        }

        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }

            const updates = {};
            ALLOWED_FIELDS.forEach(f => { if (body && body[f] !== undefined) updates[f] = body[f]; });

            const updated = { ...config, ...updates };
            await redis.set(`event:${event}`, updated);
            return res.status(200).json(updated);
        }

        return res.status(405).json({ error: 'method not allowed' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
