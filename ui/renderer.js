// Configuration Constants
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds - sync with README documentation
const ANIMATION_DURATION = 300; // 300ms - sync with CSS transition duration

const listElement = document.getElementById('port-list');
const refreshBtn = document.getElementById('refresh');
const aboutBtn = document.getElementById('about');
const quitBtn = document.getElementById('quit');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about');
const statusBanner = document.getElementById('status-banner');
const closeStatusBtn = document.getElementById('close-status');
const categoryFilters = document.getElementById('category-filters');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');

let allPorts = [];
let activeCategory = 'all';
let searchQuery = '';

// Auto-hide status banner after 6 seconds
if (statusBanner) {
    setTimeout(() => {
        statusBanner.classList.add('fade-out');
        setTimeout(() => {
            statusBanner.style.display = 'none';
        }, 500);
    }, 6000);

    if (closeStatusBtn) {
        closeStatusBtn.addEventListener('click', () => {
            statusBanner.style.display = 'none';
        });
    }
}

// Category filter buttons
if (categoryFilters) {
    categoryFilters.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            categoryFilters
                .querySelectorAll('.filter-pill')
                .forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeCategory = pill.dataset.category || 'all';
            renderFilteredPorts();
        });
    });

    categoryFilters.addEventListener(
        'wheel',
        e => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                categoryFilters.scrollLeft += e.deltaY;
            }
        },
        { passive: false }
    );
}

// Search input handling
if (searchInput) {
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        if (clearSearchBtn) {
            if (searchQuery.length > 0) {
                clearSearchBtn.classList.remove('hidden');
            } else {
                clearSearchBtn.classList.add('hidden');
            }
        }
        renderFilteredPorts();
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchQuery = '';
            if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
            renderFilteredPorts();
        }
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderFilteredPorts();
    });
}

/**
 * Helper to invoke Tauri IPC safely
 * @param {string} cmd
 * @param {Object} args
 * @returns {Promise<any>}
 */
async function tauriInvoke(cmd, args = {}) {
    if (window.__TAURI__ && window.__TAURI__.core) {
        return await window.__TAURI__.core.invoke(cmd, args);
    }
    if (window.__TAURI_INTERNALS__) {
        return await window.__TAURI_INTERNALS__.invoke(cmd, args);
    }
    throw new Error('Tauri API indisponível');
}

/**
 * Updates count indicators on category filter pills
 * @param {Array<Object>} ports
 */
function updateCategoryCounts(ports) {
    const counts = {
        all: ports.length,
        dev: 0,
        database: 0,
        app: 0,
        system: 0
    };

    ports.forEach(p => {
        const cat = p.Category || 'app';
        if (counts[cat] !== undefined) {
            counts[cat]++;
        }
    });

    Object.keys(counts).forEach(key => {
        const el = document.getElementById(`count-${key}`);
        if (el) {
            el.textContent = counts[key];
        }
    });
}

/**
 * Loads and displays the list of active ports
 * Shows loading state only if list is empty to avoid flicker
 * @async
 * @returns {Promise<void>}
 */
async function loadPorts() {
    if (listElement.children.length === 0) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('loading')}</div>`;
    }

    try {
        const ports = await tauriInvoke('get_ports');
        allPorts = ports || [];
        updateCategoryCounts(allPorts);
        renderFilteredPorts();
    } catch (error) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('loadingError')}: ${error}</div>`;
    }
}

/**
 * Filters allPorts by activeCategory and searchQuery, then renders
 */
function renderFilteredPorts() {
    let filtered = allPorts;

    if (activeCategory !== 'all') {
        filtered = filtered.filter(p => (p.Category || 'app') === activeCategory);
    }

    if (searchQuery) {
        const cleanQuery = searchQuery.startsWith(':') ? searchQuery.slice(1) : searchQuery;
        filtered = filtered.filter(p => {
            const portStr = String(p.LocalPort);
            const portMatch = portStr.includes(cleanQuery) || `:${portStr}`.includes(searchQuery);
            const nameMatch = (p.ProcessName || '').toLowerCase().includes(searchQuery);
            const projMatch = (p.ProjectName || '').toLowerCase().includes(searchQuery);
            const detailsMatch = (p.Details || '').toLowerCase().includes(searchQuery);
            const cmdMatch = (p.CommandLine || '').toLowerCase().includes(searchQuery);
            return portMatch || nameMatch || projMatch || detailsMatch || cmdMatch;
        });
    }

    renderPorts(filtered);
}

/**
 * Renders the ports list in the UI
 * @param {Array<{LocalPort: number, PID: number, ProcessName: string, ProjectName?: string, Details?: string, CommandLine?: string, Category?: string}>} ports - Array of port objects
 * @returns {void}
 */
