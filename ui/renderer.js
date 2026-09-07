// Configuration Constants
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds - sync with README documentation
const ANIMATION_DURATION = 300; // 300ms - sync with CSS transition duration

const listElement = document.getElementById('port-list');
const refreshBtn = document.getElementById('refresh');
const aboutBtn = document.getElementById('about');
const quitBtn = document.getElementById('quit');
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about');

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
 * Loads and displays the list of active ports
 * Shows loading state only if list is empty to avoid flicker
 * @async
 * @returns {Promise<void>}
 */
async function loadPorts() {
    // Only show loading if empty to avoid flicker
    if (listElement.children.length === 0) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('loading')}</div>`;
    }

    try {
        const ports = await tauriInvoke('get_ports');
        renderPorts(ports);
    } catch (error) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('loadingError')}: ${error}</div>`;
    }
}

/**
 * Renders the ports list in the UI
 * @param {Array<{LocalPort: number, PID: number, ProcessName: string}>} ports - Array of port objects
 * @returns {void}
 */
function renderPorts(ports) {
    // If we have ports, clear list. If not, show empty state.
    if (!ports || ports.length === 0) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('noPortsFound')}</div>`;
        return;
    }

    listElement.innerHTML = '';

    ports.forEach(port => {
        const item = document.createElement('div');
        item.className = 'port-item';

        item.innerHTML = `
      <div class="port-info">
        <div class="port-badge" title="${window.i18n.t('openPort', { port: port.LocalPort })}">:${port.LocalPort}</div>
        <div class="process-name" title="${port.ProcessName}">${port.ProcessName || window.i18n.t('unknown')}</div>
        <div class="pid">${window.i18n.t('pid', { pid: port.PID })}</div>
      </div>
      <div class="actions">
      </div>
    `;

        // Add click listener to badge
        const badge = item.querySelector('.port-badge');
        badge.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        // Add click listener to process name to also open URL
        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = e => {
            e.stopPropagation();
            tauriInvoke('open_external', { url: `http://localhost:${port.LocalPort}` });
        };

        // Create button manually to attach event listener properly
        const killBtn = document.createElement('button');
        killBtn.className = 'kill-btn';
        killBtn.title = window.i18n.t('stopProcess');
        killBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> ${window.i18n.t('stop')}`;
        killBtn.onclick = e => {
            e.stopPropagation();
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
