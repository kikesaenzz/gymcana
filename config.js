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

// Export para uso como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CLOUDINARY_CONFIG;
}
