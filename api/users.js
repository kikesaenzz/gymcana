// ============================================================
// LISTA DE INVITADOS
// Devuelve los invitados registrados (lee gymkana-boda/registry/
// en Cloudinary) con su nombre original, fecha de registro y
// la clave normalizada. Se filtran por evento (?event=<slug>):
// los registros antiguos (sin etiqueta evento_*) pertenecen al
// evento por defecto.
// ============================================================

const DEFAULT_EVENT = process.env.DEFAULT_EVENT || 'boda';

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
    // El prefijo cubre tanto los registros antiguos (registry/<nombre>)
    // como los nuevos por evento (registry/<evento>/<nombre>)
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=gymkana-boda/registry/&max_results=500&context=true&tags=true`;
    const event = String((req.query && req.query.event) || '').trim();

    try {
        const response = await fetch(url, { headers: { 'Authorization': auth } });
        if (!response.ok) {
            const err = await response.text();
            return res.status(response.status).json({ error: err });
        }
        const data = await response.json();
        // Un mismo invitado puede tener marcador antiguo (registry/<nombre>)
        // y marcador por evento (registry/<evento>/<nombre>): se deduplica
        // por clave, conservando el registro más antiguo.
        const byKey = new Map();
        (data.resources || [])
            .filter(r => belongsToEvent(r.tags, event))
            .forEach(r => {
                const ctx = parseContext(r.context);
                const key = ctx.key || r.public_id.split('/').pop();
                const entry = {
                    name: ctx.user || key,
                    key: key,
                    registered: r.created_at || ''
                };
                const prev = byKey.get(key);
                if (!prev || String(entry.registered) < String(prev.registered)) byKey.set(key, entry);
            });
        const users = [...byKey.values()]
            .sort((a, b) => String(a.registered).localeCompare(String(b.registered)));

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
