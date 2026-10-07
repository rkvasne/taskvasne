/* global AbortController, fetch, clearTimeout, navigator, performance */

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
const btnKillOrphans = document.getElementById('btn-kill-orphans');
const orphanCountLabel = document.getElementById('orphan-count-label');
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
const latencyHistoryMap = new Map();

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

// Kill Orphans (Zombies) button
if (btnKillOrphans) {
    btnKillOrphans.addEventListener('click', async () => {
        const orphanPorts = allPorts.filter(
            p => p.IsOrphan && (p.Category || '').toLowerCase() === 'dev'
        );
        const count = new Set(orphanPorts.map(p => p.PID)).size;
        if (count === 0) return;

        const confirmed = window.confirm(window.i18n.t('killOrphansConfirm', { count }));
        if (!confirmed) return;

        btnKillOrphans.disabled = true;
        try {
            const res = await tauriInvoke('kill_all_orphans');
            if (res && res.success) {
                await loadPorts();
            } else {
                alert(`Aviso ao limpar zumbis: ${res?.error || 'Erro desconhecido'}`);
                await loadPorts();
            }
        } catch (e) {
            alert(`Erro ao limpar zumbis: ${e}`);
        } finally {
            btnKillOrphans.disabled = false;
        }
    });
}

/**
 * Generates inline sparkline SVG for latency history
 * @param {Array<number|null>} history
 * @returns {string} SVG HTML
 */
