// Configuration Constants
const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds - sync with README documentation
const ANIMATION_DURATION = 300; // 300ms - sync with CSS transition duration

const listElement = document.getElementById('port-list');
const refreshBtn = document.getElementById('refresh');

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
        const ports = await window.electronAPI.getPorts();
        renderPorts(ports);
    } catch (error) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('loadingError')}: ${error}</div>`;
    }
}

/**
 * Renders the ports list in the UI
 * @param {Array<{LocalPort: number, PID: string, ProcessName: string}>} ports - Array of port objects
 * @returns {void}
 */
function renderPorts(ports) {
    // If we have ports, clear list. If not, show empty state.
    if (!ports || ports.length === 0) {
        listElement.innerHTML = `<div class="empty-state">${window.i18n.t('noPortsFound')}</div>`;
        return;
    }

    // Simple diffing could be better but innerHTML is fast enough for small lists
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
        badge.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.openExternal(`http://localhost:${port.LocalPort}`);
        };

        // Add click listener to process name to also open URL
        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = (e) => {
            e.stopPropagation();
            window.electronAPI.openExternal(`http://localhost:${port.LocalPort}`);
        };

        // Create button manually to attach event listener properly
        const killBtn = document.createElement('button');
        killBtn.className = 'kill-btn';
        killBtn.title = window.i18n.t('stopProcess');
        // Stop icon (filled square)
        killBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> ${window.i18n.t('stop')}`;
        killBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent row click
            killProcess(port.PID, item);
        };

        item.querySelector('.actions').appendChild(killBtn);
        listElement.appendChild(item);
    });
}

/**
 * Kills a process by PID with visual feedback
 * @async
 * @param {string} pid - Process ID to kill
 * @param {HTMLElement} btnElement - Button element that triggered the action
 * @returns {Promise<void>}
 */
async function killProcess(pid, btnElement) {
    // 2. Visual Feedback (Optimistic UI)
    let row = null;
    if (btnElement) {
        row = btnElement.closest('.port-item');
        if (row) {
            row.classList.add('removing');
        }
    }

    // 3. Perform Action
    const result = await window.electronAPI.killProcess(pid);

    if (result.success) {
        // Wait for animation to finish before reloading
        setTimeout(() => {
            loadPorts();
        }, ANIMATION_DURATION);
    } else {
        // Revert visual change if failed
        if (row) row.classList.remove('removing');
        alert(`${window.i18n.t('errorKillingProcess')}: ${result.error}`);
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

document.getElementById('about').addEventListener('click', () => {
    window.electronAPI.showAbout();
});

document.getElementById('quit').addEventListener('click', () => {
    window.electronAPI.quitApp();
});

// Initial load
loadPorts();

// Auto refresh every 5s
setInterval(loadPorts, AUTO_REFRESH_INTERVAL);
