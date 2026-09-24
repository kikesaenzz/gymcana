// ============================================================
// REGISTRO DE INVITADOS
// Crea un marcador por invitado en Cloudinary (una imagen de
// 1x1 en gymkana-boda/registry/<nombre-normalizado>).
// Un archivo por invitado = sin colisiones aunque dos personas
// se registren a la vez. El nombre normalizado (minúsculas y
// sin acentos) hace que "Ana", "ana" y "ANA" sean el mismo
// invitado.
// ============================================================

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method not allowed' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
    }
    const name = String((body && body.name) || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 60) {
        return res.status(400).json({ error: 'nombre no valido' });
    }
    const key = normalize(name);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        return res.status(500).json({ error: 'Cloudinary credentials not configured' });
    }

    const auth = 'Basic ' + Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    // Pixel de 1x1 transparente (PNG valido)
    const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
    );

    const form = new FormData();
    form.append('file', new Blob([pixel], { type: 'image/png' }), 'registro.png');
    form.append('public_id', `gymkana-boda/registry/${key}`);
    form.append('overwrite', 'false');
    form.append('tags', 'registro,boda');
    form.append('context', `user=${name}|key=${key}`);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            headers: { 'Authorization': auth },
            body: form
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            return res.status(200).json({ ok: true, key });
        }
        // Ya estaba registrado (public_id existente con overwrite=false)
        if (response.status === 409) {
            return res.status(200).json({ ok: true, already: true, key });
        }
        return res.status(500).json({ error: (data.error && data.error.message) || 'Error registrando' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

function normalize(s) {
    return String(s).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