function generateSparklineSvg(history) {
    if (!history || history.length < 2) return '';
    const valid = history.filter(v => typeof v === 'number');
    if (valid.length < 2) return '';

    const width = 36;
    const height = 12;
    const maxVal = Math.max(80, ...valid);
    const minVal = 0;
    const range = Math.max(1, maxVal - minVal);

    const stepX = width / (history.length - 1);
    const points = history.map((val, idx) => {
        const x = (idx * stepX).toFixed(1);
        if (val === null) {
            return `${x},${height}`;
        }
        const clamped = Math.min(val, maxVal);
        const y = (height - ((clamped - minVal) / range) * (height - 2) - 1).toFixed(1);
        return `${x},${y}`;
    });

    const lastVal = valid[valid.length - 1];
    const speedClass = lastVal < 50 ? 'fast' : lastVal < 150 ? 'med' : 'slow';

    return `
      <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}">
        <polyline class="sparkline-line ${speedClass}" points="${points.join(' ')}" />
      </svg>
    `;
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
 * HTTP health probe for local ports with latency (RTT) measurement and history
 * @param {number} portNum
 * @returns {Promise<{status: string, rtt: number|null, statusText: string|null, history: Array<number|null>}>}
 */
async function probePort(portNum) {
    const t0 = performance.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 950);
        const res = await fetch(`http://localhost:${portNum}/`, {
            method: 'GET',
            mode: 'no-cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        const rtt = Math.max(1, Math.round(performance.now() - t0));
        const statusText = res.status > 0 ? `${res.status} OK` : '200 OK';

        const history = latencyHistoryMap.get(portNum) || [];
        history.push(rtt);
        if (history.length > 8) history.shift();
        latencyHistoryMap.set(portNum, history);

        const info = { status: 'online', rtt, statusText, history };
        healthStatusCache.set(portNum, info);
        return info;
    } catch {
        const history = latencyHistoryMap.get(portNum) || [];
        history.push(null);
        if (history.length > 8) history.shift();
        latencyHistoryMap.set(portNum, history);

        const info = { status: 'offline', rtt: null, statusText: null, history };
        healthStatusCache.set(portNum, info);
        return info;
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
 * Synchronizes port state and purges dead ports from health and latency caches
 * to prevent memory leaks during long-running sessions.
 * @param {Array<Object>} newPorts
 */
function syncPortsState(newPorts) {
    allPorts = newPorts || [];
    const currentPortSet = new Set(allPorts.map(p => p.LocalPort));
    for (const key of healthStatusCache.keys()) {
        if (!currentPortSet.has(key)) {
            healthStatusCache.delete(key);
        }
    }
    for (const key of latencyHistoryMap.keys()) {
        if (!currentPortSet.has(key)) {
            latencyHistoryMap.delete(key);
        }
    }
    updateCategoryCounts(allPorts);
    renderFilteredPorts();
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
        syncPortsState(ports);
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

    // Atualiza botão Kill Orphans (Zumbis)
    const orphanProcesses = allPorts.filter(
        p => p.IsOrphan && (p.Category || '').toLowerCase() === 'dev'
    );
    const orphanUniquePids = new Set(orphanProcesses.map(p => p.PID));
    if (btnKillOrphans && orphanCountLabel) {
        orphanCountLabel.textContent = orphanUniquePids.size;
        if (orphanUniquePids.size > 0) {
            btnKillOrphans.classList.remove('hidden');
        } else {
            btnKillOrphans.classList.add('hidden');
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
        dev: { label: 'Dev', class: 'cat-dev', desc: 'Ambiente de desenvolvimento' },
        database: { label: 'Banco', class: 'cat-database', desc: 'Banco de dados' },
        app: { label: 'App', class: 'cat-app', desc: 'Aplicativo' },
        system: { label: 'Sistema', class: 'cat-system', desc: 'Sistema Windows' }
    };

    ports.forEach(port => {
        const item = document.createElement('div');
        item.className = 'port-item';

        let mainTitle = port.ProjectName || port.ProcessName || window.i18n.t('unknown');
        if (mainTitle.startsWith('Microsoft Visual Studio Code')) {
            mainTitle = 'Visual Studio Code';
        }
        const detailsText = port.Details || '';
        const catInfo = categoryLabels[port.Category] || categoryLabels.app;

        const isOrphanDev = port.IsOrphan && (port.Category || '').toLowerCase() === 'dev';
        const orphanTag = isOrphanDev
            ? `<span class="orphan-badge" title="Processo abandonado (processo pai fechado)">👻 ${window.i18n.t('orphanBadge')}</span>`
            : '';

        const memFormatted =
            port.MemoryMb && port.MemoryMb > 1024
                ? `${(port.MemoryMb / 1024).toFixed(1)} GB`
                : port.MemoryMb && port.MemoryMb > 0
                  ? `${port.MemoryMb} MB`
                  : null;
        const cpuText =
            port.CpuUsage && port.CpuUsage > 0.5 ? `${port.CpuUsage.toFixed(1)}% CPU` : null;
        const metricSummary = [memFormatted, cpuText].filter(Boolean).join(' • ');

        let ioTooltip = '';
        if (
            (port.DiskReadKb && port.DiskReadKb > 0) ||
            (port.DiskWrittenKb && port.DiskWrittenKb > 0)
        ) {
            ioTooltip = `I/O: ${port.DiskReadKb || 0} KB Lidos / ${port.DiskWrittenKb || 0} KB Escritos`;
        }

        const tooltipLines = [
            `Porta :${port.LocalPort} | PID: ${port.PID}`,
            isOrphanDev ? '⚠️ Processo Órfão / Zumbi de Desenvolvimento' : '',
            `Categoria: ${catInfo.label} (${catInfo.desc})`,
            `Processo: ${port.ProcessName}${port.ProjectName ? ` (${port.ProjectName})` : ''}`,
            metricSummary ? `Consumo: ${metricSummary}` : '',
            ioTooltip,
            port.Cwd ? `Pasta: ${port.Cwd}` : '',
            detailsText,
            port.CommandLine ? `Comando: ${port.CommandLine}` : ''
        ]
            .filter(Boolean)
            .join('\n');

        item.title = tooltipLines;

        item.innerHTML = `
      <div class="col-port" title="Clique para copiar URL (http://localhost:${port.LocalPort})">
        <span class="health-dot unknown" id="health-${port.LocalPort}"></span>
        <span class="port-number">:${port.LocalPort}</span>
        <span class="protocol-badge ${(port.Protocol || 'TCP').toLowerCase()}">${port.Protocol || 'TCP'}</span>
        <span class="latency-badge hidden" id="latency-${port.LocalPort}"></span>
        <span class="sparkline-container" id="sparkline-${port.LocalPort}"></span>
      </div>
      <div class="col-process" title="${mainTitle}">
        ${port.IconBase64 ? `<img class="process-icon" src="${port.IconBase64}" alt="" onerror="this.style.display='none'" />` : ''}
        <span class="process-name">${mainTitle}</span>
        ${orphanTag}
      </div>
      <div class="col-metrics" title="PID: ${port.PID}${metricSummary ? `\nConsumo: ${metricSummary}` : ''}">
        <span class="metrics-val">${metricSummary || `PID ${port.PID}`}</span>
      </div>
      <div class="col-category">
        <span class="category-pill ${catInfo.class}" title="${catInfo.desc}">${catInfo.label}</span>
      </div>
      <div class="col-actions actions">
      </div>
    `;

        // Context menu com clique com o botão direito
        item.addEventListener('contextmenu', e => {
            e.preventDefault();
            e.stopPropagation();
            openContextMenu(port, e.clientX, e.clientY);
        });

        // Copiar URL ao clicar na porta
        const portCol = item.querySelector('.col-port');
        portCol.onclick = e => {
            e.stopPropagation();
            navigator.clipboard
                .writeText(`http://localhost:${port.LocalPort}`)
                .then(() => {
                    const spanPort = portCol.querySelector('.port-number');
                    if (spanPort) {
                        const orig = spanPort.textContent;
                        spanPort.textContent = window.i18n.t('copied');
                        setTimeout(() => {
                            spanPort.textContent = orig;
                        }, 1000);
                    }
                })
                .catch(() => {});
        };

        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        // Probe assíncrono de saúde HTTP, latência RTT e sparkline
        probePort(port.LocalPort).then(health => {
            const dot = item.querySelector(`#health-${port.LocalPort}`);
            const latencyBadge = item.querySelector(`#latency-${port.LocalPort}`);
            const sparklineSpan = item.querySelector(`#sparkline-${port.LocalPort}`);
            if (dot) {
                dot.className = `health-dot ${health.status}`;
                dot.title =
                    health.status === 'online'
                        ? `Servidor HTTP respondendo (${health.statusText}, ${health.rtt}ms)`
                        : 'Porta aberta (sem resposta HTTP direta)';
            }
            if (latencyBadge && health.status === 'online' && health.rtt !== null) {
                latencyBadge.textContent = `${health.rtt}ms`;
                const speedClass = health.rtt < 50 ? 'fast' : health.rtt < 150 ? 'med' : 'slow';
                latencyBadge.className = `latency-badge ${speedClass}`;
                latencyBadge.title = `Tempo de resposta RTT: ${health.rtt}ms (${health.statusText})`;
            }
            if (sparklineSpan && health.history) {
                sparklineSpan.innerHTML = generateSparklineSvg(health.history);
            }
        });

        const actionsContainer = item.querySelector('.actions');

        // Botão Stop Process (Minimalista - Icon Only)
        const killBtn = document.createElement('button');
        const isSystem = port.Category === 'system';
        killBtn.className = isSystem ? 'kill-btn icon-only system-warning' : 'kill-btn icon-only';
        killBtn.title = isSystem
            ? `⚠️ ${window.i18n.t('systemProcessWarning')}`
            : `${window.i18n.t('stopProcess')} (${port.ProcessName} - PID ${port.PID})`;
        killBtn.innerHTML = `
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;

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

        // Botão Mais Ações (Context Menu)
        const moreBtn = document.createElement('button');
        moreBtn.className = 'action-icon-btn';
        moreBtn.title = window.i18n.t('moreActions');
        moreBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1.5"></circle>
            <circle cx="12" cy="5" r="1.5"></circle>
            <circle cx="12" cy="19" r="1.5"></circle>
          </svg>
        `;
        moreBtn.onclick = e => {
            e.stopPropagation();
            const rect = moreBtn.getBoundingClientRect();
            openContextMenu(port, rect.left - 180, rect.bottom + 4);
        };
        actionsContainer.appendChild(moreBtn);

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
            const tryAdmin = window.confirm(
                `${window.i18n.t('errorKillingProcess')}: ${errMsg}\n\n${window.i18n.t('killAdminConfirm', { pid })}`
            );
            if (tryAdmin) {
                if (row) row.classList.add('removing');
                const adminRes = await tauriInvoke('kill_process_elevated', {
                    pid: parseInt(pid, 10)
                });
                if (adminRes && adminRes.success) {
                    setTimeout(() => {
                        loadPorts();
                    }, ANIMATION_DURATION);
                } else {
                    if (row) row.classList.remove('removing');
                    alert(
                        `${window.i18n.t('errorKillingProcess')}: ${adminRes?.error || 'Falha na elevação'}`
                    );
                }
            }
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

// Auto refresh every 5s (como fallback caso o watcher do sistema operacional não emita evento)
setInterval(loadPorts, AUTO_REFRESH_INTERVAL);

// ==========================================================================
// Menu de Contexto Flutuante (Context Menu Logic)
// ==========================================================================
let activeContextPort = null;
const contextMenu = document.getElementById('context-menu');

function openContextMenu(port, x, y) {
    if (!contextMenu) return;
    activeContextPort = port;

    const label = document.getElementById('ctx-port-label');
    if (label) {
        const title = port.ProjectName || port.ProcessName || window.i18n.t('unknown');
        label.textContent = `:${port.LocalPort} (${title})`;
    }

    const rttBadge = document.getElementById('ctx-rtt-badge');
    const cachedHealth = healthStatusCache.get(port.LocalPort);
    if (rttBadge) {
        if (cachedHealth && cachedHealth.status === 'online' && cachedHealth.rtt !== null) {
            rttBadge.textContent = `${cachedHealth.statusText} (${cachedHealth.rtt}ms)`;
            const speed = cachedHealth.rtt < 50 ? 'fast' : cachedHealth.rtt < 150 ? 'med' : 'slow';
            rttBadge.className = `ctx-badge ${speed}`;
        } else {
            rttBadge.className = 'ctx-badge hidden';
        }
    }

    // Exibe ou oculta opções dependentes de caminho em disco
    const hasPath = Boolean(port.Cwd);
    const vscodeBtn = document.getElementById('ctx-open-vscode');
    const termBtn = document.getElementById('ctx-open-terminal');
    const folderBtn = document.getElementById('ctx-open-folder');
    if (vscodeBtn) vscodeBtn.style.display = hasPath ? 'flex' : 'none';
    if (termBtn) termBtn.style.display = hasPath ? 'flex' : 'none';
    if (folderBtn) folderBtn.style.display = hasPath ? 'flex' : 'none';

    contextMenu.classList.remove('hidden');

    // Bounds checking para garantir que o menu fique visível na janela
    const rect = contextMenu.getBoundingClientRect();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + rect.width > winWidth - 8) {
        posX = winWidth - rect.width - 8;
    }
    if (posY + rect.height > winHeight - 8) {
        posY = winHeight - rect.height - 8;
    }

    contextMenu.style.left = `${Math.max(8, posX)}px`;
    contextMenu.style.top = `${Math.max(8, posY)}px`;
}

function closeContextMenu() {
    if (contextMenu) {
        contextMenu.classList.add('hidden');
    }
    activeContextPort = null;
}

// Fechar menu de contexto e dropdown de exportação ao clicar fora ou rolar
document.addEventListener('click', e => {
    if (contextMenu && !contextMenu.contains(e.target)) {
        closeContextMenu();
    }
    const exportDropdown = document.getElementById('export-dropdown');
    const exportBtn = document.getElementById('btn-export');
    if (
        exportDropdown &&
        exportBtn &&
        !exportDropdown.contains(e.target) &&
        !exportBtn.contains(e.target)
    ) {
        exportDropdown.classList.add('hidden');
    }
});

window.addEventListener(
    'scroll',
    () => {
        closeContextMenu();
    },
    true
);

window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeContextMenu();
        const exportDropdown = document.getElementById('export-dropdown');
        if (exportDropdown) exportDropdown.classList.add('hidden');
    }
});

// Ações do menu de contexto
const ctxCopyUrl = document.getElementById('ctx-copy-url');
if (ctxCopyUrl) {
    ctxCopyUrl.addEventListener('click', () => {
        if (activeContextPort) {
            navigator.clipboard
                .writeText(`http://localhost:${activeContextPort.LocalPort}`)
                .catch(() => {});
        }
        closeContextMenu();
    });
}

const ctxCopyCurl = document.getElementById('ctx-copy-curl');
if (ctxCopyCurl) {
    ctxCopyCurl.addEventListener('click', () => {
        if (activeContextPort) {
            navigator.clipboard
                .writeText(`curl -i http://localhost:${activeContextPort.LocalPort}`)
                .catch(() => {});
        }
        closeContextMenu();
    });
}

const ctxOpenVsCode = document.getElementById('ctx-open-vscode');
if (ctxOpenVsCode) {
    ctxOpenVsCode.addEventListener('click', () => {
        if (activeContextPort && activeContextPort.Cwd) {
            tauriInvoke('open_in_vscode', { path: activeContextPort.Cwd });
        }
        closeContextMenu();
    });
}

const ctxOpenTerminal = document.getElementById('ctx-open-terminal');
if (ctxOpenTerminal) {
    ctxOpenTerminal.addEventListener('click', () => {
        if (activeContextPort && activeContextPort.Cwd) {
            tauriInvoke('open_in_terminal', { path: activeContextPort.Cwd });
        }
        closeContextMenu();
    });
}

const ctxOpenFolder = document.getElementById('ctx-open-folder');
if (ctxOpenFolder) {
    ctxOpenFolder.addEventListener('click', () => {
        if (activeContextPort && activeContextPort.Cwd) {
            tauriInvoke('open_folder', { path: activeContextPort.Cwd });
        }
        closeContextMenu();
    });
}

const ctxKillTree = document.getElementById('ctx-kill-tree');
if (ctxKillTree) {
    ctxKillTree.addEventListener('click', async () => {
        if (!activeContextPort) return;
        const pid = activeContextPort.PID;
        const confirmed = window.confirm(window.i18n.t('killTreeConfirm', { pid }));
        closeContextMenu();
        if (confirmed) {
            try {
                const res = await tauriInvoke('kill_process_tree', { pid });
                if (res && res.success) {
                    loadPorts();
                } else {
                    alert(
                        `${window.i18n.t('errorKillingProcess')}: ${res?.error || 'Erro desconhecido'}`
                    );
                }
            } catch (err) {
                alert(`${window.i18n.t('errorKillingProcess')}: ${err}`);
            }
        }
    });
}

const ctxKillPid = document.getElementById('ctx-kill-pid');
if (ctxKillPid) {
    ctxKillPid.addEventListener('click', () => {
        if (activeContextPort) {
            const pid = activeContextPort.PID;
            closeContextMenu();
            killProcess(pid);
        }
    });
}

const ctxKillAdmin = document.getElementById('ctx-kill-admin');
if (ctxKillAdmin) {
    ctxKillAdmin.addEventListener('click', async () => {
        if (!activeContextPort) return;
        const pid = activeContextPort.PID;
        const confirmed = window.confirm(window.i18n.t('killAdminConfirm', { pid }));
        closeContextMenu();
        if (confirmed) {
            try {
                const res = await tauriInvoke('kill_process_elevated', { pid });
                if (res && res.success) {
                    loadPorts();
                } else {
                    alert(
                        `${window.i18n.t('errorKillingProcess')}: ${res?.error || 'Falha na elevação'}`
                    );
                }
            } catch (err) {
                alert(`${window.i18n.t('errorKillingProcess')}: ${err}`);
            }
        }
    });
}

// ==========================================================================
// Exportadores (Markdown & .env.local)
// ==========================================================================
const btnExport = document.getElementById('btn-export');
const exportDropdown = document.getElementById('export-dropdown');
if (btnExport && exportDropdown) {
    btnExport.addEventListener('click', e => {
        e.stopPropagation();
        exportDropdown.classList.toggle('hidden');
    });
}

const btnExportMd = document.getElementById('btn-export-markdown');
if (btnExportMd) {
    btnExportMd.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        if (!allPorts || allPorts.length === 0) return;

        const header =
            '| Porta | Processo | Tipo | PID | Memória | Pasta / Detalhes |\n|---|---|---|---|---|---|';
        const rows = allPorts.map(p => {
            const mem = p.MemoryMb && p.MemoryMb > 0 ? `${p.MemoryMb} MB` : '-';
            const desc = p.Cwd || p.Details || '-';
            return `| :${p.LocalPort} | ${p.ProcessName} | ${p.Category} | ${p.PID} | ${mem} | ${desc} |`;
        });
        const markdown = `# Taskvasne - Portas Ativas (${new Date().toLocaleTimeString()})\n\n${header}\n${rows.join('\n')}\n`;
        navigator.clipboard
            .writeText(markdown)
            .then(() => {
                alert(window.i18n.t('exportSuccess'));
            })
            .catch(() => {
                alert('Falha ao copiar para a área de transferência');
            });
    });
}

const btnExportEnv = document.getElementById('btn-export-env');
if (btnExportEnv) {
    btnExportEnv.addEventListener('click', () => {
        if (exportDropdown) exportDropdown.classList.add('hidden');
        if (!allPorts || allPorts.length === 0) return;

        const lines = [
            `# Gerado por Taskvasne em ${new Date().toLocaleString()}`,
            '# Sincronização de portas locais'
        ];
        allPorts.forEach(p => {
            const name = (p.ProjectName || p.ProcessName)
                .replace(/[^a-zA-Z0-9_]/g, '_')
                .toUpperCase();
            lines.push(`${name}_PORT=${p.LocalPort}`);
            lines.push(`${name}_URL=http://localhost:${p.LocalPort}`);
        });
        navigator.clipboard
            .writeText(lines.join('\n') + '\n')
            .then(() => {
                alert(window.i18n.t('exportSuccess'));
            })
            .catch(() => {
                alert('Falha ao copiar para a área de transferência');
            });
    });
}

// ==========================================================================
// Delta Watcher Event Listener (Reatividade Instantânea Tauri)
// ==========================================================================
if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
    window.__TAURI__.event.listen('ports-changed', event => {
        if (Array.isArray(event.payload)) {
            syncPortsState(event.payload);
        }
    });
}

