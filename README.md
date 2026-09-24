# Gymkana Fotográfica 💒📷

Web de retos fotográficos para invitados de la boda: cada invitado se registra con su nombre, completa retos (fotos temáticas), las sube desde el móvil y puede descargar todas las fotos al final.

## Estructura

```
/
├── index.html      # SPA con 4 pantallas: bienvenida, retos, detalle y completado
├── styles.css      # Estilos (tema oscuro, efecto glass, fondo con ruido)
├── app.js          # Lógica: carousel de retos, cámara/galería, subida y galería final
├── config.js       # Configuración de Cloudinary (cloud name y upload preset)
├── fondo1-3.jpg    # Imágenes de fondo
└── api/
    └── sync.js     # Función serverless: recupera las fotos de un usuario desde Cloudinary
```

## Cómo funciona

- **Subida de fotos**: directamente desde el navegador a [Cloudinary](https://cloudinary.com) (preset *unsigned*), etiquetadas con el nombre del usuario y el número de reto.
- **Progreso**: se guarda en `localStorage` y se sincroniza con `/api/sync?username=...` para recuperar las fotos ya enviadas desde cualquier dispositivo.

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
