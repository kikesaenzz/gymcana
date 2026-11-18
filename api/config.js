const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

    const event = String((req.query && req.query.event) || '').trim();
    if (!event) return res.status(400).json({ error: 'event required' });

    try {
        const config = await redis.get(`event:${event}`);
        if (!config) return res.status(404).json({ error: 'event not found' });
        // Strip admin-only fields before returning to public
        const { clientKey: _k, adminNotes: _n, ...publicConfig } = config;
        return res.status(200).json(publicConfig);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