// ==========================================================================
// Compartilhamento na Rede Local (Wi-Fi / QR Code)
// ==========================================================================
const ctxShareNetwork = document.getElementById('ctx-share-network');
const shareModal = document.getElementById('share-modal');
const closeShareBtn = document.getElementById('close-share');
const shareUrlInput = document.getElementById('share-url-input');
const btnCopyShareUrl = document.getElementById('btn-copy-share-url');
const shareQrContainer = document.getElementById('share-qr-container');

if (ctxShareNetwork) {
    ctxShareNetwork.addEventListener('click', async () => {
        if (!activeContextPort) return;
        const portNum = activeContextPort.LocalPort;
        closeContextMenu();

        try {
            const localIp = await tauriInvoke('get_local_ip');
            const shareUrl = `http://${localIp}:${portNum}`;

            if (shareUrlInput) shareUrlInput.value = shareUrl;
            if (shareQrContainer && window.createQrSvg) {
                shareQrContainer.innerHTML = window.createQrSvg(shareUrl, 160);
            }

            if (shareModal) shareModal.classList.remove('hidden');
        } catch {
            alert(window.i18n.t('networkIpError'));
        }
    });
}

if (closeShareBtn) {
    closeShareBtn.addEventListener('click', () => {
        if (shareModal) shareModal.classList.add('hidden');
    });
}

if (shareModal) {
    shareModal.addEventListener('click', e => {
        if (e.target === shareModal) {
            shareModal.classList.add('hidden');
        }
    });
}

if (btnCopyShareUrl && shareUrlInput) {
    btnCopyShareUrl.addEventListener('click', () => {
        navigator.clipboard
            .writeText(shareUrlInput.value)
            .then(() => {
                const orig = btnCopyShareUrl.textContent;
                btnCopyShareUrl.textContent = window.i18n.t('copied');
                setTimeout(() => {
                    btnCopyShareUrl.textContent = orig;
                }, 1000);
            })
            .catch(() => {});
    });
}
