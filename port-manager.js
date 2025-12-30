const { exec } = require('child_process');
const log = require('electron-log');

// Configuration Constants
const PORT_THRESHOLD = 1000; // Filter system ports (0-1000)
const ENRICHABLE_PROCESSES = ['node.exe', 'java.exe', 'python.exe'];
const IGNORED_FOLDERS = ['bin', 'dist', 'build', 'src', 'lib'];

/**
 * Extracts project name from command line path
 * @param {string} commandLine - Full command line from process
 * @param {string} processName - Name of the process executable
 * @returns {string|null} - Project name or null if not found
 */
function extractProjectName(commandLine, processName) {
    try {
        if (!commandLine || typeof commandLine !== 'string') {
            return null;
        }
        
        // Match quoted paths: "C:\path\to\file.js" or unquoted: C:\path\to\file.js
        const pathRegex = /"([^"]+\\[^"]+)"|([^\s]+:\\.+?)(?:\s|$)/g;
        let match;
        
        while ((match = pathRegex.exec(commandLine)) !== null) {
            const cleanPart = match[1] || match[2];
            
            if (!cleanPart) continue;
            
            // Skip if it ends with the process executable name
            if (cleanPart.toLowerCase().endsWith(processName.toLowerCase())) {
                continue;
            }
            
            // Must contain a valid Windows path
            if (cleanPart.includes(':\\')) {
                const pathParts = cleanPart.split('\\');
                if (pathParts.length > 1) {
                    let folderName = pathParts[pathParts.length - 2];
                    
                    // If last part doesn't have extension, use it as folder name
                    if (!pathParts[pathParts.length - 1].includes('.')) {
                        folderName = pathParts[pathParts.length - 1];
                    }
                    
                    // Skip common build/output folders
                    if (IGNORED_FOLDERS.includes(folderName.toLowerCase()) && pathParts.length > 2) {
                        folderName = pathParts[pathParts.length - 3];
                    }
                    
                    if (folderName) {
                        return folderName;
                    }
                }
            }
        }
    } catch (error) {
        log.error(`Error extracting project name: ${error.message}`);
    }
    return null;
}

/**
 * Retrieves a list of active TCP ports and their associated processes.
 * Enriches process names using PowerShell for better identification (e.g., node scripts).
 * @async
 * @returns {Promise<Array<{LocalPort: number, PID: string, ProcessName: string}>>} List of port objects
 */
function getPorts() {
    log.debug('Fetching active ports...');
    return new Promise((resolve, _reject) => {
        // 1. Get all processes first using tasklist (faster than querying per PID)
        exec('tasklist /FO CSV /NH', (_err, stdout, _stderr) => {
            const processMap = new Map();
            if (!_err && stdout) {
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
            exec('netstat -ano', async (error, stdout, _stderr) => {
                if (error) {
                    log.error(`netstat error: ${error}`);
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

                            if (port > PORT_THRESHOLD && !seenPorts.has(port)) {
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
                    if (ENRICHABLE_PROCESSES.includes(item.ProcessName.toLowerCase())) {
                        try {
                            const cmd = await new Promise(res => {
                                // Use PowerShell for reliable command line retrieval
                                const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${item.PID}' | Select-Object -ExpandProperty CommandLine"`;
                                exec(psCommand, (e, out) => {
                                    if (e || !out) {
                                        log.debug(`Could not get command line for PID ${item.PID}`);
                                        res('');
                                    } else {
                                        res(out.trim());
                                    }
                                });
                            });
                            
                            if (cmd) {
                                const projectName = extractProjectName(cmd, item.ProcessName);
                                if (projectName) {
                                    item.ProcessName += ` (${projectName})`;
                                    log.debug(`Enriched ${item.PID}: ${item.ProcessName}`);
                                }
                            }
                        } catch (error) {
                            log.error(`Enrichment failed for PID ${item.PID}: ${error.message}`);
                        }
                    }
                    return item;
                }));

                enrichedResults.sort((a, b) => a.LocalPort - b.LocalPort);
                log.info(`Found ${enrichedResults.length} active ports`);
                resolve(enrichedResults);
            });
        });
    });
}

module.exports = { getPorts, extractProjectName };
