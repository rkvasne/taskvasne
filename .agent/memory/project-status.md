# 📊 Status do Projeto - Taskvasne

> **Última Atualização:** 29/09/2026  
> **Fase Atual:** Estável / Produção

---

## 🏗️ Arquitetura Atual

- **Frontend:** HTML5, CSS3 vanilla (design Windows 11 Fluent 2), Vanilla JavaScript ([renderer.js](file:///d:/Taskvasne/taskvasne-app/ui/renderer.js), [i18n.js](file:///d:/Taskvasne/taskvasne-app/ui/i18n.js))
- **Backend:** Rust + Tauri v2 ([src-tauri/src/lib.rs](file:///d:/Taskvasne/taskvasne-app/src-tauri/src/lib.rs), [main.rs](file:///d:/Taskvasne/taskvasne-app/src-tauri/src/main.rs)), Win32 FFI Restart Manager API (`Rstrtmgr.dll`)
- **Testes:** Jest ([tests/i18n.test.js](file:///d:/Taskvasne/taskvasne-app/tests/i18n.test.js)), Cargo tests ([src-tauri/src/lib.rs](file:///d:/Taskvasne/taskvasne-app/src-tauri/src/lib.rs))
- **Documentação & Landing:** [docs/](file:///d:/Taskvasne/taskvasne-app/docs/) (servido via Vercel)

---

## 📝 Histórico de Sessões

### 2026-09-29 — Release v0.1.5: Menu de Contexto, Health Probes, QR Code Wi-Fi e Delta Watcher

- **Versão v0.1.5:** Bump de patch com suíte completa de testes verdes (Jest 18/18, Cargo test 9/9, Clippy 0 warnings, ESLint 0 erros, Impeccable detect 0 anti-patterns).
- **Menu de Contexto Rápido:** Abrir projeto diretamente no VS Code, Terminal (Windows Terminal ou PowerShell) ou Explorer via botão direito.
- **Health Probes com Sparklines:** Sondagem HTTP em background medindo latência RTT em milissegundos com sparklines inline dinâmicos.
- **Compartilhamento Wi-Fi / QR Code:** Descoberta de IP local e geração nativa em SVG de QR Code para teste imediato em dispositivos móveis.
- **Exportadores:** Exportação para tabela Markdown e gerador de arquivo de ambiente `.env.local`.
- **Delta Watcher de Sockets:** Reatividade instantânea com detecção em tempo real via Tauri IPC (`ports-changed`).
- **Limpeza de Zumbis / Órfãos:** Detecção e eliminação de processos Dev desvinculados de árvores ativas.
- **Code Review Formal:** Resiliência em concorrência de sockets, mitigação de vazamento de memória em caches (`syncPortsState`), tratamento em chamadas ao clipboard e proteção de shell contra injeção de caracteres especiais.

### 2026-09-29 — Release v0.1.4: Desbloqueador de Pastas, Data Grid e Impeccable Polish

- **Versão v0.1.4:** Bump de patch com suite completa de testes verdes (Jest 14/14, Cargo test 7/7, Clippy 0 warnings, ESLint 0 erros, Impeccable detect 0 anti-patterns).
- **Desbloqueador de Pastas Presas:** Win32 Restart Manager API FFI + scanner de CWD para liberar diretórios e arquivos bloqueados.
- **Data Grid Alinhado:** Lista de processos reestruturada em 5 colunas estritas (`PORTA`, `PROCESSO`, `TIPO`, `PID`, `AÇÃO`) com cabeçalho de tabela e sub-linha de metadados.
- **Impeccable Design Polish:** Eliminação de 100% dos 13 anti-patterns detectados (remoção de glows artificiais, tipografia com piso mínimo de 11px/12px, tabular-nums e empty-states).
- **Ações em lote & Atalhos:** Botão `Parar Dev` (kill-all-dev com atalho `Ctrl+Shift+K`), `Ctrl+F` e `F5`.

### 2026-09-28 — Release v0.1.3: Sincronização, Higiene e Checkpoint

- Versão v0.1.3: Bump de patch com suite completa de testes verdes (Jest 14/14, Cargo test 5/5, Clippy 0 warnings).
- Sincronização com Hub v0.12.5 (canal repinado para 2da70f1f, 30/30 checks no `doctor:satellite`).
- Higiene no Rust (`src-tauri/src/lib.rs`), proteção de `*.exe` e `coverage/` no `.gitignore`.
- Remoção de artefato binário obsoleto da raiz e alinhamento de documentação.

### 2026-09-07 — Migração para Rust + Tauri v2

- Versão v0.1.2: Migração do app para Tauri v2 e Rust nativo.
- Sistema de internacionalização (pt-BR / en).
- Gerenciamento de portas e processos com baixo consumo de memória.

---

_Última atualização: 29/09/2026 • v0.1.5_
_Editado via: Antigravity | Modelo: Gemini 3.8 Flash | OS: Windows 11_
