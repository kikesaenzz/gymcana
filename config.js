// ============================================================
// CONFIGURACIÓN DE CLOUDINARY
// ============================================================
// 1. Crea una cuenta gratis en https://cloudinary.com
// 2. En el Dashboard copia tu "Cloud name", "API Key" y "API Secret"
// 3. Crea un FOLDER llamado "gymkana-boda" en Media Library
// ============================================================

const CLOUDINARY_CONFIG = {
  cloudName: 'zzbvccrl',            // Cloud Name de tu cuenta
  uploadPreset: 'gymkana_boda',     // Debe ser unsigned (en Settings > Upload)
  folder: 'gymkana-boda',           // Folder donde se guardan las fotos
};

// ============================================================
// EVENTO POR DEFECTO (multi-boda)
// Cada boda tiene su propia URL, sus datos y sus fotos:
//   https://tudominio.com/boda/ana-y-carlos
//   https://tudominio.com/?event=ana-y-carlos
// Si no llega ningún evento en la URL se usa este.
// ============================================================
const APP_CONFIG = {
  defaultEvent: 'boda',
  defaultEventLabel: 'Nuestra Boda',
};

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CLOUDINARY_CONFIG, APP_CONFIG };
}
