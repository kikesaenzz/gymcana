const { Redis } = require('@upstash/redis');
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

const ADMIN_KEY = process.env.ADMIN_KEY || '';

function auth(req) {
    const header = (req.headers && req.headers.authorization) || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const query = String((req.query && req.query.adminKey) || '');
    return ADMIN_KEY && (bearer === ADMIN_KEY || query === ADMIN_KEY);
}

function slugify(s) {
    return String(s || '').trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

function randomKey(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < len; i++) key += chars[Math.floor(Math.random() * chars.length)];
    return key;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (!auth(req)) return res.status(401).json({ error: 'unauthorized' });

    const action = String((req.query && req.query.action) || '').trim();

    try {
        // LIST events
        if (req.method === 'GET' && action === 'list') {
            const slugs = (await redis.smembers('events')) || [];
            const events = await Promise.all(
                slugs.map(async slug => {
                    const e = await redis.get(`event:${slug}`);
                    if (!e) return null;
                    return { slug: e.slug, names: e.names, date: e.date, published: e.published, createdAt: e.createdAt };
                })
            );
            return res.status(200).json(events.filter(Boolean));
        }

        // GET single event (full config including clientKey)
        if (req.method === 'GET' && action === 'get') {
            const event = String((req.query && req.query.event) || '').trim();
            if (!event) return res.status(400).json({ error: 'event required' });
            const config = await redis.get(`event:${event}`);
            if (!config) return res.status(404).json({ error: 'not found' });
            return res.status(200).json(config);
        }

        // CREATE event
        if (req.method === 'POST') {
            let body = req.body;
            if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }

            const names = String((body && body.names) || '').trim();
            const date = String((body && body.date) || '').trim();
            const rawSlug = (body && body.slug) || names;
            const slug = slugify(rawSlug);

            if (!slug) return res.status(400).json({ error: 'names or slug required' });

            const existing = await redis.get(`event:${slug}`);
            if (existing) return res.status(409).json({ error: 'slug ya existe' });

            const config = {
                slug,
                names: names || slug,
                date,
                welcomeMessage: '',
                accentColor: '#f2a4ba',
                bgPreset: 'fondo2',
                bgImage: null,
                fontHeading: 'Bodoni Moda',
                logo: null,
                challenges: DEFAULT_CHALLENGES,
                clientKey: randomKey(12),
                createdAt: new Date().toISOString(),
                published: false,
                adminNotes: String((body && body.adminNotes) || ''),
            };

            await redis.set(`event:${slug}`, config);
            await redis.sadd('events', slug);
            return res.status(201).json(config);
        }

        // UPDATE event (full replace of updatable fields)
        if (req.method === 'PUT') {
            let body = req.body;
            if (typeof body === 'string') try { body = JSON.parse(body); } catch (e) { body = {}; }

            const slug = String((body && body.slug) || '').trim();
            if (!slug) return res.status(400).json({ error: 'slug required' });

            const existing = await redis.get(`event:${slug}`);
            if (!existing) return res.status(404).json({ error: 'not found' });

            // Preserve immutable fields: slug, clientKey, createdAt
            const { slug: _s, clientKey: _k, createdAt: _c, ...updates } = body;
            const updated = {
                ...existing,
                ...updates,
                slug,
                clientKey: existing.clientKey,
                createdAt: existing.createdAt,
            };

            await redis.set(`event:${slug}`, updated);
            return res.status(200).json(updated);
        }

        // DELETE event
        if (req.method === 'DELETE') {
            const event = String((req.query && req.query.event) || '').trim();
            if (!event) return res.status(400).json({ error: 'event required' });

            await redis.del(`event:${event}`);
            await redis.srem('events', event);
            return res.status(200).json({ ok: true });
        }

        return res.status(400).json({ error: 'unknown action or method' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};

const DEFAULT_CHALLENGES = [
    { id: 1,  emoji: '👔', title: 'Con alguien de traje',       description: 'Foto con alguien que vaya de traje.', tips: ['Busca a los padrinos o al novio', 'Los hombres suelen ir de traje'] },
    { id: 2,  emoji: '💐', title: 'Flores y decoración',        description: 'Una foto de las flores o la decoración.', tips: ['El ramo o el arreglo floral estrella', 'Busca un buen fondo'] },
    { id: 3,  emoji: '🗺️', title: 'De otra ciudad',             description: 'Foto con alguien que venga de otra ciudad.', tips: ['Pregunta de dónde son', 'Los invitados de lejos siempre posan bien'] },
    { id: 4,  emoji: '🔵', title: 'Alguien de azul',            description: 'Foto con alguien que vaya de azul.', tips: ['Camisas, vestidos o corbatas azules', 'Pide permiso antes de la foto'] },
    { id: 5,  emoji: '📏', title: 'Más alto que tú',            description: 'Foto con alguien más alto que tú.', tips: ['Poneos de pie, espalda con espalda', 'Que se vea la diferencia'] },
    { id: 6,  emoji: '📐', title: 'Más bajo que tú',            description: 'Foto con alguien más bajo que tú.', tips: ['Aprovecha para hacer la foto graciosa', 'Pide la foto a un tercero'] },
    { id: 7,  emoji: '🥂', title: 'Un brindis',                 description: 'Una foto de un brindis.', tips: ['Espera al brindis oficial', 'Brinda con las copas llenas'] },
    { id: 8,  emoji: '🍽️', title: 'La comida',                  description: 'Una foto de la comida.', tips: ['Saca la foto antes de probar', 'El bufé siempre queda bien'] },
    { id: 9,  emoji: '🎂', title: 'La tarta',                   description: 'Una foto de la tarta.', tips: ['Ve antes de que la corten', 'El corte de la tarta es foto obligada'] },
    { id: 10, emoji: '💑', title: 'Foto con los novios',        description: 'Consigue una foto junto a la pareja.', tips: ['Pide a alguien que os haga la foto', 'Busca un buen fondo'] },
    { id: 11, emoji: '💃', title: 'Bailando',                   description: 'Una foto bailando en la pista.', tips: ['Saca la foto en plena canción', 'Que se vea el movimiento'] },
    { id: 12, emoji: '🎈', title: 'Mismo mes que tú',           description: 'Foto con alguien que haya nacido el mismo mes que tú.', tips: ['Pregunta por el cumpleaños', 'La peña del mes siempre sale bien'] },
    { id: 13, emoji: '🎧', title: 'El momento del DJ',          description: 'Una foto del momento del DJ.', tips: ['Acércate al área de música', 'Espera entre canciones'] },
    { id: 14, emoji: '🌙', title: 'Foto por la noche',          description: 'Una foto por la noche.', tips: ['Usa el modo nocturno del móvil', 'Las luces de la fiesta ayudan'] },
];