function renderPorts(ports) {
    const headerTitle = document.querySelector('.header .title');
    if (headerTitle) {
        const badgeCount = searchQuery
            ? `${ports.length}/${allPorts.length}`
            : `${allPorts.length}`;
        headerTitle.innerHTML = `Taskvasne <span class="active-count-badge" title="Portas ativas">${badgeCount}</span>`;
    }

    if (!ports || ports.length === 0) {
        let emptyMsg = window.i18n.t('noPortsFound');
        if (searchQuery) {
            emptyMsg = `Nenhum processo encontrado para "${searchQuery}".`;
        } else if (activeCategory !== 'all') {
            emptyMsg = `Nenhum processo na categoria "${activeCategory}".`;
        }
        listElement.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
        return;
    }

    listElement.innerHTML = '';

    const categoryLabels = {
        dev: { label: '⚡ Dev', class: 'cat-dev', desc: 'Ambiente de desenvolvimento' },
        database: { label: '🗄️ Banco', class: 'cat-database', desc: 'Banco de dados' },
        app: { label: '📦 App', class: 'cat-app', desc: 'Aplicativo de usuário' },
        system: { label: '🛡️ Sistema', class: 'cat-system', desc: 'Processo do sistema Windows' }
    };

    ports.forEach(port => {
        const item = document.createElement('div');
        item.className = 'port-item';

        const mainTitle = port.ProjectName || port.ProcessName || window.i18n.t('unknown');
        const subTag = port.ProjectName && port.ProcessName ? port.ProcessName : '';
        const detailsText = port.Details || '';
        const catInfo = categoryLabels[port.Category] || categoryLabels.app;

        const tooltipLines = [
            `Porta :${port.LocalPort} | PID: ${port.PID}`,
            `Categoria: ${catInfo.label} (${catInfo.desc})`,
            `Processo: ${port.ProcessName}${port.ProjectName ? ` (${port.ProjectName})` : ''}`,
            detailsText,
            port.CommandLine ? `Comando: ${port.CommandLine}` : ''
        ]
            .filter(Boolean)
            .join('\n');

        item.title = tooltipLines;

        item.innerHTML = `
      <div class="port-main-row">
        <div class="port-badge" title="${window.i18n.t('openPort', { port: port.LocalPort })}">:${port.LocalPort}</div>
        <div class="process-info-col">
          <div class="process-header-line">
            <span class="process-name" title="${mainTitle}">${mainTitle}</span>
            <span class="category-badge ${catInfo.class}" title="${catInfo.desc}">${catInfo.label}</span>
            ${subTag ? `<span class="process-tag">${subTag}</span>` : ''}
            <span class="pid">${window.i18n.t('pid', { pid: port.PID })}</span>
          </div>
          ${detailsText ? `<div class="process-sub-details" title="${detailsText}">${detailsText}</div>` : ''}
        </div>
        <div class="actions">
        </div>
      </div>
    `;

        const badge = item.querySelector('.port-badge');
        badge.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        const killBtn = document.createElement('button');
        const isSystem = port.Category === 'system';
        killBtn.className = isSystem ? 'kill-btn system-warning' : 'kill-btn';
        killBtn.title = isSystem ? 'Atenção: Processo do Sistema' : window.i18n.t('stopProcess');
        killBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> ${window.i18n.t('stop')}`;

        killBtn.onclick = e => {
            e.stopPropagation();
            if (isSystem) {
                const confirmed = window.confirm(
                    `⚠️ Atenção: ${port.ProcessName} é um processo crítico do Sistema Windows.\n\nFinalizá-lo pode causar encerramento de serviços ou instabilidade no Windows.\n\nDeseja realmente forçar o encerramento?`
                );
                if (!confirmed) return;
            }
            killProcess(port.PID, item);
        };

        item.querySelector('.actions').appendChild(killBtn);
        listElement.appendChild(item);
    });
}

/**
 * Kills a process by PID with visual feedback
 * @async
 * @param {number|string} pid - Process ID to kill
 * @param {HTMLElement} btnElement - Button element that triggered the action
 * @returns {Promise<void>}
 */
async function killProcess(pid, btnElement) {
    let row = null;
    if (btnElement) {
        row = btnElement.closest('.port-item');
        if (row) {
            row.classList.add('removing');
        }
    }

    try {
        const result = await tauriInvoke('kill_process', { pid: parseInt(pid, 10) });

        if (result && result.success) {
            // Wait for animation to finish before reloading
            setTimeout(() => {
                loadPorts();
            }, ANIMATION_DURATION);
        } else {
            if (row) row.classList.remove('removing');
            const errMsg = result && result.error ? result.error : 'Erro desconhecido';
            alert(`${window.i18n.t('errorKillingProcess')}: ${errMsg}`);
        }
    } catch (err) {
        if (row) row.classList.remove('removing');
        alert(`${window.i18n.t('errorKillingProcess')}: ${err}`);
    }
}

window.killProcess = killProcess;

refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('svg');
    if (icon) icon.classList.add('spinning');

    loadPorts().finally(() => {
        if (icon) icon.classList.remove('spinning');
    });
});

aboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
});

closeAboutBtn.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
});

aboutModal.addEventListener('click', e => {
    if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
    }
});

// Modal external links
document.querySelectorAll('.modal-content .link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        if (url) {
            tauriInvoke('open_external', { url });
        }
    });
});

quitBtn.addEventListener('click', () => {
    tauriInvoke('quit_app');
});

// Initial load
loadPorts();

// Auto refresh every 5s
setInterval(loadPorts, AUTO_REFRESH_INTERVAL);
