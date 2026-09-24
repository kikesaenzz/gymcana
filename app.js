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

    // ── INIT ─────────────────────────────────────────────────
    function init() {
        bindEvents();
    }

    // ── PERSISTENCE ──────────────────────────────────────────
    function loadState() {
        try {
            if (state.username) {
                const saved = localStorage.getItem(STORAGE_PREFIX + state.username);
                if (saved) state = { ...state, ...JSON.parse(saved) };
            }
        } catch (e) {}
    }

    function saveState() {
        try {
            if (state.username) {
                localStorage.setItem(STORAGE_PREFIX + state.username, JSON.stringify({
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
            const res = await fetch(`/api/sync?username=${encodeURIComponent(state.username)}`);
            if (!res.ok) return;
            const data = await res.json();
            if (!data.resources || data.resources.length === 0) return;

            data.resources.forEach(r => {
                const tags = r.tags || [];
                let challengeId = null;

                for (const tag of tags) {
                    const match = tag.match(/^reto_(\d+)$/);
                    if (match) {
                        challengeId = parseInt(match[1]);
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

        btnStart.addEventListener('click', async () => {
            const name = usernameInput.value.trim();
            if (name.length < 2) return;
            state.username = name;
            loadState();
            state.username = name;
            await syncFromCloud();
            saveState();
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

        $('#btn-back').addEventListener('click', () => navigateTo('challenges'));

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
            navigateTo('challenges');
            renderCarousel();
        });

        $('#btn-download-all').addEventListener('click', () => {
            const allIds = CHALLENGES.filter(c => state.photos[c.id]).map(c => c.id);
            downloadPhotos(allIds);
        });

        $('#btn-select-download').addEventListener('click', () => {
            toggleSelectMode();
        });
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

        // Scroll to current card
        const currentCard = track.querySelector('.carousel-card.current');
        if (currentCard) {
            setTimeout(() => {
                const wrapper = track.parentElement;
                const wrapperCenter = wrapper.offsetWidth / 2;
                const cardCenter = currentCard.offsetLeft + currentCard.offsetWidth / 2;
                wrapper.scrollTo({
                    left: cardCenter - wrapperCenter,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Scroll listener for dots
        track.addEventListener('scroll', function onScroll() {
            const wrapper = track.parentElement;
            const wrapperCenter = wrapper.offsetWidth / 2;
            const cards = track.querySelectorAll('.carousel-card');
            const dots = dotsContainer.querySelectorAll('.carousel-dot');

            let closestIdx = 0;
            let closestDist = Infinity;

            cards.forEach(function(card, i) {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const dist = Math.abs(cardCenter - wrapper.scrollLeft - wrapperCenter);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIdx = i;
                }
            });

            dots.forEach(function(d, i) { d.classList.toggle('active', i === closestIdx); });
        });

        // Mouse wheel scrolls carousel horizontally
        track.addEventListener('wheel', function(e) {
            e.preventDefault();
            track.scrollLeft += e.deltaY * 2;
        }, { passive: false });

        // Click on card centers it, then opens if current
        track.querySelectorAll('.carousel-card').forEach(function(card) {
            card.addEventListener('click', function() {
                var id = parseInt(card.dataset.id);
                var challenge = CHALLENGES.find(function(c) { return c.id === id; });
                var isCompleted = state.completedChallenges.includes(id);
                var isCurrent = nextChallenge && nextChallenge.id === id;

                // Always center the card on click
                var cardCenter = card.offsetLeft + card.offsetWidth / 2;
                var wrapperCenter = track.offsetWidth / 2;
                track.scrollTo({
                    left: cardCenter - wrapperCenter,
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
        const folderPath = `gymkana-boda/${state.username}`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', folderPath);
        formData.append('tags', `gymkana,boda,${state.username},reto_${challengeId}`);
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
                setTimeout(() => showCompleteScreen(), 800);
            } else {
                setTimeout(() => {
                    const nextChallenge = CHALLENGES.find(c => !state.completedChallenges.includes(c.id));
                    if (nextChallenge) {
                        navigateTo('challenges');
                        renderCarousel();
                        setTimeout(() => openChallenge(nextChallenge), 300);
                    }
                }, 1000);
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
        renderCompleteGallery();
    }

    function toggleSelectMode() {
        isSelectMode = !isSelectMode;
        selectedPhotos.clear();
        const btn = $('#btn-select-download');
        if (isSelectMode) {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Descargar seleccionadas (${selectedPhotos.size})`;
            $('#btn-download-all').style.display = 'none';
        } else {
            btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Seleccionar fotos`;
            $('#btn-download-all').style.display = '';
        }
        renderCompleteGallery();
    }

    async function downloadPhotos(ids) {
        for (const id of ids) {
            const photo = state.photos[id];
            if (!photo) continue;
            const link = document.createElement('a');
            link.href = photo.url;
            link.download = photo.fileName || `reto_${id}.jpg`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(r => setTimeout(r, 300));
        }
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
