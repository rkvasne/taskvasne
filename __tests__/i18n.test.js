/**
 * @jest-environment jsdom
 */

// Mock localStorage
global.localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  removeItem(key) {
    delete this.data[key];
  },
  clear() {
    this.data = {};
  }
};

describe('i18n Module', () => {
  let i18n;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear module cache and re-import
    jest.resetModules();
    
    // Require the i18n module fresh
    require('../i18n.js');
    i18n = window.i18n;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    test('should default to pt-BR language', () => {
      expect(i18n.getLanguage()).toBe('pt-BR');
    });

    test('should load language from localStorage if available', () => {
      // Set language before loading module
      localStorage.setItem('taskvasne-language', 'en');
      
      // Clear and reload module
      jest.resetModules();
      require('../i18n.js');
      const newI18n = window.i18n;
      
      expect(newI18n.getLanguage()).toBe('en');
    });
  });

  describe('Translation (t method)', () => {
    test('should translate simple keys in PT-BR', () => {
      expect(i18n.t('loading')).toBe('Carregando...');
      expect(i18n.t('stop')).toBe('Parar');
    });

    test('should translate simple keys in EN', () => {
      i18n.setLanguage('en');
      expect(i18n.t('loading')).toBe('Loading...');
      expect(i18n.t('stop')).toBe('Stop');
    });

    test('should interpolate parameters', () => {
      expect(i18n.t('pid', { pid: 1234 })).toBe('PID: 1234');
      expect(i18n.t('openPort', { port: 3000 })).toBe('Abrir http://localhost:3000');
    });

    test('should interpolate parameters in EN', () => {
      i18n.setLanguage('en');
      expect(i18n.t('pid', { pid: 5678 })).toBe('PID: 5678');
      expect(i18n.t('openPort', { port: 8080 })).toBe('Open http://localhost:8080');
    });

    test('should return key if translation not found', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
    });
  });

  describe('setLanguage', () => {
    test('should change language to EN', () => {
      i18n.setLanguage('en');
      expect(i18n.getLanguage()).toBe('en');
      expect(i18n.t('loading')).toBe('Loading...');
    });

    test('should persist language to localStorage', () => {
      i18n.setLanguage('en');
      expect(localStorage.getItem('taskvasne-language')).toBe('en');
    });

    test('should fallback to pt-BR for unsupported languages', () => {
      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      i18n.setLanguage('fr');
      expect(i18n.getLanguage()).toBe('pt-BR');
      expect(warnSpy).toHaveBeenCalledWith("Language 'fr' not supported, falling back to pt-BR");
      
      warnSpy.mockRestore();
    });

    test('should dispatch languageChanged event', (done) => {
      window.addEventListener('languageChanged', (event) => {
        expect(event.detail.lang).toBe('en');
        done();
      });

      i18n.setLanguage('en');
    });
  });

  describe('getAvailableLanguages', () => {
    test('should return array of available languages', () => {
      const languages = i18n.getAvailableLanguages();
      expect(languages).toHaveLength(2);
      expect(languages).toEqual([
        { code: 'pt-BR', name: 'Português (Brasil)' },
        { code: 'en', name: 'English' }
      ]);
    });
  });

  describe('Coverage of all keys', () => {
    const requiredKeys = [
      'loading', 'loadingError', 'noPortsFound', 'unknown',
      'openPort', 'processName', 'pid', 'stopProcess', 'stop',
      'refresh', 'about', 'quit', 'errorKillingProcess',
      'aboutTitle', 'version', 'aboutDescription', 'developedBy',
      'website', 'github', 'linkedin', 'closeAbout'
    ];

    test('all required keys exist in PT-BR', () => {
      requiredKeys.forEach(key => {
        expect(i18n.t(key)).not.toBe(key); // Should not return key itself
      });
    });

    test('all required keys exist in EN', () => {
      i18n.setLanguage('en');
      requiredKeys.forEach(key => {
        expect(i18n.t(key)).not.toBe(key); // Should not return key itself
      });
    });
  });
});
