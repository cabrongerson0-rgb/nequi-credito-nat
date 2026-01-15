/**
 * Módulo de Overlay para mostrar estados de carga y espera
 * Singleton Pattern para garantizar una única instancia
 * @module Overlay
 */

const OverlayManager = (() => {
  let instance = null;
  let overlayElement = null;
  let isVisible = false;
  let currentTimeout = null;

  /**
   * Crea la estructura DOM del overlay
   */
  const createOverlayElement = () => {
    const overlay = document.createElement('div');
    overlay.id = 'app-overlay';
    overlay.className = 'app-overlay';
    overlay.innerHTML = `
      <div class="overlay-content">
        <div class="overlay-spinner">
          <div class="overlay-logo">
            <img src="assets/nequi-logo.webp" alt="Nequi">
          </div>
        </div>
        <p class="overlay-message">Procesando...</p>
        <div class="overlay-progress-bar">
          <div class="progress-bar-fill"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  };

  /**
   * Inicializa el overlay
   */
  const init = () => {
    if (!overlayElement) {
      overlayElement = createOverlayElement();
    }
  };

  /**
   * Muestra el overlay con un mensaje personalizado
   * @param {Object} options - Opciones de configuración
   * @param {string} options.message - Mensaje a mostrar
   * @param {number} options.timeout - Tiempo máximo de espera (ms)
   * @param {Function} options.onTimeout - Callback cuando se agota el tiempo
   */
  const show = (options = {}) => {
    init();

    const {
      message = AppConfig.overlay.messages.loading,
      timeout = AppConfig.overlay.defaultTimeout,
      onTimeout = null,
      showProgress = true,
    } = options;

    // Actualizar mensaje
    const messageElement = overlayElement.querySelector('.overlay-message');
    if (messageElement) {
      messageElement.textContent = message;
    }

    // Mostrar/ocultar barra de progreso
    const progressBar = overlayElement.querySelector('.overlay-progress-bar');
    if (progressBar) {
      progressBar.style.display = showProgress ? 'block' : 'none';
    }

    // Mostrar overlay con animación
    overlayElement.classList.add('active');
    isVisible = true;

    // Configurar timeout si se especifica
    if (timeout > 0) {
      clearTimeout(currentTimeout);
      currentTimeout = setTimeout(() => {
        hide();
        if (onTimeout && typeof onTimeout === 'function') {
          onTimeout();
        }
      }, timeout);
    }

    // Animar barra de progreso
    if (showProgress && timeout > 0) {
      animateProgressBar(timeout);
    }
  };

  /**
   * Anima la barra de progreso
   * @param {number} duration - Duración de la animación
   */
  const animateProgressBar = (duration) => {
    const progressFill = overlayElement.querySelector('.progress-bar-fill');
    if (progressFill) {
      progressFill.style.transition = `width ${duration}ms linear`;
      progressFill.style.width = '100%';
    }
  };

  /**
   * Oculta el overlay
   * @param {number} delay - Retraso antes de ocultar (ms)
   */
  const hide = (delay = 0) => {
    clearTimeout(currentTimeout);

    const hideAction = () => {
      if (overlayElement) {
        overlayElement.classList.remove('active');
        isVisible = false;

        // Reset progress bar
        const progressFill = overlayElement.querySelector('.progress-bar-fill');
        if (progressFill) {
          progressFill.style.transition = 'none';
          progressFill.style.width = '0%';
        }
      }
    };

    if (delay > 0) {
      setTimeout(hideAction, delay);
    } else {
      hideAction();
    }
  };

  /**
   * Actualiza el mensaje del overlay sin ocultarlo
   * @param {string} message - Nuevo mensaje
   */
  const updateMessage = (message) => {
    if (overlayElement && isVisible) {
      const messageElement = overlayElement.querySelector('.overlay-message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  };

  /**
   * Muestra un mensaje de éxito y oculta después de un tiempo
   * @param {string} message - Mensaje de éxito
   * @param {number} duration - Duración antes de ocultar (ms)
   */
  const showSuccess = (message = AppConfig.overlay.messages.success, duration = 2000) => {
    show({
      message,
      timeout: 0,
      showProgress: false,
    });

    const spinner = overlayElement.querySelector('.overlay-spinner');
    if (spinner) {
      spinner.innerHTML = `
        <svg class="success-icon" viewBox="0 0 52 52">
          <circle class="success-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
        </svg>
      `;
    }

    hide(duration);
  };

  /**
   * Muestra un mensaje de error y oculta después de un tiempo
   * @param {string} message - Mensaje de error
   * @param {number} duration - Duración antes de ocultar (ms)
   */
  const showError = (message = AppConfig.overlay.messages.error, duration = 3000) => {
    show({
      message,
      timeout: 0,
      showProgress: false,
    });

    const spinner = overlayElement.querySelector('.overlay-spinner');
    if (spinner) {
      spinner.innerHTML = `
        <svg class="error-icon" viewBox="0 0 52 52">
          <circle class="error-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="error-x" fill="none" d="M16 16 36 36 M36 16 16 36"/>
        </svg>
      `;
    }

    hide(duration);
  };

  /**
   * Verifica si el overlay está visible
   * @returns {boolean}
   */
  const isOverlayVisible = () => isVisible;

  /**
   * Destruye el overlay
   */
  const destroy = () => {
    clearTimeout(currentTimeout);
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement);
      overlayElement = null;
      isVisible = false;
    }
  };

  // Singleton: retornar única instancia
  return {
    show,
    hide,
    updateMessage,
    showSuccess,
    showError,
    isVisible: isOverlayVisible,
    destroy,
  };
})();

// Exportar para uso modular
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayManager;
}
