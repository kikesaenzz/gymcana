# Gymkana Fotográfica 💒📷

Web de retos fotográficos para invitados de la boda: cada invitado se registra con su nombre, completa retos (fotos temáticas), las sube desde el móvil y puede descargar todas las fotos al final.

## Estructura

```
/
├── index.html        # SPA: bienvenida, retos, detalle, completado + galería global
├── styles.css        # Estilos (tema oscuro, efecto glass, fondo con ruido)
├── app.js            # Lógica: retos, cámara/galería, subida, galería y registro
├── config.js         # Configuración de Cloudinary (cloud name y upload preset)
├── anillos.png       # Favicon e imagen de los anillos en la bienvenida
├── invitados.html    # Página privada: lista de invitados + descarga Excel (CSV)
├── fondo1-4.jpg      # Imágenes de fondo
└── api/
    ├── sync.js       # Fotos de un usuario (busca por etiqueta normalizada)
    ├── gallery.js    # Galería global: todas las fotos + quién las subió
    ├── register.js   # Registro de invitados (uno por fichero en Cloudinary)
    └── users.js      # Lista de invitados registrados
```

## Cómo funciona

- **Nombres normalizados**: el nombre se guarda en minúsculas y sin acentos para etiquetas, carpeta y sincronización, de modo que "Ana", "ana" y "ANA" son el mismo invitado (en pantalla se muestra el nombre original).
- **Registro de invitados**: al pulsar "Empezar" se llama a `POST /api/register`; cada invitado tiene su fichero en Cloudinary (`gymkana-boda/registry/<nombre>`). La lista está en `invitados.html` (URL privada, sin enlace desde la web).
- **Subida de fotos**: directamente desde el navegador a [Cloudinary](https://cloudinary.com) (preset *unsigned*), etiquetadas con el nombre normalizado y el número de reto; el contexto guarda el nombre original para mostrarlo en la galería.
- **Progreso**: se guarda en `localStorage` y se sincroniza con `/api/sync?username=...` para recuperar las fotos ya enviadas desde cualquier dispositivo.
- **Galería de la fiesta**: al terminar los 14 retos se muestra la galería global (`GET /api/gallery`) con todas las fotos, paginadas (12 por página) y quién las subió.
- **Clasificación en vivo**: botón 🏆 en la cabecera (y sección al final de la web) con el ranking: primero quien lleve más retos y, a igualdad, quien lo haya hecho antes; tu fila va resaltada con tu puesto.
- **Descarga en ZIP**: «Descargar todas» o las seleccionadas genera un `gymkana-fotografica.zip` (JSZip), porque el atributo `download` no funciona con URLs de Cloudinary.
- **Nombre protegido**: si el nombre ya está registrado se pide confirmación («¿Seguro que eres tú?») y la primera vez aparece la pista «pon un nombre identificativo».

## Variables de entorno (Vercel)

`api/sync.js` necesita estas variables en *Project Settings → Environment Variables*:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

## Despliegue

El proyecto está conectado a GitHub: cada `push` a `main` despliega automáticamente en Vercel.

```bash
git add .
git commit -m "Descripción del cambio"
git push
```
