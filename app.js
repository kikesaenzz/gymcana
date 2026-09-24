// ============================================================
// GYMKANA FOTOGRÁFICA — APP LOGIC
// ============================================================

(function () {
    'use strict';

    const CHALLENGES = [
        { id: 1,  emoji: '👔', title: 'Con alguien de traje',       description: 'Foto con alguien que vaya de traje.', tips: ['Busca a los padrinos o al novio', 'Los hombres suelen ir de traje'], filename: 'Reto_01_Traje' },
        { id: 2,  emoji: '💐', title: 'Flores y decoración',        description: 'Una foto de las flores o la decoración de la boda.', tips: ['El ramo o el arreglo floral estrella', 'Busca un buen fondo'], filename: 'Reto_02_Flores' },
        { id: 3,  emoji: '🗺️', title: 'De fuera de Zaragoza',       description: 'Foto con alguien que no haya nacido en Zaragoza.', tips: ['Pregunta: ¿de dónde eres?', 'Los invitados de fuera siempre posan bien'], filename: 'Reto_03_Fuera_Zaragoza' },
        { id: 4,  emoji: '🔵', title: 'Alguien de azul',            description: 'Foto con alguien que vaya de azul.', tips: ['Camisas, vestidos o corbatas azules', 'Pide permiso antes de la foto'], filename: 'Reto_04_Azul' },
        { id: 5,  emoji: '📏', title: 'Más alto que tú',            description: 'Foto con alguien más alto que tú.', tips: ['Poneos de pie, espalda con espalda', 'Que se vea la diferencia'], filename: 'Reto_05_Mas_Alto' },
        { id: 6,  emoji: '📐', title: 'Más bajo que tú',            description: 'Foto con alguien más bajo que tú.', tips: ['Aprovecha para hacer la foto graciosa', 'Pide la foto a un tercero'], filename: 'Reto_06_Mas_Bajo' },
        { id: 7,  emoji: '🥂', title: 'Un brindis',                 description: 'Una foto de un brindis.', tips: ['Espera al brindis oficial', 'Brinda con las copas llenas'], filename: 'Reto_07_Brindis' },
        { id: 8,  emoji: '🍽️', title: 'La comida',                  description: 'Una foto de la comida.', tips: ['Saca la foto antes de probar', 'El bufé siempre queda bien'], filename: 'Reto_08_Comida' },
        { id: 9,  emoji: '🎂', title: 'La tarta',                   description: 'Una foto de la tarta.', tips: ['Ve antes de que la corten', 'El corte de la tarta es foto obligada'], filename: 'Reto_09_Tarta' },
        { id: 10, emoji: '💑', title: 'Foto con los novios',        description: 'Consigue una foto junto a la pareja.', tips: ['Pide a alguien que os haga la foto', 'Busca un buen fondo'], filename: 'Reto_10_Novios' },
        { id: 11, emoji: '💃', title: 'Bailando',                   description: 'Una foto bailando en la pista.', tips: ['Saca la foto en plena canción', 'Que se vea el movimiento'], filename: 'Reto_11_Bailando' },
        { id: 12, emoji: '🎈', title: 'Mismo mes que tú',           description: 'Foto con alguien que haya nacido el mismo mes que tú.', tips: ['Pregunta por el cumpleaños', 'La peña del mes siempre sale bien'], filename: 'Reto_12_Mismo_Mes' },
        { id: 13, emoji: '🎧', title: 'El momento del DJ',          description: 'Una foto del momento del DJ.', tips: ['Acércate al área de música', 'Espera entre canciones'], filename: 'Reto_13_DJ' },
        { id: 14, emoji: '🌙', title: 'Foto por la noche',          description: 'Una foto por la noche.', tips: ['Usa el modo nocturno del móvil', 'Las luces de la fiesta ayudan'], filename: 'Reto_14_Noche' }
    ];

    const STORAGE_PREFIX = 'gymkana_boda_';
    let state = {
        username: null,
        completedChallenges: [],
        photos: {},
        currentChallengeId: null
    };

    const $ = (sel) => document.querySelector(sel);

    const screens = {
        welcome: $('#screen-welcome'),
        challenges: $('#screen-challenges'),
        detail: $('#screen-detail'),
        complete: $('#screen-complete')
    };

    // Normaliza el nombre: minúsculas y sin acentos. Se usa para
    // carpetas, etiquetas, sincronización y localStorage, de modo
    // que "Ana", "ana" y "ANA" sean el mismo invitado. En pantalla
    // siempre se muestra el nombre original.
    function normalizeName(name) {
        return String(name || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');
    }

    function storageKey() {
        return STORAGE_PREFIX + normalizeName(state.username);
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ── INIT ─────────────────────────────────────────────
    function init() {
        bindEvents();
    }

    // ── PERSISTENCE ──────────────────────────────────────────
    function loadState() {
        try {
            if (state.username) {
                const key = storageKey();
                let saved = localStorage.getItem(key);
                if (!saved) {
                    // Migración: antes se guardaba con el nombre tal cual
                    const legacyKey = STORAGE_PREFIX + state.username;
                    saved = localStorage.getItem(legacyKey);
                    if (saved) {
                        localStorage.setItem(key, saved);
                        localStorage.removeItem(legacyKey);
                    }
                }
                if (saved) state = { ...state, ...JSON.parse(saved) };
            }
        } catch (e) {}
    }

    function saveState() {
        try {
            if (state.username) {
                localStorage.setItem(storageKey(), JSON.stringify({
                    username: state.username,
                    completedChallenges: state.completedChallenges,
                    photos: state.photos
                }));
            }
        } catch (e) {}
    }

    async function syncFromCloud() {
        if (!state.username) return;
        try {
            // Se busca con el nombre normalizado y, por si acaso, con el
            // nombre original (fotos subidas antes de normalizar).
            const keys = [...new Set([normalizeName(state.username), state.username])].filter(Boolean);
            const responses = await Promise.all(keys.map(k =>
                fetch(`/api/sync?username=${encodeURIComponent(k)}`)
                    .then(r => (r.ok ? r.json() : { resources: [] }))
                    .catch(() => ({ resources: [] }))
            ));
            const resources = responses.flatMap(r => r.resources || []);
            if (resources.length === 0) return;

            const seen = new Set();
            resources.forEach(r => {
                if (!r.public_id || seen.has(r.public_id)) return;
                seen.add(r.public_id);
                const tags = r.tags || [];
                let challengeId = null;

                for (const tag of tags) {
                    const match = tag.match(/^reto_(\d+)$/);
                    if (match) {
                        challengeId = parseInt(match[1], 10);
                        break;
                    }
                }

                if (challengeId && !state.completedChallenges.includes(challengeId)) {
                    state.completedChallenges.push(challengeId);
                    state.photos[challengeId] = { url: r.secure_url, fileName: r.display_name || r.public_id };
                }
            });

            state.completedChallenges.sort((a, b) => a - b);
            saveState();
        } catch (e) {
            console.warn('Sync from cloud failed:', e);
        }
    }

    // ── REGISTRO DE INVITADOS ────────────────────────────────
    function registerUser(name) {
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        }).catch(() => {});
    }

    // ── NAVIGATION ───────────────────────────────────────────
    function navigateTo(name) {
        const current = document.querySelector('.screen.active');
        const next = screens[name];
        if (!next || current === next) return;
        if (current) {
            current.classList.remove('active');
        }
        next.classList.add('active');
    }

    // ── EVENTS ───────────────────────────────────────────────
    function bindEvents() {
        const usernameInput = $('#username-input');
        const btnStart = $('#btn-start');

        usernameInput.addEventListener('input', () => {
            btnStart.disabled = usernameInput.value.trim().length < 2;
        });

        // Primera vez: pista sobre cómo debe ser el nombre
        usernameInput.addEventListener('focus', () => {
            try {
                if (!localStorage.getItem('gymkana_boda_hint_seen')) {
                    showToast('Pon un nombre identificativo: con él se reconocerán tus fotos 😊', 4500);
                    localStorage.setItem('gymkana_boda_hint_seen', '1');
                }
            } catch (e) {}
        });

        btnStart.addEventListener('click', async () => {
            const name = usernameInput.value.trim();
            if (name.length < 2) return;
            const key = normalizeName(name);

            // ¿Ese nombre ya está en uso? Preguntamos si de verdad es
            // la misma persona antes de continuar.
            try {
                const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/gallery')]);
                const users = uRes.ok ? await uRes.json() : [];
                const photos = gRes.ok ? await gRes.json() : [];
                const taken = new Set();
                (Array.isArray(users) ? users : []).forEach(u => { if (u && u.name) taken.add(normalizeName(u.name)); });
                (Array.isArray(photos) ? photos : []).forEach(p => { if (p && p.user) taken.add(normalizeName(p.user)); });

                if (taken.has(key)) {
                    const ok = confirm(
                        '⚠️ El nombre «' + name + '» ya está en la lista de invitados.\n\n' +
                        '¿Seguro que eres tú?\n\n' +
                        '• Aceptar → es tu nombre y vuelves a entrar (seguirás donde lo dejaste).\n' +
                        '• Cancelar → no eres tú: usa otro nombre identificativo.'
                    );
                    if (!ok) { usernameInput.focus(); return; }
                }
            } catch (e) { /* sin comprobación disponible: no bloqueamos */ }

            state.username = name;
            loadState();
            state.username = name;
            registerUser(name);
            await syncFromCloud();
            saveState();
            // Si ya tiene todos los retos hechos, directamente a la pantalla final
            if (state.completedChallenges.length >= CHALLENGES.length) {
                showCompleteScreen();
                return;
            }
            renderCarousel();
            navigateTo('challenges');
        });

        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnStart.click();
        });

        $('#btn-logout').addEventListener('click', () => {
            saveState();
            state.username = null;
            navigateTo('welcome');
            showToast('Tu progreso se ha guardado');
        });

        $('#btn-back').addEventListener('click', () => {
            renderCarousel();
            navigateTo('challenges');
        });

        const uploadArea = $('#upload-area');
        const fileInputGallery = $('#file-input-gallery');
        const fileInputCamera = $('#file-input-camera');
        const modal = $('#photo-source-modal');

        uploadArea.addEventListener('click', () => {
            modal.classList.add('active');
        });

        $('#modal-btn-camera').addEventListener('click', () => {
            modal.classList.remove('active');
            fileInputCamera.click();
        });

        $('#modal-btn-gallery').addEventListener('click', () => {
            modal.classList.remove('active');
            fileInputGallery.click();
        });

        $('#modal-btn-cancel').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        $('.modal-backdrop').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        fileInputGallery.addEventListener('change', handleFileSelect);
        fileInputCamera.addEventListener('change', handleFileSelect);

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                fileInputGallery.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });

        $('#btn-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            resetUpload();
        });

        $('#btn-submit').addEventListener('click', submitPhoto);

        $('#btn-restart').addEventListener('click', () => {
            selectedPhotos.clear();
            isSelectMode = false;
            updateSelectLabel();
            navigateTo('challenges');
            renderCarousel();
        });

        $('#btn-download-all').addEventListener('click', () => {
            const allIds = CHALLENGES.filter(c => state.photos[c.id]).map(c => c.id);
            downloadPhotos(allIds);
        });

        // Selección: la primera vez entra en modo selección; si ya lo
        // está y hay fotos elegidas, las descarga.
        $('#btn-select-download').addEventListener('click', () => {
            if (!isSelectMode) {
                toggleSelectMode();
                return;
            }
            if (selectedPhotos.size === 0) {
                showToast('Toca primero las fotos que quieras descargar');
                return;
            }
            const ids = [...selectedPhotos];
            toggleSelectMode();
            downloadPhotos(ids);
        });

        // Galería de la fiesta, lightbox y clasificación
        $('#btn-refresh-gallery').addEventListener('click', loadPartyGallery);
        $('#lightbox-close').addEventListener('click', closeLightbox);
        $('#photo-lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'photo-lightbox') closeLightbox();
        });
        $('#btn-leaderboard').addEventListener('click', openLeaderboard);
        $('#leaderboard-close').addEventListener('click', closeLeaderboard);
        $('#leaderboard-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'leaderboard-overlay') closeLeaderboard();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeLightbox(); closeLeaderboard(); }
        });

        // Carrusel: scroll y rueda, registrados UNA sola vez
        // (antes se añadían en cada render y los puntos no se movían
        // porque el cálculo usaba el contenedor equivocado)
        const track = $('#carousel-track');
        track.addEventListener('scroll', updateDots, { passive: true });
        track.addEventListener('wheel', function (e) {
            e.preventDefault();
            track.scrollLeft += e.deltaY * 2;
        }, { passive: false });
    }

    // ── RENDER CAROUSEL ──────────────────────────────────────
    function renderCarousel() {
        const track = $('#carousel-track');
        const dotsContainer = $('#carousel-dots');
        const completed = state.completedChallenges.length;
        const total = CHALLENGES.length;
        const nextChallenge = CHALLENGES.find(c => !state.completedChallenges.includes(c.id));

        // Header
        $('#header-avatar').textContent = state.username.charAt(0).toUpperCase();
        $('#header-name').textContent = state.username;
        $('#progress-fill').style.width = `${(completed / total) * 100}%`;
        $('#progress-text').textContent = `${completed} / ${total}`;

        // Cards
        track.innerHTML = CHALLENGES.map((challenge) => {
            const isCompleted = state.completedChallenges.includes(challenge.id);
            const isCurrent = nextChallenge && nextChallenge.id === challenge.id;
            const isLocked = !isCompleted && !isCurrent;

            let statusHTML = '';
            if (isCompleted) {
                statusHTML = '<span class="status-badge done">&#10003; Hecho</span>';
            } else if (isCurrent) {
                statusHTML = '<span class="status-badge active">&#9654; Ahora</span>';
            } else {
                statusHTML = '<span class="status-badge locked">&#128274;</span>';
            }

            return `
                <div class="carousel-card ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}"
                     data-id="${challenge.id}">
                    <div class="carousel-card-number">${challenge.id} / ${total}</div>
                    <div class="carousel-card-status">${statusHTML}</div>
                    <div class="carousel-card-emoji">${challenge.emoji}</div>
                    <div class="carousel-card-title">${challenge.title}</div>
                    <div class="carousel-card-desc">${challenge.description}</div>
                </div>
            `;
        }).join('');

        // Dots
        dotsContainer.innerHTML = CHALLENGES.map((_, i) =>
            `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></div>`
        ).join('');

        // Scroll to current card (el scroller es el track, no el wrapper)
        const currentCard = track.querySelector('.carousel-card.current');
        if (currentCard) {
            setTimeout(() => {
                const cardCenter = currentCard.offsetLeft + currentCard.offsetWidth / 2;
                track.scrollTo({
                    left: cardCenter - track.offsetWidth / 2,
                    behavior: 'smooth'
                });
                setTimeout(updateDots, 350);
            }, 100);
        }

        // Click on card centers it, then opens if current
        track.querySelectorAll('.carousel-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var id = parseInt(card.dataset.id);
                var challenge = CHALLENGES.find(function(c) { return c.id === id; });
                var isCompleted = state.completedChallenges.includes(id);
                var isCurrent = nextChallenge && nextChallenge.id === id;

                // Always center the card on click
                var cardCenter = card.offsetLeft + card.offsetWidth / 2;
                track.scrollTo({
                    left: cardCenter - track.offsetWidth / 2,
                    behavior: 'smooth'
                });

                if (isCompleted) {
                    showToast('Ya completaste este reto');
                    return;
                }
                if (!isCurrent) {
                    showToast('Completa los retos anteriores primero');
                    return;
                }
                openChallenge(challenge);
            });
        });

        updateDots();
    }

    // Marca como activo el punto de la tarjeta más cercana al centro.
    // Usa coordenadas visuales (getBoundingClientRect), así funciona
    // mientras el usuario desliza con el dedo, la rueda o los clics.
    function updateDots() {
        const track = $('#carousel-track');
        if (!track) return;
        const cards = track.querySelectorAll('.carousel-card');
        const dots = document.querySelectorAll('#carousel-dots .carousel-dot');
        if (!cards.length || dots.length !== cards.length) return;

        const trackRect = track.getBoundingClientRect();
        const center = trackRect.left + trackRect.width / 2;
        let closestIdx = 0;
        let closestDist = Infinity;

        cards.forEach((card, i) => {
            const r = card.getBoundingClientRect();
            const dist = Math.abs(r.left + r.width / 2 - center);
            if (dist < closestDist) {
                closestDist = dist;
                closestIdx = i;
            }
        });

        dots.forEach((d, i) => d.classList.toggle('active', i === closestIdx));
    }

    // ── OPEN CHALLENGE DETAIL ────────────────────────────────
    function openChallenge(challenge) {
        state.currentChallengeId = challenge.id;

        resetUpload();

        const current = document.querySelector('.screen.active');
        const detail = screens['detail'];

        if (current === detail) {
            detail.classList.remove('active');
            void detail.offsetHeight;
            detail.classList.add('active');
        } else {
            if (current) current.classList.remove('active');
            detail.classList.add('active');
        }

        $('#detail-header-title').textContent = challenge.title;
        $('#detail-number').textContent = `Reto ${challenge.id}`;
        $('#detail-emoji').textContent = challenge.emoji;
        $('#detail-title').textContent = challenge.title;
        $('#detail-description').textContent = challenge.description;

        const tipsContainer = $('#detail-tips');
        tipsContainer.innerHTML = challenge.tips.map(t =>
            `<span class="tip-tag">${t}</span>`
        ).join('');
    }

    // ── FILE HANDLING ────────────────────────────────────────
    let selectedFile = null;

    function handleFileSelect() {
        const file = $('#file-input-gallery').files[0] || $('#file-input-camera').files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('Solo se aceptan imágenes'); return; }
        if (file.size > 10 * 1024 * 1024) { showToast('La imagen es muy grande (máx. 10MB)'); return; }

        selectedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            $('#preview-img').src = e.target.result;
            $('#upload-placeholder').style.display = 'none';
            $('#upload-preview').style.display = 'block';
            $('#btn-submit').disabled = false;
        };
        reader.readAsDataURL(file);
        $('#photo-source-modal').classList.remove('active');
    }

    function resetUpload() {
        selectedFile = null;
        $('#file-input-gallery').value = '';
        $('#file-input-camera').value = '';
        $('#upload-placeholder').style.display = 'flex';
        $('#upload-preview').style.display = 'none';
        const btn = $('#btn-submit');
        btn.querySelector('.btn-text').style.display = '';
        btn.querySelector('.btn-loader').style.display = 'none';
        btn.disabled = true;
    }

    // ── UPLOAD TO CLOUDINARY ─────────────────────────────────
    async function uploadToCloudinary(file, challengeId) {
        const { cloudName, uploadPreset } = CLOUDINARY_CONFIG;
        const folderPath = `gymkana-boda/${normalizeName(state.username)}`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folderPath);
        formData.append('tags', `gymkana,boda,${normalizeName(state.username)},reto_${challengeId}`);
        formData.append('context', `user=${state.username}|challenge=${challengeId}`);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'Error subiendo la imagen');
        }
        return response.json();
    }

    function saveLocally(file, challengeId) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                state.photos[challengeId] = { url: reader.result, fileName: file.name, local: true };
                saveState();
                resolve({ secure_url: reader.result });
            };
            reader.readAsDataURL(file);
        });
    }

    // ── SUBMIT PHOTO ─────────────────────────────────────────
    async function submitPhoto() {
        if (!selectedFile || !state.currentChallengeId) return;
        const btn = $('#btn-submit');
        const challenge = CHALLENGES.find(c => c.id === state.currentChallengeId);

        btn.querySelector('.btn-text').style.display = 'none';
        btn.querySelector('.btn-loader').style.display = 'inline-flex';
        btn.disabled = true;

        try {
            let result;
            if (CLOUDINARY_CONFIG.cloudName !== 'TU_CLOUD_NAME') {
                result = await uploadToCloudinary(selectedFile, challenge.id);
            } else {
                result = await saveLocally(selectedFile, state.currentChallengeId);
                showToast('Foto guardada localmente (configura Cloudinary)', 3000);
            }

            state.completedChallenges.push(challenge.id);
            state.photos[challenge.id] = { url: result.secure_url, fileName: challenge.filename };
            saveState();

            showToast('Reto completado', 2000, 'success');

            if (state.completedChallenges.length === CHALLENGES.length) {
                setTimeout(() => showCompleteScreen(), 900);
            } else {
                const nextChallenge = CHALLENGES.find(c => !state.completedChallenges.includes(c.id));
                if (nextChallenge) {
                    // Transición suave: cambiamos el contenido en la misma
                    // pantalla (con su animación) en vez de saltar al carrusel
                    setTimeout(() => openChallenge(nextChallenge), 800);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast(`Error: ${error.message}`, 3000);
            btn.querySelector('.btn-text').style.display = '';
            btn.querySelector('.btn-loader').style.display = 'none';
            btn.disabled = false;
        }
    }

    // ── COMPLETE SCREEN ──────────────────────────────────────
    let selectedPhotos = new Set();
    let isSelectMode = false;

    function showCompleteScreen() {
        const total = CHALLENGES.length;
        const completed = state.completedChallenges.length;

        $('#complete-subtitle').textContent = `${state.username}, completaste todos los retos`;

        $('#complete-stats').innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${completed}</div>
                <div class="stat-label">Fotos</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${total}</div>
                <div class="stat-label">Retos</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">100%</div>
                <div class="stat-label">Completado</div>
            </div>
        `;

        renderCompleteGallery();
        loadPartyGallery();
        const lbSection = $('#leaderboard-section');
        if (lbSection) lbSection.hidden = false;
        loadLeaderboard();
        createConfetti();
        navigateTo('complete');
    }

    function renderCompleteGallery() {
        const galleryHTML = CHALLENGES.map(c => {
            const photo = state.photos[c.id];
            if (!photo) return '';
            const isSelected = selectedPhotos.has(c.id);
            return `
                <div class="gallery-item ${isSelected ? 'selected' : ''}" data-id="${c.id}">
                    <div class="gallery-checkbox">${isSelected ? '&#10003;' : ''}</div>
                    <img src="${photo.url}" alt="${c.title}" loading="lazy">
                    <div class="gallery-item-label">${c.title}</div>
                </div>
            `;
        }).join('');
        $('#complete-gallery').innerHTML = galleryHTML;

        if (isSelectMode) {
            $('#complete-gallery').addEventListener('click', handleGalleryClick);
        }
    }

    function handleGalleryClick(e) {
        const item = e.target.closest('.gallery-item');
        if (!item) return;
        const id = parseInt(item.dataset.id);
        if (selectedPhotos.has(id)) {
            selectedPhotos.delete(id);
        } else {
            selectedPhotos.add(id);
        }
        updateSelectLabel();
        renderCompleteGallery();
    }

    function toggleSelectMode() {
        isSelectMode = !isSelectMode;
        selectedPhotos.clear();
        updateSelectLabel();
        if (isSelectMode) {
            showToast('Toca las fotos que quieras descargar', 3000);
        }
        renderCompleteGallery();
    }

    function updateSelectLabel() {
        const btn = $('#btn-select-download');
        const all = $('#btn-download-all');
        if (!btn) return;
        const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
        if (isSelectMode) {
            btn.innerHTML = `${check} Descargar seleccionadas (${selectedPhotos.size})`;
            if (all) all.style.display = 'none';
        } else {
            btn.innerHTML = `${check} Seleccionar fotos`;
            if (all) all.style.display = '';
        }
    }

    // ── DESCARGA ─────────────────────────────────────────────
    // Cloudinary no respeta el atributo `download` con URL de otro
    // dominio (abría pestañas o lo bloqueaba el navegador), así que
    // traemos cada foto como blob y las juntamos en un ZIP: una sola
    // descarga, sin pestañas y con nombres ordenados.
    async function fetchPhotoBlob(url) {
        if (url.indexOf('data:') === 0) {
            return await (await fetch(url)).blob();
        }
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) throw new Error('No se pudo descargar una foto');
        return await r.blob();
    }

    function triggerDownload(blob, filename) {
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 8000);
    }

    async function downloadPhotos(ids) {
        const valid = ids.filter(id => state.photos[id]);
        if (valid.length === 0) { showToast('No hay fotos para descargar'); return; }

        showToast(`Preparando ${valid.length} foto${valid.length > 1 ? 's' : ''}…`, 20000);
        try {
            if (window.JSZip) {
                const zip = new JSZip();
                const used = {};
                for (const id of valid) {
                    const photo = state.photos[id];
                    const challenge = CHALLENGES.find(c => c.id === id);
                    const blob = await fetchPhotoBlob(photo.url);
                    const m = photo.url.split('?')[0].match(/\.(png|jpe?g|webp|gif)$/i);
                    const ext = m ? m[1].toLowerCase() : 'jpg';
                    let base = (challenge && challenge.filename) || photo.fileName || ('reto_' + id);
                    base = String(base).replace(/\.(png|jpe?g|webp|gif|jpeg)$/i, '');
                    if (used[base]) { used[base]++; base = base + '_' + used[base]; } else { used[base] = 1; }
                    zip.file(base + '.' + ext, blob);
                }
                const out = await zip.generateAsync({ type: 'blob' });
                triggerDownload(out, 'gymkana-fotografica.zip');
            } else {
                // Respaldo si no carga la librería del ZIP
                for (const id of valid) {
                    const photo = state.photos[id];
                    const blob = await fetchPhotoBlob(photo.url);
                    triggerDownload(blob, `reto_${id}.jpg`);
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            showToast('Descarga iniciada ✓', 3000, 'success');
        } catch (e) {
            console.error('Download error:', e);
            showToast(`Error al descargar: ${e.message}`, 4000);
        }
    }

    // ── GALERÍA DE LA FIESTA ─────────────────────────────────
    let partyPhotos = [];
    let partyPage = 1;
    const PARTY_PAGE_SIZE = 12;

    async function loadPartyGallery() {
        const wrap = $('#party-gallery-wrap');
        const grid = $('#party-gallery');
        const pager = $('#party-pager');
        if (!wrap || !grid) return;
        wrap.hidden = false;
        grid.innerHTML = '<p class="party-loading">Cargando fotos…</p>';
        if (pager) pager.innerHTML = '';
        try {
            const res = await fetch('/api/gallery');
            if (!res.ok) throw new Error('Error cargando la galería');
            const photos = await res.json();
            if (!Array.isArray(photos)) throw new Error('Respuesta no válida');
            photos.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            partyPhotos = photos;
            partyPage = 1;

            if (partyPhotos.length === 0) {
                grid.innerHTML = '<p class="party-empty">Todavía no hay fotos en la galería.</p>';
                return;
            }
            renderPartyPage();
        } catch (e) {
            grid.innerHTML = '<p class="party-empty">No se pudo cargar la galería. Pulsa «Actualizar».</p>';
        }
    }

    function renderPartyPage() {
        const grid = $('#party-gallery');
        const pager = $('#party-pager');
        if (!grid) return;

        const pages = Math.max(1, Math.ceil(partyPhotos.length / PARTY_PAGE_SIZE));
        if (partyPage > pages) partyPage = pages;
        if (partyPage < 1) partyPage = 1;

        const start = (partyPage - 1) * PARTY_PAGE_SIZE;
        const slice = partyPhotos.slice(start, start + PARTY_PAGE_SIZE);

        grid.innerHTML = slice.map((p, i) => {
            const who = p.user ? `👤 ${escapeHtml(p.user)}` : '👤 Invitado';
            return `
                <figure class="party-photo" data-i="${start + i}">
                    <img src="${escapeHtml(p.thumb || p.url)}" alt="${who}" loading="lazy">
                    <figcaption class="party-badge">${who}</figcaption>
                </figure>
            `;
        }).join('');

        grid.querySelectorAll('.party-photo').forEach(fig => {
            fig.addEventListener('click', () => {
                openLightbox(partyPhotos[parseInt(fig.dataset.i, 10)]);
            });
        });

        if (pager) {
            pager.innerHTML = pages > 1 ? `
                <button class="pager-btn" id="pager-prev" aria-label="Página anterior" ${partyPage === 1 ? 'disabled' : ''}>&lsaquo;</button>
                <span class="pager-info">${partyPage} / ${pages}</span>
                <button class="pager-btn" id="pager-next" aria-label="Página siguiente" ${partyPage === pages ? 'disabled' : ''}>&rsaquo;</button>
            ` : '';
            const prev = document.getElementById('pager-prev');
            const next = document.getElementById('pager-next');
            if (prev) prev.addEventListener('click', () => { partyPage--; renderPartyPage(); });
            if (next) next.addEventListener('click', () => { partyPage++; renderPartyPage(); });
        }
    }

    function openLightbox(photo) {
        if (!photo) return;
        const challenge = CHALLENGES.find(c => c.id === photo.reto);
        const parts = [];
        if (photo.user) parts.push(`Subida por ${photo.user}`);
        if (challenge) parts.push(`Reto: ${challenge.title}`);
        $('#lightbox-img').src = photo.url;
        $('#lightbox-caption').textContent = parts.join(' · ');
        $('#photo-lightbox').classList.add('active');
    }

    function closeLightbox() {
        const box = $('#photo-lightbox');
        if (box) box.classList.remove('active');
    }

    // ── CLASIFICACIÓN ────────────────────────────────────────
    // Orden: más retos primero; a igualdad, quien lo alcanzó antes
    // (su última foto más antigua) — es decir, quien va ganando.
    function buildRanking(users, photos) {
        const map = new Map();
        users.forEach(u => {
            const k = normalizeName(u && u.name);
            if (!k) return;
            map.set(k, { name: String(u.name), progress: 0, last: '', registered: u.registered || '' });
        });
        photos.forEach(p => {
            const k = normalizeName(p && p.user);
            if (!k) return;
            let e = map.get(k);
            if (!e) {
                e = { name: String(p.user), progress: 0, last: '', registered: '' };
                map.set(k, e);
            }
            e.progress++;
            const created = p.createdAt || '';
            if (created > e.last) e.last = created;
        });

        const arr = [...map.values()];
        arr.forEach(e => { e.progress = Math.min(CHALLENGES.length, e.progress); });
        arr.sort((a, b) => {
            if (b.progress !== a.progress) return b.progress - a.progress;
            if (a.last && b.last && a.last !== b.last) return a.last < b.last ? -1 : 1;
            return String(a.registered).localeCompare(String(b.registered));
        });
        return arr;
    }

    async function loadLeaderboard() {
        renderLeaderboard(null, true);
        try {
            const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/gallery')]);
            const users = uRes.ok ? await uRes.json() : [];
            const photos = gRes.ok ? await gRes.json() : [];
            renderLeaderboard(buildRanking(
                Array.isArray(users) ? users : [],
                Array.isArray(photos) ? photos : []
            ));
        } catch (e) {
            renderLeaderboard(null, false, true);
        }
    }

    function renderLeaderboard(list, loading, error) {
        const mine = state.username ? normalizeName(state.username) : '';
        let html = '';
        let subtitle = 'Quién va primero en la gymkana';

        if (loading) {
            html = '<p class="lb-loading">Cargando clasificación…</p>';
        } else if (error) {
            html = '<p class="lb-empty">No se pudo cargar la clasificación.</p>';
        } else if (!list || list.length === 0) {
            html = '<p class="lb-empty">Todavía no hay participantes.</p>';
        } else {
            let myRank = 0;
            html = list.map((e, i) => {
                const isMe = mine && normalizeName(e.name) === mine;
                if (isMe) myRank = i + 1;
                const pos = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
                const pct = Math.round((e.progress / CHALLENGES.length) * 100);
                const done = e.progress >= CHALLENGES.length;
                return `
                    <div class="lb-row ${isMe ? 'me' : ''}">
                        <span class="lb-pos">${pos}</span>
                        <span class="lb-name">${escapeHtml(e.name)}${isMe ? '<span class="lb-you">TÚ</span>' : ''}</span>
                        <span class="lb-prog">${e.progress}/${CHALLENGES.length}${done ? ' · 🏁' : ''}</span>
                        <span class="lb-bar"><i style="width:${pct}%"></i></span>
                    </div>
                `;
            }).join('');
            subtitle = (mine && myRank)
                ? `Tu puesto: ${myRank}º de ${list.length} · ${list.length} participantes`
                : (mine
                    ? `${list.length} participantes · tú todavía sin fotos`
                    : `${list.length} participantes`);
        }

        ['lb-list-overlay', 'lb-list-complete'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        });
        ['lb-sub-overlay', 'lb-sub-complete'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = subtitle;
        });
    }

    function openLeaderboard() {
        const ov = $('#leaderboard-overlay');
        if (!ov) return;
        ov.classList.add('active');
        loadLeaderboard();
    }

    function closeLeaderboard() {
        const ov = $('#leaderboard-overlay');
        if (ov) ov.classList.remove('active');
    }

    // ── CONFETTI ─────────────────────────────────────────────
    function createConfetti() {
        const container = $('#confetti-container');
        container.innerHTML = '';
        const colors = ['#b8956a', '#ffffff', '#a8e6cf', '#f4c2c2', '#d4c5f9'];

        for (let i = 0; i < 50; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay = Math.random() * 1.5 + 's';
            piece.style.width = (Math.random() * 6 + 4) + 'px';
            piece.style.height = (Math.random() * 6 + 4) + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            container.appendChild(piece);
        }
        setTimeout(() => { container.innerHTML = ''; }, 5000);
    }

    // ── TOAST ────────────────────────────────────────────────
    let toastTimer = null;

    function showToast(message, duration = 2500, type = '') {
        const toast = $('#toast');
        toast.textContent = message;
        toast.className = 'toast' + (type ? ' ' + type : '');
        clearTimeout(toastTimer);
        requestAnimationFrame(() => toast.classList.add('show'));
        toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    }

    // ── BOOT ─────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', init);
})();
