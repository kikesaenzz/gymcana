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

    // Miniatura ligera para las cuadrículas: el original solo se usa
    // al abrir la foto en grande o al descargarla (rendimiento)
    function thumbUrl(url) {
        if (!url || url.indexOf('data:') === 0 || url.indexOf('/upload/') === -1) return url;
        if (url.indexOf('/upload/w_') !== -1) return url; // ya es miniatura
        return url.replace('/upload/', '/upload/w_500,q_auto:eco/');
    }

    // Atributos de imagen: carga diferida + fundido al aparecer
    const IMG_ATTRS = 'loading="lazy" decoding="async" class="ph-img" onload="this.classList.add(\'img-ready\');this.parentElement.classList.add(\'img-loaded\')" onerror="this.classList.add(\'img-ready\');this.parentElement.classList.add(\'img-loaded\')"';

    // True mientras se arrastra el carrusel con el ratón: evita que
    // el clic que termina el arrastre abra un reto por accidente
    let carouselDragMoved = false;

    // ── INIT ─────────────────────────────────────────────
    let initialized = false;

    function init() {
        // Solo una vez: si el evento DOMContentLoaded llega dos veces
        // (por ejemplo en tests), los listeners no se duplican
        if (initialized) return;
        initialized = true;
        bindEvents();
        // Se recuerda el último nombre usado en este dispositivo:
        // se rellena solo y el botón queda listo para pulsar.
        try {
            const last = localStorage.getItem(STORAGE_PREFIX + 'last_user');
            if (last) {
                const input = $('#username-input');
                input.value = last;
                $('#btn-start').disabled = false;
            }
        } catch (e) {}
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
                    showToast('Pon un nombre identificativo: con él se reconocerán tus fotos', 4500);
                    localStorage.setItem('gymkana_boda_hint_seen', '1');
                }
            } catch (e) {}
        });

        btnStart.addEventListener('click', async () => {
            // Evita dobles clics mientras se comprueba el nombre
            if (btnStart.dataset.busy) return;
            btnStart.dataset.busy = '1';

            const name = usernameInput.value.trim();
            if (name.length < 2) { delete btnStart.dataset.busy; return; }
            const key = normalizeName(name);

            // ¿Ese nombre ya está en uso? Preguntamos si de verdad es
            // la misma persona antes de continuar, con un mensaje
            // integrado en la app (sin diálogos del navegador).
            try {
                const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/gallery')]);
                const users = uRes.ok ? await uRes.json() : [];
                const photos = gRes.ok ? await gRes.json() : [];
                const taken = new Set();
                (Array.isArray(users) ? users : []).forEach(u => { if (u && u.name) taken.add(normalizeName(u.name)); });
                (Array.isArray(photos) ? photos : []).forEach(p => { if (p && p.user) taken.add(normalizeName(p.user)); });

                if (taken.has(key)) {
                    const ok = await showNameConfirm(name);
                    if (!ok) {
                        delete btnStart.dataset.busy;
                        usernameInput.focus();
                        return;
                    }
                }
            } catch (e) { /* sin comprobación disponible: no bloqueamos */ }

            state.username = name;
            loadState();
            state.username = name;
            try { localStorage.setItem(STORAGE_PREFIX + 'last_user', name); } catch (e) {}
            registerUser(name);
            await syncFromCloud();
            saveState();
            delete btnStart.dataset.busy;
            // Si ya tiene todos los retos hechos, directamente a la pantalla final
            if (state.completedChallenges.length >= CHALLENGES.length) {
                showCompleteScreen();
                return;
            }
            renderCarousel();
            navigateTo('challenges');

            // Mensaje "¿seguro que eres tú?" integrado en la aplicación
            function showNameConfirm(personName) {
                return new Promise(resolve => {
                    const overlay = $('#name-confirm');
                    const title = $('#name-confirm-title');
                    const text = $('#name-confirm-text');
                    if (!overlay) { resolve(true); return; }

                    title.textContent = `El nombre «${personName}» ya está en la lista de invitados`;
                    text.textContent = '¿Seguro que eres tú? Si vas a seguir donde lo dejaste, es tu nombre. Si eres otra persona, usa otro nombre identificativo para no mezclar fotos.';
                    overlay.classList.add('active');

                    const yes = $('#name-confirm-yes');
                    const no = $('#name-confirm-no');
                    const finish = (val) => {
                        overlay.classList.remove('active');
                        yes.removeEventListener('click', onYes);
                        no.removeEventListener('click', onNo);
                        overlay.removeEventListener('click', onBackdrop);
                        document.removeEventListener('keydown', onKey);
                        resolve(val);
                    };
                    const onYes = () => finish(true);
                    const onNo = () => finish(false);
                    const onBackdrop = (e) => { if (e.target === overlay) finish(false); };
                    const onKey = (e) => { if (e.key === 'Escape') finish(false); };

                    yes.addEventListener('click', onYes);
                    no.addEventListener('click', onNo);
                    overlay.addEventListener('click', onBackdrop);
                    document.addEventListener('keydown', onKey);
                    yes.focus();
                });
            }
        });

        usernameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnStart.click();
        });

        function logout() {
            saveState();
            state.username = null;
            closeProfile();
            closeLeaderboard();
            navigateTo('welcome');
            showToast('Tu progreso se ha guardado');
        }
        $('#btn-logout').addEventListener('click', logout);
        $('#detail-logout').addEventListener('click', logout);
        $('#profile-logout').addEventListener('click', logout);

        // Mi perfil desde el avatar de la cabecera o del detalle
        function openMyProfile() {
            if (state.username) openProfile(state.username);
        }
        const headerUser = $('#header-user');
        headerUser.addEventListener('click', openMyProfile);
        headerUser.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMyProfile(); }
        });
        $('#detail-profile').addEventListener('click', openMyProfile);
        $('#detail-leaderboard').addEventListener('click', openLeaderboard);
        // Volver a la pantalla de felicidades (solo al terminar todo)
        $('#btn-summary').addEventListener('click', showCompleteScreen);
        $('#profile-summary').addEventListener('click', () => {
            closeProfile();
            showCompleteScreen();
        });
        $('#profile-download').addEventListener('click', () => {
            closeProfile();
            openDownloadModal('mine');
        });
        $('#profile-lb').addEventListener('click', () => {
            closeProfile();
            openLeaderboard();
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
            navigateTo('challenges');
            renderCarousel();
        });

        // Descarga: se abre el selector con las fotos visibles para
        // verlas y elegir cuáles (o todas). También para la fiesta.
        $('#btn-download-all').addEventListener('click', () => openDownloadModal('mine'));
        const btnDlParty = $('#btn-download-party');
        if (btnDlParty) btnDlParty.addEventListener('click', () => openDownloadModal('party'));

        $('#dl-close').addEventListener('click', closeDownloadModal);
        $('#dl-backdrop').addEventListener('click', closeDownloadModal);
        $('#dl-select-all').addEventListener('click', () => {
            // La comparación es sobre las fotos VISIBLES (si hay un
            // filtro por persona activo, solo cuenta esas)
            const items = dlItems();
            const visibleSelected = items.filter(it => dlSelected.has(it.key)).length;
            if (items.length > 0 && visibleSelected === items.length) {
                items.forEach(it => dlSelected.delete(it.key));
            } else {
                items.forEach(it => dlSelected.add(it.key));
            }
            renderDlGrid();
            updateDlActions();
        });
        $('#dl-go').addEventListener('click', downloadSelected);

        // Filtro por persona dentro del selector de descarga (desplegable propio)
        // (se maneja con los botones .person-dd-btn; ver renderPersonDropdown)

        // Galería de la fiesta, lightbox y clasificación
        $('#btn-refresh-gallery').addEventListener('click', () => loadPartyGallery(true));

        // Pantalla final: cada sección se carga al tocar su botón
        bindViewToggle('#btn-view-mine', '#complete-mine-wrap', renderCompleteGallery);
        bindViewToggle('#btn-view-party', '#party-gallery-wrap', loadPartyGallery);
        // La clasificación se abre como el banner de la página de retos
        $('#btn-view-lb').addEventListener('click', openLeaderboard);

        // Descargar todas las fotos (de todos los invitados)
        $('#btn-download-party-final').addEventListener('click', async () => {
            if (!partyPhotos.length) {
                showToast('Cargando las fotos de la fiesta…', 2500);
                await loadPartyGallery();
            }
            openDownloadModal('party');
        });

        // Cerrar los desplegables de personas al tocar fuera
        document.addEventListener('click', (e) => {
            document.querySelectorAll('.person-dd.open').forEach(dd => {
                if (!dd.contains(e.target)) {
                    dd.classList.remove('open');
                    const b = dd.querySelector('.person-dd-btn');
                    if (b) b.setAttribute('aria-expanded', 'false');
                }
            });
        });
        $('#lightbox-close').addEventListener('click', closeLightbox);
        $('#photo-lightbox').addEventListener('click', (e) => {
            if (e.target.id === 'photo-lightbox') closeLightbox();
        });

        // Navegación del lightbox: botones, flechas del teclado y swipe
        $('#lightbox-prev').addEventListener('click', () => navLightbox(-1));
        $('#lightbox-next').addEventListener('click', () => navLightbox(1));
        document.addEventListener('keydown', (e) => {
            const lb = $('#photo-lightbox');
            if (!lb || !lb.classList.contains('active')) return;
            if (e.key === 'ArrowLeft') { e.preventDefault(); navLightbox(-1); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); navLightbox(1); }
        });
        let lbTouchX = null;
        $('#photo-lightbox').addEventListener('touchstart', (e) => {
            lbTouchX = e.touches.length === 1 ? e.touches[0].clientX : null;
        }, { passive: true });
        $('#photo-lightbox').addEventListener('touchend', (e) => {
            if (lbTouchX == null) return;
            const dx = e.changedTouches[0].clientX - lbTouchX;
            lbTouchX = null;
            if (Math.abs(dx) > 45) navLightbox(dx < 0 ? 1 : -1);
        }, { passive: true });
        $('#btn-leaderboard').addEventListener('click', openLeaderboard);
        $('#leaderboard-close').addEventListener('click', closeLeaderboard);
        $('#leaderboard-overlay').addEventListener('click', (e) => {
            if (e.target.id === 'leaderboard-overlay') closeLeaderboard();
        });

        // Perfil de participante (se abre tocando una fila de la clasificación)
        $('#profile-close').addEventListener('click', closeProfile);
        $('#profile-modal').addEventListener('click', (e) => {
            if (e.target.id === 'profile-modal') closeProfile();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            // Si el lightbox está encima, solo se cierra ese
            const lb = $('#photo-lightbox');
            if (lb && lb.classList.contains('active')) { closeLightbox(); return; }
            // Después el perfil y luego el resto por capas
            const prof = $('#profile-modal');
            if (prof && prof.classList.contains('active')) { closeProfile(); return; }
            closeLeaderboard();
            closeDownloadModal();
        });

        // Carrusel: scroll y rueda, registrados UNA sola vez
        // (antes se añadían en cada render y los puntos no se movían
        // porque el cálculo usaba el contenedor equivocado)
        const track = $('#carousel-track');
        // updateDots va limitado a un frame: evitar layout en cada scroll
        let dotsFrame = 0;
        track.addEventListener('scroll', () => {
            if (dotsFrame) return;
            dotsFrame = requestAnimationFrame(() => { dotsFrame = 0; updateDots(); });
        }, { passive: true });
        track.addEventListener('wheel', function (e) {
            e.preventDefault();
            track.scrollLeft += e.deltaY * 2;
        }, { passive: false });

        // Escritorio: arrastrar con el ratón para deslizar entre retos
        let dragging = false, dragStartX = 0, dragStartScroll = 0;
        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') return; // el táctil ya desliza solo
            dragging = true;
            carouselDragMoved = false;
            dragStartX = e.clientX;
            dragStartScroll = track.scrollLeft;
        });
        track.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - dragStartX;
            if (Math.abs(dx) > 5) carouselDragMoved = true;
            track.scrollLeft = dragStartScroll - dx;
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => {
            track.addEventListener(ev, () => { dragging = false; });
        });

        // Dots inferiores: mantener el dedo los agranda y deslizar
        // sobre ellos salta rápidamente de tarjeta en tarjeta
        const dotsBar = $('#carousel-dots');
        let scrubbing = false;
        let scrubIdx = -1;

        const nearestDot = (clientX) => {
            const dots = dotsBar.querySelectorAll('.carousel-dot');
            let best = -1, bestDist = Infinity;
            dots.forEach((d, i) => {
                const r = d.getBoundingClientRect();
                const dist = Math.abs(r.left + r.width / 2 - clientX);
                if (dist < bestDist) { bestDist = dist; best = i; }
            });
            return best;
        };

        const scrollToCard = (i, behavior) => {
            const cards = track.querySelectorAll('.carousel-card');
            const card = cards[i];
            if (!card) return;
            track.scrollTo({
                left: card.offsetLeft + card.offsetWidth / 2 - track.offsetWidth / 2,
                behavior: behavior || 'smooth'
            });
        };

        const endScrub = () => {
            if (!scrubbing) return;
            scrubbing = false;
            scrubIdx = -1;
            dotsBar.classList.remove('scrubbing');
        };

        dotsBar.addEventListener('pointerdown', (e) => {
            scrubbing = true;
            scrubIdx = nearestDot(e.clientX);
            dotsBar.classList.add('scrubbing');
            if (dotsBar.setPointerCapture) { try { dotsBar.setPointerCapture(e.pointerId); } catch (_) {} }
            if (scrubIdx >= 0) scrollToCard(scrubIdx, 'auto');
            e.preventDefault();
        });
        dotsBar.addEventListener('pointermove', (e) => {
            if (!scrubbing) return;
            const i = nearestDot(e.clientX);
            if (i >= 0 && i !== scrubIdx) {
                scrubIdx = i;
                scrollToCard(i, 'auto');
            }
        });
        dotsBar.addEventListener('pointerup', endScrub);
        dotsBar.addEventListener('pointercancel', endScrub);
        dotsBar.addEventListener('pointerleave', endScrub);
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
        // Al terminarlo todo se puede volver a la pantalla final
        const summaryBtn = $('#btn-summary');
        if (summaryBtn) summaryBtn.hidden = completed < total;

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
                statusHTML = '<span class="status-badge locked"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v3"/></svg></span>';
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
                if (carouselDragMoved) return;
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

        $('#detail-avatar-letter').textContent = (state.username || '?').charAt(0).toUpperCase();
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

            // Aviso "reto completado" centrado en medio de la página
            showDoneOverlay(challenge);

            if (state.completedChallenges.length === CHALLENGES.length) {
                // Tiempos ampliados: el aviso se desvanece (0,6 s) y la
                // siguiente pantalla entra en medio del fundido
                setTimeout(() => showCompleteScreen(), 2100);
            } else {
                const nextChallenge = CHALLENGES.find(c => !state.completedChallenges.includes(c.id));
                if (nextChallenge) {
                    setTimeout(() => openChallenge(nextChallenge), 1900);
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

    // ── AVISO "RETO COMPLETADO" — en medio de la página ─────
    let doneTimer = null;

    function showDoneOverlay(challenge) {
        const ov = $('#done-overlay');
        if (!ov) { showToast('Reto completado', 2000, 'success'); return; }
        $('#done-title').textContent = '¡Reto completado!';
        // Sin emojis: solo el nombre del reto
        $('#done-sub').textContent = challenge ? challenge.title : '';
        // Reinicia la animación por si se envían dos fotos seguidas
        ov.classList.remove('active');
        void ov.offsetWidth;
        ov.classList.add('active');
        clearTimeout(doneTimer);
        doneTimer = setTimeout(() => ov.classList.remove('active'), 1650);
    }

    // ── COMPLETE SCREEN ──────────────────────────────────────
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

        // Las secciones de abajo (mis fotos, fiesta, clasificación)
        // se cargan solo cuando se pide: así la pantalla entra al instante
        hideCompleteSections();
        createConfetti();
        navigateTo('complete');
    }

    function hideCompleteSections() {
        ['#complete-mine-wrap', '#party-gallery-wrap'].forEach(sel => {
            const sec = $(sel);
            if (!sec) return;
            sec.hidden = true;
            delete sec.dataset.loaded;
        });
        [['#btn-view-mine', '#complete-mine-wrap'], ['#btn-view-party', '#party-gallery-wrap']]
            .forEach(([b, s]) => {
                const btn = $(b);
                if (!btn) return;
                btn.classList.remove('active');
                btn.setAttribute('aria-expanded', 'false');
            });
    }

    // Alterna cada sección de la pantalla final y carga su contenido
    // una sola vez (carga diferida)
    // Solo una seccion a la vez: abrir "todas" cierra "mis fotos"
    // y viceversa (ademas carga diferida de cada una).
    const viewToggles = [];
    function setToggle(t, open) {
        t.sec.hidden = !open;
        t.btn.classList.toggle('active', open);
        t.btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    function bindViewToggle(btnSel, secSel, loader) {
        const btn = $(btnSel);
        const sec = $(secSel);
        if (!btn || !sec) return;
        const t = { btn, sec, loader };
        viewToggles.push(t);
        btn.addEventListener('click', () => {
            const show = sec.hidden;
            if (show) {
                if (!sec.dataset.loaded) {
                    sec.dataset.loaded = '1';
                    t.loader();
                }
                viewToggles.forEach(other => { if (other !== t) setToggle(other, false); });
            }
            setToggle(t, show);
        });
    }

    function renderCompleteGallery() {
        let idx = 0;
        const galleryHTML = CHALLENGES.map(c => {
            const photo = state.photos[c.id];
            if (!photo) return '';
            const delay = (Math.min(idx++, 12) * 0.05).toFixed(3);
            return `
                <div class="gallery-item" data-id="${c.id}" style="animation-delay:${delay}s">
                    <img src="${escapeHtml(thumbUrl(photo.url))}" alt="${escapeHtml(c.title)}" ${IMG_ATTRS}>
                    <div class="gallery-item-label">${c.title}</div>
                </div>
            `;
        }).join('');
        $('#complete-gallery').innerHTML = galleryHTML;

        // Tocar una foto propia la abre en grande (con navegación entre ellas)
        const minePhotos = CHALLENGES.filter(c => state.photos[c.id])
            .map(c => ({ url: state.photos[c.id].url, user: state.username, reto: c.id }));
        $('#complete-gallery').querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id, 10);
                const photo = minePhotos.find(p => p.reto === id);
                openLightbox(photo, minePhotos);
            });
        });
    }

    // ── MODAL DE SELECCIÓN Y DESCARGA ───────────────────────
    // Muestra las fotos para verlas y elegir cuáles descargar:
    // las propias ("mine") o las de toda la fiesta ("party").
    // Siempre se pueden seleccionar todas de una vez. En la fiesta
    // hay filtro por persona para ver solo las fotos de alguien.
    let dlSource = 'mine';
    let dlSelected = new Set();
    let dlFilter = '';      // clave normalizada del filtro (vacío = todas)
    let dlBusy = false;

    function dlItems() {
        if (dlSource === 'party') {
            const all = partyPhotos.map((p, i) => {
                const who = p.user || 'Invitado';
                const slug = normalizeName(who).replace(/[^\w\s-]/g, '').replace(/\s+/g, '-') || 'invitado';
                return {
                    key: 'p' + i,
                    thumb: p.thumb || p.url,
                    full: p.url,
                    title: who,
                    user: who,
                    reto: p.reto,
                    slugKey: normalizeName(who) || 'invitado',
                    base: `Fiesta_${slug}_Reto_${p.reto != null ? p.reto : 'x'}`
                };
            });
            return dlFilter ? all.filter(it => it.slugKey === dlFilter) : all;
        }
        return CHALLENGES.filter(c => state.photos[c.id]).map(c => ({
            key: 'c' + c.id,
            thumb: state.photos[c.id].url,
            full: state.photos[c.id].url,
            title: c.title,
            user: state.username,
            reto: c.id,
            base: c.filename
        }));
    }

    function openDownloadModal(source) {
        dlSource = source;
        dlSelected = new Set();
        dlFilter = '';
        const items = dlItems();
        if (items.length === 0) {
            showToast(source === 'party' ? 'Todavía no hay fotos en la galería' : 'Todavía no has subido fotos');
            return;
        }
        // Empieza con todas seleccionadas (se pueden ir desmarcando)
        items.forEach(it => dlSelected.add(it.key));
        $('#dl-title').textContent = source === 'party' ? 'Fotos de la fiesta' : 'Mis fotos';
        $('#dl-sub').textContent = 'Toca las fotos para elegir; el icono del ojo las abre en grande';
        // Filtro por persona: solo en la fiesta y con 2+ personas
        if (source === 'party') renderPersonDropdown('dl-dd', partyPhotos, dlFilter, onDlFilterPick);
        else $('#dl-filter').hidden = true;
        $('#dl-progress').hidden = true;
        renderDlGrid();
        updateDlActions();
        $('#dl-modal').classList.add('active');
    }

    function closeDownloadModal() {
        const m = $('#dl-modal');
        if (m) m.classList.remove('active');
    }

    function renderDlGrid() {
        const grid = $('#dl-grid');
        if (!grid) return;
        const items = dlItems();
        grid.innerHTML = items.map((it, k) => `
            <figure class="dl-item ${dlSelected.has(it.key) ? 'selected' : ''}" data-key="${it.key}" style="animation-delay:${(k * 0.04).toFixed(3)}s">
                <img src="${escapeHtml(thumbUrl(it.thumb))}" alt="${escapeHtml(it.title)}" ${IMG_ATTRS}>
                <span class="dl-check" aria-hidden="true">&#10003;</span>
                <button type="button" class="dl-view" title="Ver foto" aria-label="Ver foto"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg></button>
            </figure>
        `).join('');

        grid.querySelectorAll('.dl-item').forEach(fig => {
            fig.addEventListener('click', (e) => {
                const key = fig.dataset.key;
                if (e.target.closest('.dl-view')) {
                    const visible = dlItems();
                    const i = visible.findIndex(x => x.key === key);
                    if (i >= 0) {
                        const it = visible[i];
                        openLightbox({ url: it.full, user: it.user, reto: it.reto }, visible, i);
                    }
                    return;
                }
                if (dlSelected.has(key)) dlSelected.delete(key);
                else dlSelected.add(key);
                fig.classList.toggle('selected');
                updateDlActions();
            });
        });
    }

    function updateDlActions() {
        const go = $('#dl-go');
        const all = $('#dl-select-all');
        if (!go || !all) return;
        const items = dlItems();
        // Solo cuentan las fotos visibles (respetando el filtro activo)
        const n = items.filter(it => dlSelected.has(it.key)).length;
        const icon = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        go.innerHTML = n === 0 ? 'Elige alguna foto' : `${icon} Descargar (${n})`;
        go.disabled = n === 0 || dlBusy;
        all.textContent = (items.length > 0 && n === items.length) ? 'No seleccionar ninguna' : 'Seleccionar todas';
        all.disabled = dlBusy;
    }

    // ── DESCARGA ─────────────────────────────────────────────
    // Cloudinary no respeta el atributo `download` con URL de otro
    // dominio (abría pestañas o lo bloqueaba el navegador), así que
    // traemos cada foto como blob y la entregamos como archivo:
    // en el móvil se abre el compartir del sistema (guardar/abrir)
    // y en el ordenador se descarga. Cada imagen se valida antes.
    async function fetchPhotoBlob(url) {
        if (url.indexOf('data:') === 0) {
            return await (await fetch(url)).blob();
        }
        const r = await fetch(url, { mode: 'cors' });
        if (!r.ok) throw new Error('No se pudo descargar una foto');
        const blob = await r.blob();
        const type = blob.type || '';
        if (type && type.indexOf('image/') !== 0 && type.indexOf('application/octet-stream') === -1) {
            throw new Error('Una foto no se pudo leer correctamente');
        }
        return blob;
    }

    function extFrom(blob, url) {
        const m = String(url || '').split('?')[0].match(/\.(png|jpe?g|webp|gif)$/i);
        if (m) return m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
        const t = (blob.type || '').split('/')[1] || '';
        if (t === 'jpeg') return 'jpg';
        if (['png', 'webp', 'gif', 'avif'].indexOf(t) !== -1) return t;
        return 'jpg';
    }

    // Entrega el archivo al usuario. En el móvil primero intenta el
    // compartir del sistema (Guardar en Fotos/Archivos o abrirlo) y,
    // si no existe, hace la descarga normal sin caducar el blob.
    async function deliverFile(blob, filename) {
        try {
            const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: filename });
                return;
            }
        } catch (e) {
            if (e && e.name === 'AbortError') throw e; // cancelado por el usuario
            // Otro fallo del compartir → se intenta la descarga normal
        }
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    }

    async function downloadSelected() {
        if (dlBusy) return;
        const items = dlItems().filter(it => dlSelected.has(it.key));
        if (items.length === 0) { showToast('Toca primero las fotos que quieras descargar'); return; }

        dlBusy = true;
        const progress = $('#dl-progress');
        const progressText = $('#dl-progress-text');
        progress.hidden = false;
        updateDlActions();

        try {
            if (items.length === 1) {
                // Una sola foto: se entrega tal cual, sin ZIP
                progressText.textContent = 'Preparando foto…';
                const it = items[0];
                const blob = await fetchPhotoBlob(it.full);
                await deliverFile(blob, `${it.base}.${extFrom(blob, it.full)}`);
            } else {
                if (!window.JSZip) throw new Error('No se pudo cargar la librería del ZIP');
                const zip = new JSZip();
                const used = {};
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    progressText.textContent = `Preparando ${i + 1}/${items.length}…`;
                    const blob = await fetchPhotoBlob(it.full);
                    let base = it.base;
                    if (used[base]) { used[base]++; base = `${base}_${used[base]}`; } else { used[base] = 1; }
                    zip.file(`${base}.${extFrom(blob, it.full)}`, blob);
                }
                progressText.textContent = 'Creando el ZIP…';
                const out = await zip.generateAsync({ type: 'blob' });
                await deliverFile(out, 'gymkana-fotografica.zip');
            }
            closeDownloadModal();
            showToast('Descarga iniciada ✓', 3000, 'success');
        } catch (e) {
            if (e && e.name === 'AbortError') {
                showToast('Descarga cancelada', 2500);
            } else {
                console.error('Download error:', e);
                showToast(`Error al descargar: ${e.message}`, 4000);
            }
        } finally {
            dlBusy = false;
            progress.hidden = true;
            updateDlActions();
        }
    }

    // ── GALERÍA DE LA FIESTA ─────────────────────────────────
    let partyPhotos = [];
    let partyPage = 1;
    let partyFilter = '';   // clave normalizada del filtro (vacío = todas)
    const PARTY_PAGE_SIZE = 12;

    // Opciones del desplegable «Ver fotos de…»: personas ordenadas
    // por número de fotos (la que más sube, primero)
    function userOptions(photos) {
        const map = new Map();
        (photos || []).forEach(p => {
            const raw = String((p && p.user) || '').trim();
            const key = normalizeName(raw) || 'invitado';
            const entry = map.get(key) || { key, label: raw || 'Invitado', count: 0 };
            entry.count++;
            if (raw) entry.label = raw;   // se queda el nombre original
            map.set(key, entry);
        });
        return [...map.values()].sort((a, b) => b.count - a.count);
    }

    // Desplegable de personas (diseño propio, adaptado a la web):
    // botón con la selección actual y menú con avatar, nombre y contador.
    function renderPersonDropdown(ddId, photos, currentValue, onSelect) {
        const dd = document.getElementById(ddId);
        if (!dd) return;
        const filterWrap = dd.closest('.gallery-filter');
        const opts = userOptions(photos);
        // Solo se muestra si hay varias personas que filtrar
        if (filterWrap) filterWrap.hidden = opts.length < 2;
        if (opts.length < 2) return;

        const btn = dd.querySelector('.person-dd-btn');
        const menu = dd.querySelector('.person-dd-menu');
        const valueEl = dd.querySelector('.person-dd-value');

        const all = [{ key: '', label: 'Todas las personas', count: photos.length }].concat(opts);
        menu.innerHTML = all.map(o => `
            <button type="button" class="person-dd-item${o.key === currentValue ? ' active' : ''}" data-key="${escapeHtml(o.key)}" role="option" aria-selected="${o.key === currentValue}">
                <span class="person-dd-avatar">${escapeHtml(((o.label || '?').trim().charAt(0) || '?').toUpperCase())}</span>
                <span class="person-dd-name">${escapeHtml(o.label)}</span>
                <span class="person-dd-count">${o.count}</span>
            </button>
        `).join('');

        const current = all.find(o => o.key === currentValue) || all[0];
        valueEl.textContent = current.label;

        // Toggle del menú (registrado una sola vez)
        if (!btn.dataset.bound) {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = dd.classList.toggle('open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }

        menu.querySelectorAll('.person-dd-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                dd.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
                onSelect(item.dataset.key || '');
            });
        });
    }

    function onPartyFilterPick(key) {
        partyFilter = key;
        partyPage = 1;
        renderPartyPage();
        renderPersonDropdown('party-dd', partyPhotos, partyFilter, onPartyFilterPick);
    }

    function onDlFilterPick(key) {
        dlFilter = key;
        const items = dlItems();
        // Al cambiar de persona se empieza con todo lo visible seleccionado
        dlSelected = new Set(items.map(it => it.key));
        renderDlGrid();
        updateDlActions();
        renderPersonDropdown('dl-dd', partyPhotos, dlFilter, onDlFilterPick);
    }

    async function loadPartyGallery(force) {
        const wrap = $('#party-gallery-wrap');
        const grid = $('#party-gallery');
        const pager = $('#party-pager');
        if (!wrap || !grid) return;
        wrap.hidden = false;

        // Si ya hay fotos en memoria se pintan al instante y, mientras
        // tanto, se refresca en segundo plano (mucho más fluido)
        const hasCache = partyPhotos.length > 0;
        if (hasCache) {
            renderPersonDropdown('party-dd', partyPhotos, partyFilter, onPartyFilterPick);
            renderPartyPage();
        } else {
            grid.innerHTML = '<p class="party-loading">Cargando fotos…</p>';
            if (pager) pager.innerHTML = '';
        }

        try {
            const res = await fetch('/api/gallery');
            if (!res.ok) throw new Error('Error cargando la galería');
            const photos = await res.json();
            if (!Array.isArray(photos)) throw new Error('Respuesta no válida');
            photos.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            partyPhotos = photos;
            if (!hasCache) {
                partyPage = 1;
                partyFilter = '';
            }
            renderPersonDropdown('party-dd', partyPhotos, partyFilter, onPartyFilterPick);

            if (partyPhotos.length === 0) {
                grid.innerHTML = '<p class="party-empty">Todavía no hay fotos en la galería.</p>';
                if (pager) pager.innerHTML = '';
                return;
            }
            renderPartyPage();
            if (force && hasCache) showToast('Galería actualizada', 2000, 'success');
        } catch (e) {
            if (!hasCache) {
                grid.innerHTML = '<p class="party-empty">No se pudo cargar la galería. Pulsa «Actualizar».</p>';
            } else {
                showToast('No se pudo actualizar la galería', 3000);
            }
        }
    }

    function renderPartyPage() {
        const grid = $('#party-gallery');
        const pager = $('#party-pager');
        if (!grid) return;

        // Fotos visibles: con el filtro por persona si hay uno activo
        const list = partyFilter
            ? partyPhotos.filter(p => (normalizeName(p.user) || 'invitado') === partyFilter)
            : partyPhotos;

        const pages = Math.max(1, Math.ceil(list.length / PARTY_PAGE_SIZE));
        if (partyPage > pages) partyPage = pages;
        if (partyPage < 1) partyPage = 1;

        if (list.length === 0) {
            grid.innerHTML = '<p class="party-empty">No hay fotos de esa persona.</p>';
            if (pager) pager.innerHTML = '';
            return;
        }

        const start = (partyPage - 1) * PARTY_PAGE_SIZE;
        const slice = list.slice(start, start + PARTY_PAGE_SIZE);

        grid.innerHTML = slice.map((p, k) => {
            const who = p.user ? escapeHtml(p.user) : 'Invitado';
            // Índice dentro de partyPhotos para el lightbox
            const i = partyPhotos.indexOf(p);
            return `
                <figure class="party-photo" data-i="${i}" style="animation-delay:${(k * 0.045).toFixed(3)}s">
                    <img src="${escapeHtml(thumbUrl(p.thumb || p.url))}" alt="${who}" ${IMG_ATTRS}>
                    <figcaption class="party-badge">${who}</figcaption>
                </figure>
            `;
        }).join('');

        grid.querySelectorAll('.party-photo').forEach(fig => {
            fig.addEventListener('click', () => {
                const photo = partyPhotos[parseInt(fig.dataset.i, 10)];
                openLightbox(photo, list);
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

    // Lightbox con navegación: se le pasa la foto y la lista completa
    // (fotos visibles) para moverse con los botones, el teclado o el swipe
    let lbPhotos = [];
    let lbIndex = -1;

    function openLightbox(photo, list, index) {
        if (!photo) return;
        if (Array.isArray(list) && list.length > 0) {
            lbPhotos = list;
            let i = (typeof index === 'number' && index >= 0) ? index : list.indexOf(photo);
            if (i < 0) i = list.findIndex(p => p && (p.url === photo.url || p.full === photo.url));
            lbIndex = i >= 0 ? i : 0;
        } else {
            lbPhotos = [photo];
            lbIndex = 0;
        }
        showLightboxPhoto();
        $('#photo-lightbox').classList.add('active');
    }

    function showLightboxPhoto() {
        const photo = lbPhotos[lbIndex];
        if (!photo) return;
        const src = photo.url || photo.full;
        const challenge = CHALLENGES.find(c => c.id === photo.reto);
        const parts = [];
        if (photo.user) parts.push(`Subida por ${photo.user}`);
        if (challenge) parts.push(`Reto: ${challenge.title}`);
        $('#lightbox-img').src = src;
        $('#lightbox-caption').textContent = parts.join(' · ');

        const multi = lbPhotos.length > 1;
        const count = $('#lightbox-count');
        count.hidden = !multi;
        if (multi) count.textContent = `${lbIndex + 1} / ${lbPhotos.length}`;
        $('#lightbox-prev').hidden = !multi;
        $('#lightbox-next').hidden = !multi;
    }

    function navLightbox(dir) {
        if (lbPhotos.length < 2) return;
        lbIndex = (lbIndex + dir + lbPhotos.length) % lbPhotos.length;
        showLightboxPhoto();
    }

    function closeLightbox() {
        const box = $('#photo-lightbox');
        if (box) box.classList.remove('active');
        lbPhotos = [];
        lbIndex = -1;
    }

    // ── CLASIFICACIÓN ────────────────────────────────────────
    // Orden: más retos primero; a igualdad, quien lo alcanzó antes
    // (su última foto más antigua) — es decir, quien va ganando.
    function buildRanking(users, photos) {
        const map = new Map();
        const entry = (name, registered) => {
            const k = normalizeName(name);
            if (!k) return null;
            let e = map.get(k);
            if (!e) {
                e = { name: String(name), progress: 0, last: '', registered: registered || '', done: new Set() };
                map.set(k, e);
            }
            return e;
        };
        users.forEach(u => entry(u && u.name, u && u.registered));
        photos.forEach(p => {
            const e = entry(p && p.user);
            if (!e) return;
            // Cuenta retos DISTINTOS: repetir la foto de un reto
            // (o subirlas varias veces) no suma progreso.
            const rid = p && p.reto != null && p.reto !== '' ? String(p.reto) : null;
            if (rid !== null && e.done.has(rid)) return;
            if (rid !== null) e.done.add(rid);
            e.progress++;
            const created = p.createdAt || '';
            if (created > e.last) e.last = created;
        });

        const arr = [...map.values()];
        arr.forEach(e => {
            e.progress = Math.min(CHALLENGES.length, e.progress);
            delete e.done;
        });
        arr.sort((a, b) => {
            if (b.progress !== a.progress) return b.progress - a.progress;
            if (a.last && b.last && a.last !== b.last) return a.last < b.last ? -1 : 1;
            return String(a.registered).localeCompare(String(b.registered));
        });
        return arr;
    }

    // La clasificación se pagina (en el overlay y en la pantalla
    // final) y cada fila es pulsable: abre el perfil con las fotos
    // que ha subido esa persona.
    let lbList = null;
    let lbPage = 1;
    const LB_PAGE_SIZE = 8;

    async function loadLeaderboard() {
        // Sin datos en memoria se muestra la carga una sola vez; con
        // datos ya cargados se pinta al instante para no parpadear.
        const cached = !!lbList;
        renderLeaderboard(!cached, false, false);
        try {
            const [uRes, gRes] = await Promise.all([fetch('/api/users'), fetch('/api/gallery')]);
            const users = uRes.ok ? await uRes.json() : [];
            const photos = gRes.ok ? await gRes.json() : [];
            lbList = buildRanking(
                Array.isArray(users) ? users : [],
                Array.isArray(photos) ? photos : []
            );
            // La primera p?gina es la que contiene tu puesto
            lbPage = 1;
            if (state.username) {
                const mine = normalizeName(state.username);
                const idx = lbList.findIndex(e => normalizeName(e.name) === mine);
                if (idx >= 0) lbPage = Math.floor(idx / LB_PAGE_SIZE) + 1;
            }
            renderLeaderboard(false, false, !cached);
        } catch (e) {
            renderLeaderboard(false, true, false);
        }
    }

    function renderLeaderboard(loading, error, animate) {
        const list = lbList;
        const mine = state.username ? normalizeName(state.username) : '';
        let html = '';
        let subtitle = 'Quién va primero en la gymkana';
        let pagerHtml = '';

        if (loading) {
            html = '<p class="lb-loading">Cargando clasificación…</p>';
        } else if (error) {
            html = '<p class="lb-empty">No se pudo cargar la clasificación.</p>';
        } else if (!list || list.length === 0) {
            html = '<p class="lb-empty">Todavía no hay participantes.</p>';
        } else {
            const pages = Math.max(1, Math.ceil(list.length / LB_PAGE_SIZE));
            if (lbPage > pages) lbPage = pages;
            if (lbPage < 1) lbPage = 1;
            const start = (lbPage - 1) * LB_PAGE_SIZE;

            let myRank = 0;
            list.forEach((e, i) => { if (mine && normalizeName(e.name) === mine) myRank = i + 1; });

            html = list.slice(start, start + LB_PAGE_SIZE).map((e, k) => {
                const i = start + k;
                const isMe = mine && normalizeName(e.name) === mine;
                const posCls = i < 3 ? ' pos-' + (i + 1) : '';
                const pct = Math.round((e.progress / CHALLENGES.length) * 100);
                const done = e.progress >= CHALLENGES.length;
                return `
                    <div class="lb-row ${isMe ? 'me' : ''}" data-name="${escapeHtml(e.name)}" role="button" tabindex="0" title="Ver el perfil de ${escapeHtml(e.name)}">
                        <span class="lb-pos${posCls}">${i + 1}</span>
                        <span class="lb-name">${escapeHtml(e.name)}${isMe ? '<span class="lb-you">TÚ</span>' : ''}</span>
                        <span class="lb-prog">${e.progress}/${CHALLENGES.length}${done ? ' · ✓' : ''}</span>
                        <span class="lb-bar"><i style="width:${pct}%"></i></span>
                    </div>
                `;
            }).join('');

            if (pages > 1) {
                pagerHtml = `
                    <button class="pager-btn" data-dir="prev" aria-label="Página anterior" ${lbPage === 1 ? 'disabled' : ''}>&lsaquo;</button>
                    <span class="pager-info">${lbPage} / ${pages}</span>
                    <button class="pager-btn" data-dir="next" aria-label="Página siguiente" ${lbPage === pages ? 'disabled' : ''}>&rsaquo;</button>
                `;
            }

            subtitle = (mine && myRank)
                ? `Tu puesto: ${myRank}º de ${list.length} · ${list.length} participantes`
                : (mine
                    ? `${list.length} participantes · tú todavía sin fotos`
                    : `${list.length} participantes`);
        }

        ['lb-list-overlay', 'lb-list-complete'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = html + (pagerHtml ? `<div class="party-pager lb-pager">${pagerHtml}</div>` : '');

            // Entrada de las filas: una sola vez y con fundido suave
            if (animate && !loading && !error) {
                el.classList.remove('lb-animate');
                void el.offsetWidth;
                el.classList.add('lb-animate');
                clearTimeout(el._lbAnimT);
                el._lbAnimT = setTimeout(() => el.classList.remove('lb-animate'), 900);
            }

            // Paginaci�n de la clasificaci�n
            el.querySelectorAll('.lb-pager .pager-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    lbPage += btn.dataset.dir === 'next' ? 1 : -1;
                    renderLeaderboard(false, false, true);
                });
            });
            // Tocar una fila abre el perfil de esa persona
            el.querySelectorAll('.lb-row[data-name]').forEach(row => {
                const open = () => openProfile(row.dataset.name);
                row.addEventListener('click', open);
                row.addEventListener('keydown', (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); }
                });
            });
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

    // ── PERFIL DE PARTICIPANTE ───────────────────────────────
    // Se abre tocando una fila de la clasificación: muestra sus
    // datos y todas las fotos que ha subido (toca una → grande)
    async function openProfile(name) {
        const modal = $('#profile-modal');
        if (!modal) return;
        const key = normalizeName(name);
        const photosBox = $('#profile-photos');
        // Acciones propias (descargar, clasificacion, salir) solo en mi perfil
        const isMe = !!state.username && key === normalizeName(state.username);
        const acts = $('#profile-actions');
        if (acts) acts.hidden = !isMe;
        const sumBtn = $('#profile-summary');
        if (sumBtn) sumBtn.hidden = !(isMe && state.completedChallenges.length >= CHALLENGES.length);

        $('#profile-name').textContent = name;
        $('#profile-avatar').textContent = (String(name).trim().charAt(0) || '?').toUpperCase();
        $('#profile-meta').textContent = 'Cargando…';
        $('#profile-bar-fill').style.width = '0%';
        $('#profile-photos-title').textContent = `Fotos de ${name}`;
        photosBox.innerHTML = '<p class="lb-loading">Cargando fotos…</p>';
        modal.classList.add('active');

        try {
            // Reutiliza la galería ya cargada; si no, la trae ahora
            let photos = partyPhotos;
            if (!photos || photos.length === 0) {
                const res = await fetch('/api/gallery');
                const data = res.ok ? await res.json() : [];
                photos = Array.isArray(data) ? data : [];
                partyPhotos = photos;
            }
            const mine = photos.filter(p => (normalizeName(p.user) || 'invitado') === key);

            const entry = lbList ? lbList.find(e => normalizeName(e.name) === key) : null;
            const progress = entry ? entry.progress : null;
            $('#profile-meta').textContent = (progress != null
                ? `${mine.length} ${mine.length === 1 ? 'foto subida' : 'fotos subidas'} · ${progress}/${CHALLENGES.length} retos`
                : `${mine.length} ${mine.length === 1 ? 'foto subida' : 'fotos subidas'}`);
            $('#profile-bar-fill').style.width =
                (progress != null ? Math.round((progress / CHALLENGES.length) * 100) : 0) + '%';

            if (mine.length === 0) {
                photosBox.innerHTML = '<p class="lb-empty">Todavía no ha subido fotos.</p>';
                return;
            }
            photosBox.innerHTML = mine.map((p, k) => {
                const i = partyPhotos.indexOf(p);
                const ch = p.reto != null ? CHALLENGES.find(c => c.id === p.reto) : null;
                return `
                    <figure class="party-photo" data-i="${i}" style="animation-delay:${(k * 0.045).toFixed(3)}s">
                        <img src="${escapeHtml(thumbUrl(p.thumb || p.url))}" alt="${escapeHtml(ch ? ch.title : 'Foto')}" ${IMG_ATTRS}>
                        <figcaption class="party-badge">${ch ? escapeHtml(ch.title) : 'Foto'}</figcaption>
                    </figure>
                `;
            }).join('');
            photosBox.querySelectorAll('.party-photo').forEach(fig => {
                fig.addEventListener('click', () => {
                    const photo = partyPhotos[parseInt(fig.dataset.i, 10)];
                    openLightbox(photo, mine);
                });
            });
        } catch (e) {
            photosBox.innerHTML = '<p class="lb-empty">No se pudieron cargar las fotos.</p>';
        }
    }

    function closeProfile() {
        const m = $('#profile-modal');
        if (m) m.classList.remove('active');
    }

    // ── CONFETTI ─────────────────────────────────────────────
    function createConfetti() {
        const container = $('#confetti-container');
        container.innerHTML = '';
        const colors = ['#b8956a', '#ffffff', '#f7bcd2', '#f4c2c2', '#d4c5f9'];

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
