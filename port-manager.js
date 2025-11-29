const { exec } = require('child_process');

/**
 * Retrieves a list of active TCP ports and their associated processes.
 * Enriches process names using PowerShell for better identification (e.g., node scripts).
 * @returns {Promise<Array>} List of port objects { LocalPort, PID, ProcessName }
 */
function getPorts() {
    return new Promise((resolve, reject) => {
        // 1. Get all processes first using tasklist (faster than querying per PID)
        exec('tasklist /FO CSV /NH', (err, stdout, stderr) => {
            const processMap = new Map();
            if (!err && stdout) {
                stdout.split('\n').forEach(line => {
                    const parts = line.trim().split(',');
                    if (parts.length >= 2) {
                        const name = parts[0].replace(/"/g, '');
                        const pid = parts[1].replace(/"/g, '');
                        processMap.set(pid, name);
                    }
                });
            }

            // 2. Get ports using netstat
            exec('netstat -ano', async (error, stdout, stderr) => {
                if (error) {
                    console.error(`netstat error: ${error}`);
                    resolve([]);
                    return;
                }

                const lines = stdout.split('\n');
                const results = [];
                const seenPorts = new Set();

                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length < 5) return;

                    const protocol = parts[0];
                    const localAddr = parts[1];
                    const state = parts[3];
                    const pid = parts[4];

                    if (state === 'LISTENING' && protocol === 'TCP') {
                        const portMatch = localAddr.match(/:(\d+)$/);
                        if (portMatch) {
                            const port = parseInt(portMatch[1], 10);

                            if (port > 1000 && !seenPorts.has(port)) {
                                seenPorts.add(port);
                                const processName = processMap.get(pid) || 'Desconhecido';
                                results.push({
                                    LocalPort: port,
                                    PID: pid,
                                    ProcessName: processName
                                });
                            }
                        }
                    }
                });

                // 3. Enrichment: Try to get project name for generic processes
                const enrichedResults = await Promise.all(results.map(async (item) => {
                    if (['node.exe', 'java.exe', 'python.exe'].includes(item.ProcessName.toLowerCase())) {
                        try {
                            const cmd = await new Promise(res => {
                                // Use PowerShell for reliable command line retrieval
                                const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${item.PID}' | Select-Object -ExpandProperty CommandLine"`;
                                exec(psCommand, (e, out) => {
                                    if (e || !out) res('');
                                    else res(out.trim());
                                });
                            });

                            // Look for file paths. Match absolute paths.
                            // We split by arguments to handle quotes better.
                            const parts = cmd.split(/\s+/);

                            for (let part of parts) {
                                // Remove quotes
                                let cleanPart = part.replace(/^"|"$/g, '');

                                // Check if it looks like a path and contains the process name (to skip the executable itself)
                                if (cleanPart.includes(':\\') && !cleanPart.toLowerCase().endsWith(item.ProcessName.toLowerCase())) {
                                    const pathParts = cleanPart.split('\\');
                                    if (pathParts.length > 1) {
                                        let folderName = pathParts[pathParts.length - 2];

                                        if (!pathParts[pathParts.length - 1].includes('.')) {
                                            folderName = pathParts[pathParts.length - 1];
                                        }

                                        if (['bin', 'dist', 'build', 'src', 'lib'].includes(folderName.toLowerCase()) && pathParts.length > 2) {
                                            folderName = pathParts[pathParts.length - 3];
                                        }

                                        if (folderName) {
                                            item.ProcessName += ` (${folderName})`;
                                            break;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                    return item;
                }));

                enrichedResults.sort((a, b) => a.LocalPort - b.LocalPort);
                resolve(enrichedResults);
            });
        });
    });
}

module.exports = { getPorts };
