// ============================================================
// GALERIA GLOBAL
// Devuelve todas las fotos subidas (etiqueta "gymkana") con:
//  - url / thumb  (imagen original y miniatura)
//  - user         (quien la subio, nombre original)
//  - reto         (numero de reto)
// El registro (1x1) NO lleva la etiqueta "gymkana", asi que
// no aparece aqui.
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'method not allowed' });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({ error: 'Cloudinary credentials not configured' });
    }

    const auth = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/tags/gymkana?max_results=500&context=true&tags=true`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': auth } });
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }
        const data = await response.json();

        const photos = (data.resources || []).map(r => {
            const ctx = parseContext(r.context);
            const tags = r.tags || [];
            const retoTag = tags.find(t => /^reto_\d+$/.test(t));

            // Quien la subio: primero el contexto (nombre original);
            // si no, la etiqueta de usuario que no sea generica.
            let user = ctx.user;
            if (!user) {
                user = tags.find(t =>
                    t !== 'gymkana' && t !== 'boda' && t !== 'registro' && !/^reto_\d+$/.test(t)
                ) || '';
            }

            const reto = parseInt(
                (retoTag && retoTag.replace('reto_', '')) || ctx.challenge || '0',
                10
            ) || 0;

            const secure = r.secure_url || '';
            return {
                url: secure,
                thumb: secure.replace('/upload/', '/upload/w_600/'),
                user,
                reto,
                fileName: r.display_name || '',
                createdAt: r.created_at || ''
            };
        });

        return res.status(200).json(photos);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

function parseContext(ctx) {
    if (!ctx) return {};
    if (typeof ctx === 'object') return ctx;
    const out = {};
    String(ctx).split('|').forEach(part => {
        const i = part.indexOf('=');
        if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    });
    return out;
}
