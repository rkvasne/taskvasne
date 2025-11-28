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

        // Determine badge color based on port range or process name?
        // For now, keep it simple.

        item.innerHTML = `
      <div class="port-info">
        <div class="port-badge">:${port.LocalPort}</div>
        <div class="process-name" title="${port.ProcessName}">${port.ProcessName || 'Desconhecido'}</div>
        <div class="pid">PID: ${port.PID}</div>
      </div>
      <div class="actions">
        <button class="kill-btn" onclick="killProcess(${port.PID})" title="Matar Processo">X</button>
      </div>
    `;
        listElement.appendChild(item);
    });
}

async function killProcess(pid) {
    // In a real app, maybe a custom modal. Native confirm is fine for MVP.
    // Since we are "Windows 11 style", native confirm is a bit jarring, but acceptable.
    // We could implement a custom modal in HTML if requested.

    const result = await window.electronAPI.killProcess(pid);
    if (result.success) {
        // Optimistic update or refresh
        loadPorts();
    } else {
        alert('Erro ao parar processo: ' + result.error);
    }
}

window.killProcess = killProcess;

refreshBtn.addEventListener('click', () => {
    listElement.innerHTML = '<div class="empty-state">Atualizando...</div>';
    loadPorts();
});

// Initial load
loadPorts();

// Auto refresh every 5s
setInterval(loadPorts, 5000);
