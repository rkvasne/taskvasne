/* global AbortController, fetch, clearTimeout, navigator */

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
const btnKillDev = document.getElementById('btn-kill-dev');
const devCountLabel = document.getElementById('dev-count-label');
const mainTabs = document.getElementById('main-tabs');
const tabPortsCount = document.getElementById('tab-ports-count');
const portsView = document.getElementById('ports-view');
const unlockerView = document.getElementById('unlocker-view');
const unlockerPathInput = document.getElementById('unlocker-path-input');
const btnInspectPath = document.getElementById('btn-inspect-path');
const btnPastePath = document.getElementById('btn-paste-path');
const clearUnlockerPath = document.getElementById('clear-unlocker-path');
const unlockerActionBar = document.getElementById('unlocker-action-bar');
const unlockerStatusMsg = document.getElementById('unlocker-status-msg');
const btnReleaseAll = document.getElementById('btn-release-all');
const lockedListElement = document.getElementById('locked-list');

let allPorts = [];
let activeCategory = 'all';
let searchQuery = '';
let currentLockedPath = '';
let currentLockedProcesses = [];
const healthStatusCache = new Map();

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

// Tab navigation
if (mainTabs) {
    mainTabs.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            mainTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (target === 'ports-view') {
                portsView.classList.remove('hidden');
                unlockerView.classList.add('hidden');
            } else if (target === 'unlocker-view') {
                portsView.classList.add('hidden');
                unlockerView.classList.remove('hidden');
                if (unlockerPathInput) unlockerPathInput.focus();
            }
        });
    });
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

