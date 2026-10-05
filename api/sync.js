const DEFAULT_EVENT = process.env.DEFAULT_EVENT || 'boda';

// Los recursos sin etiqueta evento_* pertenecen al evento por defecto
function belongsToEvent(tags, want) {
    const event = want || DEFAULT_EVENT;
    const list = Array.isArray(tags) ? tags : [];
    const own = list.find(t => String(t).indexOf('evento_') === 0);
    return own ? String(own).slice(7) === event : DEFAULT_EVENT === event;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { username, event } = req.query;
    if (!username) {
        return res.status(400).json({ error: 'username required' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({ error: 'Cloudinary credentials not configured' });
    }

    try {
        const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
        // tags=true y context=true son necesarios para saber a qué
        // evento pertenece cada foto
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/tags/${encodeURIComponent(username)}?max_results=100&tags=true&context=true`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }

        const data = await response.json();
        const wanted = String(event || '').trim();
        const resources = (data.resources || []).filter(r => belongsToEvent(r.tags, wanted));
        return res.status(200).json(Object.assign({}, data, { resources }));
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};
