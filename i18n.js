/**
 * Internationalization (i18n) module for Taskvasne
 * Supports runtime language switching between PT-BR and EN
 * 
 * Usage:
 * import i18n from './i18n.js';
 * i18n.setLanguage('en');
 * console.log(i18n.t('loading')); // "Loading..."
 * 
 * @module i18n
 */

/* global localStorage, CustomEvent */

const translations = {
  'pt-BR': {
    // Loading states
    loading: 'Carregando...',
    loadingError: 'Erro ao carregar',
    
    // Empty states
    noPortsFound: 'Nenhuma porta ativa encontrada (acima de 1000)',
    unknown: 'Desconhecido',
    
    // Port item
    openPort: 'Abrir http://localhost:{{port}}',
    processName: 'Nome do Processo',
    pid: 'PID: {{pid}}',
    
    // Actions
    stopProcess: 'Parar Processo',
    stop: 'Parar',
    refresh: 'Atualizar',
    about: 'Sobre',
    quit: 'Sair',
    
    // Errors
    errorKillingProcess: 'Erro ao parar processo',
    
    // About window
    aboutTitle: 'Taskvasne',
    version: 'Versão',
    aboutDescription: 'Gerenciador de portas minimalista para Windows.',
    developedBy: 'Desenvolvido com ☕ por Raphael Kvasne.',
    website: 'Website',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    closeAbout: 'Fechar',
    
    // Settings
    language: 'Idioma',
    theme: 'Tema',
    autoRefresh: 'Atualização Automática',
    refreshInterval: 'Intervalo de Atualização',
    seconds: 'segundos'
  },
  
  en: {
    // Loading states
    loading: 'Loading...',
    loadingError: 'Error loading',
    
    // Empty states
    noPortsFound: 'No active ports found (above 1000)',
    unknown: 'Unknown',
    
    // Port item
    openPort: 'Open http://localhost:{{port}}',
    processName: 'Process Name',
    pid: 'PID: {{pid}}',
    
    // Actions
    stopProcess: 'Stop Process',
    stop: 'Stop',
    refresh: 'Refresh',
    about: 'About',
    quit: 'Quit',
    
    // Errors
    errorKillingProcess: 'Error stopping process',
    
    // About window
    aboutTitle: 'Taskvasne',
    version: 'Version',
    aboutDescription: 'Minimalist port manager for Windows.',
    developedBy: 'Developed with ☕ by Raphael Kvasne.',
    website: 'Website',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    closeAbout: 'Close',
    
    // Settings
    language: 'Language',
    theme: 'Theme',
    autoRefresh: 'Auto Refresh',
    refreshInterval: 'Refresh Interval',
    seconds: 'seconds'
  }
};

class I18n {
  constructor() {
    // Load saved language or default to PT-BR
    this.currentLanguage = localStorage.getItem('taskvasne-language') || 'pt-BR';
  }

  /**
   * Get translation for a key with optional parameters
   * @param {string} key - Translation key
   * @param {Object} params - Optional parameters for interpolation
   * @returns {string} Translated string
   * @example
   * i18n.t('pid', { pid: 1234 }) // "PID: 1234"
   */
  t(key, params = {}) {
    let translation = translations[this.currentLanguage]?.[key] || key;
    
    // Replace {{param}} placeholders
    Object.keys(params).forEach(param => {
      translation = translation.replace(`{{${param}}}`, params[param]);
    });
    
    return translation;
  }

  /**
   * Set current language and persist to localStorage
   * @param {string} lang - Language code ('pt-BR' or 'en')
   * @returns {void}
   */
  setLanguage(lang) {
    if (!translations[lang]) {
      console.warn(`Language '${lang}' not supported, falling back to pt-BR`);
      lang = 'pt-BR';
    }
    
    this.currentLanguage = lang;
    localStorage.setItem('taskvasne-language', lang);
    
    // Dispatch custom event for UI to react
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  }

  /**
   * Get current language code
   * @returns {string} Current language code
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get list of available languages
   * @returns {Array<{code: string, name: string}>}
   */
  getAvailableLanguages() {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en', name: 'English' }
    ];
  }
}

// Singleton instance
const i18n = new I18n();

// Export for ES6 modules (when migrating to modules)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}

// Also export to window for immediate use
window.i18n = i18n;