// Kill All Dev button
if (btnKillDev) {
    btnKillDev.addEventListener('click', async () => {
        const devPorts = allPorts.filter(p => (p.Category || '').toLowerCase() === 'dev');
        const count = new Set(devPorts.map(p => p.PID)).size;
        if (count === 0) return;

        const confirmed = window.confirm(window.i18n.t('killAllDevConfirm', { count }));
        if (!confirmed) return;

        btnKillDev.disabled = true;
        try {
            await tauriInvoke('kill_all_dev');
            await loadPorts();
        } catch (e) {
            alert(`Erro ao parar processos dev: ${e}`);
        } finally {
            btnKillDev.disabled = false;
        }
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
 * HTTP health probe for local ports
 * @param {number} portNum
 * @returns {Promise<string>}
 */
async function probePort(portNum) {
    if (healthStatusCache.has(portNum)) {
        return healthStatusCache.get(portNum);
    }
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900);
        await fetch(`http://localhost:${portNum}/`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        healthStatusCache.set(portNum, 'online');
        return 'online';
    } catch {
        healthStatusCache.set(portNum, 'offline');
        return 'offline';
    }
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
 * Shows skeleton loading state only if list is empty
 * @async
 * @returns {Promise<void>}
 */
async function loadPorts() {
    if (listElement.children.length === 0) {
        listElement.innerHTML = `
            <div class="skeleton-card"><div class="skeleton-badge"></div><div class="skeleton-lines"><div class="skeleton-line" style="width: 60%;"></div><div class="skeleton-line" style="width: 40%;"></div></div></div>
            <div class="skeleton-card"><div class="skeleton-badge"></div><div class="skeleton-lines"><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 50%;"></div></div></div>
            <div class="skeleton-card"><div class="skeleton-badge"></div><div class="skeleton-lines"><div class="skeleton-line" style="width: 55%;"></div><div class="skeleton-line" style="width: 35%;"></div></div></div>
        `;
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
            const cwdMatch = (p.Cwd || '').toLowerCase().includes(searchQuery);
            return portMatch || nameMatch || projMatch || detailsMatch || cmdMatch || cwdMatch;
        });
    }

    renderPorts(filtered);
}

/**
 * Renders the ports list in the UI
 * @param {Array<Object>} ports - Array of port objects
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

    if (tabPortsCount) {
        tabPortsCount.textContent = allPorts.length;
    }

    // Atualiza botão Kill All Dev
    const devProcesses = allPorts.filter(p => (p.Category || '').toLowerCase() === 'dev');
    const devUniquePids = new Set(devProcesses.map(p => p.PID));
    if (btnKillDev && devCountLabel) {
        devCountLabel.textContent = devUniquePids.size;
        if (devUniquePids.size > 0) {
            btnKillDev.classList.remove('hidden');
        } else {
            btnKillDev.classList.add('hidden');
        }
    }

    if (!ports || ports.length === 0) {
        let emptyMsg = window.i18n.t('noPortsFound');
        if (searchQuery) {
            emptyMsg = `Nenhum processo encontrado para "${searchQuery}".`;
        } else if (activeCategory !== 'all') {
            emptyMsg = `Nenhum processo na categoria "${activeCategory}".`;
        }
        listElement.innerHTML = `
            <div class="empty-state">
                <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                <span>${emptyMsg}</span>
            </div>
        `;
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

        const memText = port.MemoryMb && port.MemoryMb > 0 ? `${port.MemoryMb} MB` : null;
        const cpuText =
            port.CpuUsage && port.CpuUsage > 0.1 ? `${port.CpuUsage.toFixed(1)}%` : null;
        const metricSummary = [memText, cpuText].filter(Boolean).join(' • ');

        const tooltipLines = [
            `Porta :${port.LocalPort} | PID: ${port.PID}`,
            `Categoria: ${catInfo.label} (${catInfo.desc})`,
            `Processo: ${port.ProcessName}${port.ProjectName ? ` (${port.ProjectName})` : ''}`,
            metricSummary ? `Consumo: ${metricSummary}` : '',
            port.Cwd ? `Pasta: ${port.Cwd}` : '',
            detailsText,
            port.CommandLine ? `Comando: ${port.CommandLine}` : ''
        ]
            .filter(Boolean)
            .join('\n');

        const subRowItems = [];
        if (port.Cwd) {
            subRowItems.push(
                `<span class="cwd-path" title="Pasta: ${port.Cwd}">📁 ${port.Cwd}</span>`
            );
        }
        if (metricSummary) {
            subRowItems.push(
                `<span class="metric-badge" title="Consumo de Recursos">${metricSummary}</span>`
            );
        }
        if (detailsText) {
            subRowItems.push(
                `<span class="details-snippet" title="${detailsText}">${detailsText}</span>`
            );
        }
        const subRowHtml =
            subRowItems.length > 0 ? `<div class="port-sub-row">${subRowItems.join('')}</div>` : '';

        item.title = tooltipLines;

        item.innerHTML = `
      <div class="port-main-row">
        <div class="col-cell col-port">
          <div class="port-badge" title="Clique para copiar URL (http://localhost:${port.LocalPort})">
            <span class="health-dot unknown" id="health-${port.LocalPort}" title="Status HTTP"></span>
            <span>:${port.LocalPort}</span>
          </div>
        </div>
        <div class="col-cell col-process" title="${mainTitle}">
          <span class="process-name">${mainTitle}</span>
          ${subTag ? `<span class="process-tag" title="${subTag}">${subTag}</span>` : ''}
        </div>
        <div class="col-cell col-category">
          <span class="category-badge ${catInfo.class}" title="${catInfo.desc}">${catInfo.label}</span>
        </div>
        <div class="col-cell col-pid">
          <span class="pid-value" title="PID: ${port.PID}">${port.PID}</span>
        </div>
        <div class="col-cell col-actions actions">
        </div>
      </div>
      ${subRowHtml}
    `;

        // Copiar URL ao clicar na porta e abrir no navegador com duplo-clique
        const badge = item.querySelector('.port-badge');
        badge.onclick = e => {
            e.stopPropagation();
            navigator.clipboard.writeText(`http://localhost:${port.LocalPort}`).then(() => {
                const spanPort = badge.querySelector('span:last-child');
                if (spanPort) {
                    const orig = spanPort.textContent;
                    spanPort.textContent = window.i18n.t('copied');
                    setTimeout(() => {
                        spanPort.textContent = orig;
                    }, 1000);
                }
            });
        };

        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        // Probe assíncrono de saúde HTTP
        probePort(port.LocalPort).then(status => {
            const dot = item.querySelector(`#health-${port.LocalPort}`);
            if (dot) {
                dot.className = `health-dot ${status}`;
                dot.title =
                    status === 'online'
                        ? 'Servidor HTTP respondendo (200 OK)'
                        : 'Porta aberta (sem resposta HTTP direta)';
            }
        });

        const actionsContainer = item.querySelector('.actions');

        // Botão Abrir Pasta (CWD)
        if (port.Cwd) {
            const openFolderBtn = document.createElement('button');
            openFolderBtn.className = 'action-icon-btn';
            openFolderBtn.title = `Abrir pasta do projeto:\n${port.Cwd}`;
            openFolderBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            `;
            openFolderBtn.onclick = e => {
                e.stopPropagation();
                tauriInvoke('open_folder', { path: port.Cwd });
            };
            actionsContainer.appendChild(openFolderBtn);
        }

        // Botão Stop Process
        const killBtn = document.createElement('button');
        const isSystem = port.Category === 'system';
        killBtn.className = isSystem ? 'kill-btn system-warning' : 'kill-btn';
        killBtn.title = isSystem
            ? window.i18n.t('systemProcessWarning')
            : window.i18n.t('stopProcess');
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

        actionsContainer.appendChild(killBtn);
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

// ==========================================================================
// Desbloqueador de Pastas (Unlocker Logic)
// ==========================================================================

async function inspectPath(pathStr) {
    if (!pathStr || !pathStr.trim()) return;
    currentLockedPath = pathStr.trim();

    lockedListElement.innerHTML = `
        <div class="skeleton-card"><div class="skeleton-badge"></div><div class="skeleton-lines"><div class="skeleton-line" style="width: 60%;"></div><div class="skeleton-line" style="width: 40%;"></div></div></div>
        <div class="skeleton-card"><div class="skeleton-badge"></div><div class="skeleton-lines"><div class="skeleton-line" style="width: 70%;"></div><div class="skeleton-line" style="width: 50%;"></div></div></div>
    `;
    if (unlockerActionBar) unlockerActionBar.classList.add('hidden');

    try {
        const result = await tauriInvoke('inspect_locked_path', { pathStr: currentLockedPath });
        currentLockedProcesses = result || [];
        renderLockedProcesses(currentLockedProcesses);
    } catch (err) {
        lockedListElement.innerHTML = `<div class="empty-state">${window.i18n.t('loadingError')}: ${err}</div>`;
    }
}

function renderLockedProcesses(procs) {
    if (!procs || procs.length === 0) {
        if (unlockerActionBar) unlockerActionBar.classList.add('hidden');
        lockedListElement.innerHTML = `
            <div class="success-state">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <div><b>${window.i18n.t('noLocksFound')}</b></div>
            </div>
        `;
        return;
    }

    if (unlockerActionBar) {
        unlockerActionBar.classList.remove('hidden');
        if (unlockerStatusMsg) {
            unlockerStatusMsg.textContent = window.i18n.t('locksFoundCount', {
                count: procs.length
            });
        }
    }

    lockedListElement.innerHTML = '';
    procs.forEach(p => {
        const item = document.createElement('div');
        item.className = 'locked-item';

        const isCwd = p.LockType === 'cwd';
        const lockBadgeClass = isCwd ? 'cwd' : 'handle';
        const lockBadgeText = isCwd
            ? window.i18n.t('lockTypeCwd')
            : window.i18n.t('lockTypeHandle');
        const mem = p.MemoryMb && p.MemoryMb > 0 ? `${p.MemoryMb} MB` : null;
        const cpu = p.CpuUsage && p.CpuUsage > 0.1 ? `${p.CpuUsage.toFixed(1)}%` : null;
        const metricSummary = [mem, cpu].filter(Boolean).join(' • ');

        item.innerHTML = `
            <div class="locked-item-info">
                <div class="locked-item-header">
                    <span style="font-weight: 600; font-size: 12px;">${p.ProcessName}</span>
                    <span class="lock-type-badge ${lockBadgeClass}">${lockBadgeText}</span>
                    <span class="pid">PID: ${p.PID}</span>
                    ${metricSummary ? `<span class="metric-badge">${metricSummary}</span>` : ''}
                </div>
                ${p.Details ? `<div class="locked-item-sub" title="${p.Details}">${p.Details}</div>` : ''}
                ${p.CommandLine ? `<div class="locked-item-sub" style="opacity: 0.4;" title="${p.CommandLine}">${p.CommandLine}</div>` : ''}
            </div>
            <div class="actions">
                <button class="kill-btn ${p.IsSystem ? 'system-warning' : ''}" title="${p.IsSystem ? window.i18n.t('systemProcessWarning') : window.i18n.t('stopProcess')}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    ${window.i18n.t('stop')}
                </button>
            </div>
        `;

        const killBtn = item.querySelector('.kill-btn');
        killBtn.onclick = async () => {
            if (p.IsSystem) {
                const confirmed = window.confirm(
                    `⚠️ ${p.ProcessName} é um processo crítico do sistema. Tem certeza que deseja encerrar?`
                );
                if (!confirmed) return;
            }
            try {
                await tauriInvoke('kill_process', { pid: p.PID });
                inspectPath(currentLockedPath);
            } catch (err) {
                alert(`Erro ao encerrar processo: ${err}`);
            }
        };

        lockedListElement.appendChild(item);
    });
}

if (btnInspectPath) {
    btnInspectPath.addEventListener('click', () => {
        if (unlockerPathInput) inspectPath(unlockerPathInput.value);
    });
}

if (unlockerPathInput) {
    unlockerPathInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            inspectPath(unlockerPathInput.value);
        }
    });

    unlockerPathInput.addEventListener('input', () => {
        if (clearUnlockerPath) {
            if (unlockerPathInput.value.length > 0) {
                clearUnlockerPath.classList.remove('hidden');
            } else {
                clearUnlockerPath.classList.add('hidden');
            }
        }
    });
}

if (clearUnlockerPath) {
    clearUnlockerPath.addEventListener('click', () => {
        if (unlockerPathInput) {
            unlockerPathInput.value = '';
            unlockerPathInput.focus();
        }
        clearUnlockerPath.classList.add('hidden');
        if (unlockerActionBar) unlockerActionBar.classList.add('hidden');
        lockedListElement.innerHTML = `
            <div class="empty-state initial-hint">
                <div>Cole o caminho de uma pasta bloqueada acima e clique em <b>Verificar</b>.</div>
            </div>
        `;
    });
}

if (btnPastePath) {
    btnPastePath.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && unlockerPathInput) {
                unlockerPathInput.value = text.trim();
                if (clearUnlockerPath) clearUnlockerPath.classList.remove('hidden');
                inspectPath(text);
            }
        } catch {
            if (unlockerPathInput) unlockerPathInput.focus();
        }
    });
}

if (btnReleaseAll) {
    btnReleaseAll.addEventListener('click', async () => {
        if (!currentLockedPath) return;
        const hasSystem = currentLockedProcesses.some(p => p.IsSystem);
        if (hasSystem) {
            const conf = window.confirm(
                '⚠️ Alguns dos processos são do sistema Windows. Deseja mesmo forçar a liberação?'
            );
            if (!conf) return;
        }

        btnReleaseAll.disabled = true;
        try {
            const res = await tauriInvoke('release_locked_path', { pathStr: currentLockedPath });
            if (res && res.success) {
                inspectPath(currentLockedPath);
            } else {
                const errors = res && res.errors ? res.errors.join('\n') : 'Erro ao liberar pasta';
                alert(`Avisos:\n${errors}`);
                inspectPath(currentLockedPath);
            }
        } catch (err) {
            alert(`Erro ao liberar: ${err}`);
        } finally {
            btnReleaseAll.disabled = false;
        }
    });
}

// Global Keyboard Shortcuts
window.addEventListener('keydown', e => {
    // Ctrl+F foca na busca da aba de portas
    if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const tabBtn = document.getElementById('tab-btn-ports');
        if (tabBtn) tabBtn.click();
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    // F5 ou Ctrl+R atualiza a visualização ativa
    if (e.key === 'F5' || (e.ctrlKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        if (unlockerView && !unlockerView.classList.contains('hidden')) {
            if (unlockerPathInput && unlockerPathInput.value) {
                inspectPath(unlockerPathInput.value);
            }
        } else {
            loadPorts();
        }
    }

    // Ctrl+Shift+K dispara Parar Todos Dev
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (btnKillDev && !btnKillDev.classList.contains('hidden')) {
            btnKillDev.click();
        }
    }
});

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

function applyTranslations() {
    if (!window.i18n) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (key) {
            el.textContent = window.i18n.t(key);
        }
    });
}

window.addEventListener('languageChanged', () => {
    applyTranslations();
    renderFilteredPorts();
});
applyTranslations();

// Initial load
loadPorts();

// Auto refresh every 5s
setInterval(loadPorts, AUTO_REFRESH_INTERVAL);
