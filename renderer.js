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
      <div class="port-info" title="Abrir http://localhost:${port.LocalPort}">
        <div class="port-badge">:${port.LocalPort}</div>
        <div class="process-name" title="${port.ProcessName}">${port.ProcessName || 'Desconhecido'}</div>
        <div class="pid">PID: ${port.PID}</div>
      </div>
      <div class="actions">
      </div>
    `;

        // Add click listener to open localhost
        const portInfo = item.querySelector('.port-info');
        portInfo.style.cursor = 'pointer';
        portInfo.onclick = () => {
            window.electronAPI.openExternal(`http://localhost:${port.LocalPort}`);
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
