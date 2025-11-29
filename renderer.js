const listElement = document.getElementById('port-list');
const refreshBtn = document.getElementById('refresh');

async function loadPorts() {
    // Only show loading if empty to avoid flicker
    if (listElement.children.length === 0) {
        listElement.innerHTML = '<div class="empty-state">Carregando...</div>';
    }

    try {
        const ports = await window.electronAPI.getPorts();
        renderPorts(ports);
    } catch (error) {
        listElement.innerHTML = `<div class="empty-state">Erro ao carregar: ${error}</div>`;
    }
}

function renderPorts(ports) {
    // If we have ports, clear list. If not, show empty state.
    if (!ports || ports.length === 0) {
        listElement.innerHTML = '<div class="empty-state">Nenhuma porta ativa encontrada (acima de 1000)</div>';
        return;
    }

    // Simple diffing could be better but innerHTML is fast enough for small lists
    listElement.innerHTML = '';

    ports.forEach(port => {
        const item = document.createElement('div');
        item.className = 'port-item';

        item.innerHTML = `
      <div class="port-info">
        <div class="port-badge" title="Abrir http://localhost:${port.LocalPort}">:${port.LocalPort}</div>
        <div class="process-name" title="${port.ProcessName}">${port.ProcessName || 'Desconhecido'}</div>
        <div class="pid">PID: ${port.PID}</div>
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

        // Add click listener to process name for popover
        const processName = item.querySelector('.process-name');
        processName.style.cursor = 'pointer';
        processName.onclick = (e) => {
            e.stopPropagation();
            showProcessPopover(port, processName);
        };

        // Create button manually to attach event listener properly
        const killBtn = document.createElement('button');
        killBtn.className = 'kill-btn';
        killBtn.title = 'Parar Processo';
        // Stop icon (filled square)
        killBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 4px;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Parar`;
        killBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent row click
            killProcess(port.PID, item);
        };

        item.querySelector('.actions').appendChild(killBtn);
        listElement.appendChild(item);
    });
}

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
        }, 300);
    } else {
        // Revert visual change if failed
        if (row) row.classList.remove('removing');
        alert('Erro ao parar processo: ' + result.error);
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
setInterval(loadPorts, 5000);

// Popover functionality
let activePopover = null;

function showProcessPopover(port, element) {
    // Remove existing popover if any
    if (activePopover) {
        activePopover.remove();
        activePopover = null;
    }

    // Create popover
    const popover = document.createElement('div');
    popover.className = 'process-popover';
    popover.innerHTML = `
        <div class="popover-header">Informações do Processo</div>
        <div class="popover-body">
            <div class="popover-row">
                <span class="popover-label">Nome:</span>
                <span class="popover-value">${port.ProcessName || 'Desconhecido'}</span>
            </div>
            <div class="popover-row">
                <span class="popover-label">PID:</span>
                <span class="popover-value">${port.PID}</span>
            </div>
            <div class="popover-row">
                <span class="popover-label">Porta:</span>
                <span class="popover-value">:${port.LocalPort}</span>
            </div>
        </div>
    `;

    // Position popover
    const rect = element.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + 5}px`;

    document.body.appendChild(popover);
    activePopover = popover;

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function closePopover(e) {
            if (!popover.contains(e.target) && e.target !== element) {
                popover.remove();
                activePopover = null;
                document.removeEventListener('click', closePopover);
            }
        });
    }, 0);
}
