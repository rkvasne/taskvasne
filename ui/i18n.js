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
        developedBy: 'Desenvolvido por Raphael Kvasne.',
        website: 'Website',
        github: 'GitHub',
        linkedin: 'LinkedIn',
        closeAbout: 'Fechar',

        // Settings
        language: 'Idioma',
        theme: 'Tema',
        autoRefresh: 'Atualização Automática',
        refreshInterval: 'Intervalo de Atualização',
        seconds: 'segundos',

        // Tabs & New Features
        tabPorts: 'Portas',
        tabUnlocker: 'Desbloquear Pasta',
        openFolder: 'Abrir pasta do projeto',
        killAllDev: 'Parar Todos Dev',
        killAllDevConfirm:
            'Deseja realmente encerrar todos os {{count}} processos de desenvolvimento?',
        copied: 'Copiado!',
        unlockerTitle: 'Desbloqueador de Pastas e Arquivos',
        unlockerSubtitle: 'Descubra e encerre processos que impedem renomear ou excluir pastas.',
        unlockerPlaceholder: 'Cole o caminho da pasta (ex: D:\\projetos\\meu-app)...',
        inspect: 'Inspecionar',
        paste: 'Colar',
        unlockAll: 'Liberar Pasta (Encerrar Todos)',
        noLocksFound:
            'Nenhum processo está bloqueando este caminho. Pasta livre para renomear/excluir!',
        locksFoundCount: '{{count}} processo(s) bloqueando este caminho',
        lockTypeCwd: 'Diretório de Trabalho (CWD)',
        lockTypeHandle: 'Handle de Arquivo Aberto',
        releaseSuccess: 'Pasta liberada com sucesso!',
        releaseError: 'Erro ao liberar pasta',
        systemProcessWarning: 'Atenção: Processo do Sistema',

        // Table headers
        colPort: 'Porta',
        colProcess: 'Processo',
        colCategory: 'Tipo',
        colPid: 'PID',
        colActions: 'Ação',

        // Context Menu & Export
        copyUrl: 'Copiar URL',
        copyCurl: 'Copiar como cURL',
        openInVsCode: 'Abrir no VS Code',
        openInTerminal: 'Abrir no Terminal',
        openFolderContext: 'Abrir Pasta no Explorer',
        killTree: 'Encerrar Árvore de Processos',
        killTreeConfirm:
            'Deseja encerrar este processo e todos os seus subprocessos (PID {{pid}})?',
        killAdmin: 'Encerrar como Administrador (UAC)',
        killAdminConfirm:
            'Deseja solicitar privilégios de Administrador (UAC) para forçar o encerramento do processo {{pid}}?',
        exportTitle: 'Exportar',
        exportMarkdown: 'Copiar Tabela (Markdown)',
        exportEnv: 'Copiar Variáveis (.env.local)',
        exportSuccess: 'Copiado para a área de transferência!',
        probeStatus: 'Status: {{status}} ({{rtt}}ms)',
        moreActions: 'Mais ações',

        // Zombies & Sharing
        orphanBadge: 'Zumbi',
        killOrphans: 'Limpar Zumbis',
        killOrphansConfirm:
            'Deseja encerrar os {{count}} processos zumbis/órfãos de desenvolvimento?',
        shareNetwork: 'Compartilhar na Rede (Wi-Fi)',
        shareNetworkTitle: 'Compartilhar no Celular / Wi-Fi',
        shareNetworkDesc:
            'Acesse pelo celular ou outros dispositivos conectados na mesma rede local:',
        qrScan: 'Escaneie o QR Code com a câmera do celular:',
        networkIpError: 'Não foi possível detectar o IP da rede local'
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
        developedBy: 'Developed by Raphael Kvasne.',
        website: 'Website',
        github: 'GitHub',
        linkedin: 'LinkedIn',
        closeAbout: 'Close',

        // Settings
        language: 'Language',
        theme: 'Theme',
        autoRefresh: 'Auto Refresh',
        refreshInterval: 'Refresh Interval',
        seconds: 'seconds',

        // Tabs & New Features
        tabPorts: 'Ports',
        tabUnlocker: 'Unlock Folder',
        openFolder: 'Open project folder',
        killAllDev: 'Stop All Dev',
        killAllDevConfirm: 'Do you really want to terminate all {{count}} development processes?',
        copied: 'Copied!',
        unlockerTitle: 'Folder & File Unlocker',
        unlockerSubtitle: 'Find and kill processes preventing folder rename or deletion.',
        unlockerPlaceholder: 'Paste folder or file path (e.g. D:\\projects\\my-app)...',
        inspect: 'Inspect',
        paste: 'Paste',
        unlockAll: 'Release Folder (Kill All)',
        noLocksFound: 'No processes locking this path. Folder is free to rename/delete!',
        locksFoundCount: '{{count}} process(es) locking this path',
        lockTypeCwd: 'Working Directory (CWD)',
        lockTypeHandle: 'Open File Handle',
        releaseSuccess: 'Folder released successfully!',
        releaseError: 'Error releasing folder',
        systemProcessWarning: 'Warning: System Process',

        // Table headers
        colPort: 'Port',
        colProcess: 'Process',
        colCategory: 'Type',
        colPid: 'PID',
        colActions: 'Action',

        // Context Menu & Export
        copyUrl: 'Copy URL',
        copyCurl: 'Copy as cURL',
        openInVsCode: 'Open in VS Code',
        openInTerminal: 'Open in Terminal',
        openFolderContext: 'Open Folder in Explorer',
        killTree: 'Kill Process Tree',
        killTreeConfirm:
            'Do you really want to terminate this process and all its subprocesses (PID {{pid}})?',
        killAdmin: 'Stop as Administrator (UAC)',
        killAdminConfirm:
            'Do you want to request Administrator privileges (UAC) to force stop process {{pid}}?',
        exportTitle: 'Export',
        exportMarkdown: 'Copy Table (Markdown)',
        exportEnv: 'Copy Variables (.env.local)',
        exportSuccess: 'Copied to clipboard!',
        probeStatus: 'Status: {{status}} ({{rtt}}ms)',
        moreActions: 'More actions',

        // Zombies & Sharing
        orphanBadge: 'Zombie',
        killOrphans: 'Kill Zombies',
        killOrphansConfirm: 'Do you really want to terminate {{count}} orphaned dev processes?',
        shareNetwork: 'Share on Local Network (Wi-Fi)',
        shareNetworkTitle: 'Share to Mobile / Local Wi-Fi',
        shareNetworkDesc:
            'Access from your phone or other devices connected to the same local network:',
        qrScan: 'Scan the QR Code with your phone camera:',
        networkIpError: 'Could not detect local network IP'
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
