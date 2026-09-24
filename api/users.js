// ============================================================
// LISTA DE INVITADOS
// Devuelve los invitados registrados (lee gymkana-boda/registry/
// en Cloudinary) con su nombre original, fecha de registro y
// la clave normalizada.
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
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=gymkana-boda/registry/&max_results=500&context=true`;

    try {
        const response = await fetch(url, { headers: { 'Authorization': auth } });
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }
        const data = await response.json();
        const users = (data.resources || []).map(r => {
            const ctx = parseContext(r.context);
            const key = r.public_id.split('/').pop();
            return {
                name: ctx.user || key,
                key: ctx.key || key,
                registered: r.created_at || ''
            };
        }).sort((a, b) => String(a.registered).localeCompare(String(b.registered)));

        return res.status(200).json(users);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

// El contexto puede venir como objeto o como "clave=valor|clave=valor"
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
