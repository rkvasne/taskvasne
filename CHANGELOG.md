# 📝 Changelog - Taskvasne

Navegação: [README do projeto](README.md) • [Documentação](docs/README.md)

---

Registro oficial das mudanças por versão no Taskvasne.

---

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-10-09

### Added

- **Barra de Status do Rodapé (Footer Status Bar):**
    - Monitoramento em tempo real com contagem dinâmica de portas ativas (`Monitorando X portas` / `Monitoring X ports`), dot verde de conexão e pílulas dedicadas para contagem instantânea de sockets `TCP` e `UDP`.
    - Ajuste no grid de dados (`82px 1fr 76px 54px 44px`) garantindo visualização completa e sem truncamento dos badges de protocolo.

### Changed

- **Refinamento Impeccable da Landing Page (`docs/`):**
    - Eliminação completa de 28 anti-patterns acusados pelo Impeccable detect (0 erros, 0 avisos consultivos).
    - Paleta roxa preservada com contraste WCAG AA (> 5.5:1), removendo glows fluorescentes artificiais e bordas assimétricas de IA (`[side-tab]`).
    - Correção de hierarquia semântica com cabeçalhos `h3` no rodapé e remoção de kicker solto acima do título do desenvolvedor.
- **Higiene de Compilação Rust (Clippy):**
    - Resolução de todos os 8 avisos do Clippy em `src-tauri/src/lib.rs` (`collapsible_str_replace`, `div_ceil` e atributos FFI Win32).

### Aprendizado da Release

- **Fato observado:** Eliminar anti-patterns de IA (como halos e side-tabs) em interfaces web escuras não requer abandonar a identidade cromática do produto (como a cor roxa); elevar o contraste via tonalidades HSL balanceadas e usar elevação direcional neutra atinge nota máxima de design mantendo total personalidade.
- **Diretriz consolidada:** Linhas de cabeçalho e dados em tabelas contínuas precisam reservar largura fixa suficiente para acomodar a maior combinação possível de etiquetas (número de porta + protocolo) sem depender de quebra de linha ou elipses no elemento ativo.

## [0.2.0] - 2026-10-07

### Added

- **Extração de Ícones Reais dos Executáveis (`win_icon`):**
    - Módulo nativo Win32 Shell API (`SHGetFileInfoW`, `GetIconInfo`, `GetDIBits`) extraindo os ícones oficiais dos executáveis em cache Base64 BMP 32-bit com transparência.
    - Exibição de ícones oficiais na tabela contínua de portas para identificação visual instantânea dos processos.
- **Encerramento Elevado com Privilégios de Administrador (UAC):**
    - Novo comando `kill_process_elevated` com elevação UAC nativa sob demanda via PowerShell (`Start-Process taskkill -Verb RunAs`).
    - Opção _"Encerrar como Administrador (UAC)"_ no menu de contexto e prompt automático de fallback quando a finalização comum falhar por restrição de permissões.
- **Suporte a Sockets UDP (além de TCP):**
    - Monitoramento abrangente de portas em escuta tanto em `TCP` quanto `UDP` com badges de protocolo estilizados.
- **Notificação Automática de Nova Porta Dev Ativa:**
    - Toast nativo do Windows disparado em segundo plano quando um novo servidor de desenvolvimento abre uma porta.

### Fixed

- **Normalização de Canal Alpha em Ícones Win32:**
    - Correção para ícones legados do Windows sem canal alfa explícito para evitar renderização transparente ou preta no WebView2.
- **Sanitização de Strings em Notificações Toast:**
    - Sanitização contra caracteres especiais de XML e PowerShell em títulos de projetos e processos.

### Aprendizado da Release

- **Fato observado:** Ícones extraídos via Win32 Shell API (`SHGetFileInfoW`) de executáveis legados de 16/32-bit frequentemente possuem bitmaps DIB com bytes alpha zerados (0x00), fazendo com que navegadores e o WebView2 os tratem como totalmente transparentes. Adicionar uma etapa de normalização onde, se todos os bytes alpha forem 0, converte-se o canal para 255 (opaco), garante fidelidade visual de 100% dos executáveis.
- **Diretriz consolidada:** Em ferramentas de sistema desktop com Tauri/WebView2, comandos de encerramento de processos em portas baixas ou pertencentes a outros usuários devem sempre oferecer degradação graciosa com solicitação pontual de elevação UAC sob demanda, em vez de exigir que a aplicação inteira seja iniciada com privilégios de Administrador.

## [0.1.6] - 2026-09-29

### Added

- **Tabela Contínua de Alta Densidade (Estilo Windows 11 Task Manager):**
    - Lista de portas reconstruída como tabela contínua de linha única (31px) com divisórias sutis de 1px e efeito de hover abrangente.
    - Cabeçalho fixo com 5 colunas estritas: `Porta (58px)`, `Processo (1fr)`, `Consumo / PID (86px)`, `Tipo (56px)` e `Ações (44px)`.
    - Exibição de alta densidade permitindo visualizar de 12 a 14 processos simultaneamente na viewport (o dobro da interface anterior).
    - Indicador de porta simplificado: número `:PORTA` em fonte mono limpa (`Cascadia Code`), health-dot luminoso de 4px e sublinhado interativo ao passar o mouse.
    - Categorias naturais em Title Case (`Dev`, `Banco`, `App`, `Sistema`) com alinhamento geométrico milimétrico e texto perfeitamente centralizado na pílula.
    - Botão de encerramento em ícone `✕` moderno e discreto, com opacidade reduzida em repouso e realce no hover da linha.

### Changed

- **Higiene e Limpeza de Código Órfão (Code & Docs Janitor):**
    - Remoção de 50+ linhas de regras CSS mortas em `ui/styles.css` (`.meta-item`, `.meta-label`, `.meta-sep`, etc.) remanescentes da interface antiga.
    - Sincronização e validação de 100% dos links e referências de versão da documentação em `docs/README.md`.
    - Garantia do piso tipográfico de 11px no design system, mantendo zero anti-patterns no Impeccable detect.

### Aprendizado da Release

- **Fato observado:** Estruturas visuais com múltiplos cartões individuais empilhados (box-in-box) causam fadiga visual e desperdício de espaço vertical em listas densas com dezenas de itens. O modelo de tabela contínua com divisórias de 1px e hover que ilumina a linha inteira dobra a densidade de informação sem poluição visual.
- **Diretriz consolidada:** Para gerenciadores de processos e ferramentas de desenvolvedor no Windows 11, priorizar grids contínuos com colunas de largura estrita e tipografia alinhada em vez de contêineres de cards empilhados.

## [0.1.5] - 2026-09-29

### Added

- **Menu de Contexto de Ações Rápidas (Power Actions):**
    - Clique com o botão direito em qualquer porta para exibir menu de contexto flutuante no estilo Fluent 2.
    - Ações diretas: `Abrir no VS Code`, `Abrir no Terminal` (com auto-detecção entre Windows Terminal `wt.exe` e PowerShell com `Set-Location`), `Abrir Pasta no Explorer`, `Copiar URL`, `Copiar comando cURL` e `Encerrar Árvore (/T)`.
- **Health Probes com Latência e Sparklines Inline:**
    - Sondagem periódica via `fetch` HTTP (`no-cors`) medindo RTT em milissegundos com feedback em mini gráfico vetorial sparkline (`<svg>`) inline.
    - Classificação visual de desempenho: verde/rápido (<50ms), amarelo/médio (50-150ms) e laranja/lento (>150ms).
- **Compartilhamento Wi-Fi / Rede Local com QR Code SVG Nativo:**
    - Comando Rust `get_local_ip` via socket UDP local para descoberta do endereço IPv4 da máquina na LAN.
    - Gerador autocontido de QR Code puro JavaScript (`ui/qrcode.js`) gerando SVG vetorial direto, sem nenhuma biblioteca externa pesada.
    - Modal de escaneamento para abrir aplicações móveis no smartphone com a mesma rede Wi-Fi.
- **Exportadores de Portas (Markdown e .env.local):**
    - Exportação da lista de portas para tabela Markdown pronta para documentação e issues.
    - Gerador de arquivo de variáveis de ambiente (`.env.local`) mapeando `<NOME>_PORT` e `<NOME>_URL`.
- **Delta Watcher de Sockets e Reatividade Instantânea:**
    - Thread em background em Rust monitorando assinaturas de portas TCP abertas com notificação em tempo real via Tauri IPC (`ports-changed`), reduzindo a dependência de polling estrito.
- **Detecção e Limpeza de Processos Zumbis / Órfãos:**
    - Botão `Limpar Zumbis` e comando Rust `kill_all_orphans` para identificar processos de desenvolvimento cuja árvore de execução original foi perdida (`explorer.exe`, `services.exe` ou pai ausente).

### Changed

- **Correções de Segurança e Code Review:**
    - Escape estrito de aspas simples no PowerShell (`replace('\'', "''")`) para evitar quebras em pastas com apóstrofes ou caracteres especiais.
    - Delimitação com aspas duplas escapadas no comando CMD do VS Code.
    - Sincronização e purga automática de chaves obsoletas nos caches de status e latência (`syncPortsState`), prevenindo vazamentos de memória em sessões contínuas.
    - Tratamento resiliente `.catch(() => {})` em todas as interações com `navigator.clipboard`.
    - Resiliência no Delta Watcher: assinatura só é confirmada após retorno com sucesso da lista de portas.

### Aprendizado da Release

- **Fato observado:** Operações de cópia e invocação de shells externos no Windows exigem sanitização estrita de aspas e tratamento assíncrono para prevenir interrupções de fluxo no WebView2. O uso de SVG puro para QR Code e Sparklines manteve a aplicação ultraleve sem inflar o bundle com dependências externas.
- **Diretriz consolidada:** Sempre sanitizar caminhos de diretório antes de passar para interpolações de shell no Windows (`wt.exe`, `powershell.exe`, `cmd.exe`) e proteger chamadas ao clipboard contra perda transitória de foco.

## [0.1.4] - 2026-09-29

### Added

- **Desbloqueador de Pastas Presas (Folder Unlocker):**
    - Nova aba `[ Desbloquear Pasta ]` para inspeção e encerramento de processos que travam diretórios ou arquivos impedindo renomeação ou exclusão.
    - Implementado backend em Rust com FFI nativa para a API Win32 `Restart Manager` (`Rstrtmgr.dll`) combinada a scanner de CWD (`sysinfo`).
    - Botão de liberação rápida em lote (`Liberar Pasta`) com diálogo de salvaguarda para processos do sistema.
- **Data Grid / Alinhamento em Colunas:**
    - Layout da lista de portas reestruturado em grade estrita com cabeçalho de colunas: `PORTA`, `PROCESSO`, `TIPO`, `PID`, `AÇÃO`.
    - Alinhamento horizontal estável dos badges de categoria e valores de PID, eliminando flutuações visuais decorrentes do tamanho dos nomes de processo.
    - Sub-linha dedicada para caminhos CWD (`📁 C:\...`) e métricas de sistema sem quebrar o alinhamento da grade principal.
- **Botão Parar Todos Dev (`kill-all-dev`):**
    - Ação em lote para encerrar simultaneamente todos os servidores de desenvolvimento ativos, com atalho global de teclado (`Ctrl+Shift+K`).
- **Atalhos Globais de Teclado:**
    - `Ctrl+F` para focar na busca rápida, `F5` / `Ctrl+R` para atualização instantânea e `Ctrl+Shift+K` para encerramento de processos Dev.
- **Suporte de Internacionalização (i18n):**
    - Chaves de tabela e mensagens do desbloqueador traduzidas em `pt-BR` e `en` com testes unitários em Jest.

### Changed

- **Polimento Impeccable Design (Zero Anti-Patterns):**
    - Erradicação de 100% dos 13 anti-patterns catalogados pelo detector nativo Impeccable.
    - Eliminação de halos cromáticos artificiais (`#4ade80`, `#ef4444`, `var(--accent-color)`), substituídos por elevação neutra Fluent 2 (`box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3)`).
    - Elevação de tipografia funcional para o piso mínimo de 11px em botões, tags, PIDs e micro-labels, e 12px para textos descritivos e subtítulos.
    - Indicador de status calmo e estático (`.status-dot`), substituindo a animação contínua de pulso.
    - Substituição da animação horizontal de shimmer no skeleton loader por pulso de opacidade suave e calmo.
    - Adoção de `font-variant-numeric: tabular-nums;` para estabilidade visual de números durante atualizações periódicas.
    - Customização de superfícies nativas do navegador (`::selection`, `:focus-visible`, `caret-color` e `::placeholder` contrastante).
    - Empty state com ícone vetorial e mensagem contextual.

### Aprendizado da Release

- **Fato observado:** O alinhamento flexível sem largura de colunas fixas causava dispersão dos elementos de metadados na tela conforme a variabilidade do comprimento dos nomes de executáveis. A adoção de CSS Grid rígido de 5 colunas com overflow controlado resolveu o problema estético mantendo o tamanho compacto de 410px. O detector do Impeccable comprovou 0 anti-patterns após as correções.
- **Diretriz consolidada:** Manter colunas com larguras pré-definidas para listas com dados tabulares densos em flyouts compactos, e utilizar `tabular-nums` sempre que houver métricas ou contadores atualizados em tempo real.

## [0.1.3] - 2026-09-28

### Added

- Criação da memória de projeto local em `.agent/memory/project-status.md` com arquitetura e histórico de sessões.

### Changed

- Sincronização de governança com o Hub v0.12.5 e avanço automático do canal para `2da70f1f`.
- Atualização do contrato de governança local ([AGENTS.md](AGENTS.md), [GEMINI.md](GEMINI.md)) com inclusão da salvaguarda de reversão em lote.
- Higiene e refatoração de código Rust em `src-tauri/src/lib.rs` (resolução de avisos do Clippy `manual_map` e conformidade com `upper_case_acronyms`).
- Inclusão de `*.exe` e `coverage/` no `.gitignore` para proteção contra versionamento acidental de artefatos.
- Remoção de artefato binário excedente da raiz do repositório.
- Atualização da documentação ([README.md](README.md), [docs/index.html](docs/index.html), [docs/README.md](docs/README.md)) para alinhamento com a versão 0.1.3.

### Aprendizado da Release

- **Fato observado:** A auditoria estrutural e o linter de Rust (`clippy`) identificaram oportunidades de tipagem limpa sem qualquer impacto de runtime. A suíte de testes unitários em JavaScript e Rust permaneceu 100% verde com 0 warnings.
- **Diretriz consolidada:** Manter a proteção de `*.exe` e `coverage/` no `.gitignore` e preservar UTF-8 BOM em todos os arquivos de documentação Markdown.

## [0.1.2] - 2026-09-07

### Added

- Posicionamento da janela via API Win32 `SPI_GETWORKAREA` para alinhamento pixel-perfect sobre a barra de tarefas do Windows 11.
- Suporte a rolagem horizontal das pílulas de categorias (`category-filters`) com a roda do mouse (`wheel`).
- Barra de busca rápida compacta no topo para filtrar instantaneamente por porta (`:3000`), nome do processo ou caminho.
- Categorização automática de processos por tipo (`dev`, `database`, `app`, `system`) com badges coloridos e descritivos.
- Filtros rápidos por pílulas no topo da lista com contagem em tempo real de cada categoria.
- Enriquecimento detalhado da listagem: identificação da pasta do projeto (`cwd`), do script em execução e exibição da linha de comando completa em tooltip.
- Notificação do sistema operacional no Windows Toast na inicialização e banner animado com indicador de status ativo na bandeja.
- Trava de confirmação de segurança antes de forçar o encerramento de processos críticos do sistema Windows.
- Abertura imediata com visibilidade e foco ao iniciar o executável.

### Fixed

- Posicionamento vertical da janela ajustado para respeitar a barra de tarefas do Windows 11 e o fator de escala DPI (`scale_factor`), evitando que o rodapé da janela abra cortado abaixo da tela.
- Ajuste no dimensionamento da janela para 410x580 e maior flexibilidade na largura do nome do projeto, evitando truncamento excessivo.

### Changed

- Higiene e simplificação de código em `src-tauri/src/lib.rs` (resolução de `collapsible_if` no Clippy).
- Atualização e sincronização da documentação técnica e landing page com links para releases oficiais.
- Remoção de scripts e dependências legadas (`convert-icon.js`, `png-to-ico`).

## [0.1.0] - 2026-09-07

### Added

- Migração completa de Electron para arquitetura nativa Rust + Tauri v2.
- Motor nativo em Rust para listagem de sockets TCP em memória via crate `netstat2`.
- Enriquecimento inteligente de processos Node.js, Python e Java a partir da linha de comando via `sysinfo`.
- Ícone na bandeja do sistema (System Tray) nativo em Rust com reposicionamento dinâmico e auto-hide ao perder foco (`blur`).
- Trava de instância única via `tauri-plugin-single-instance`.
- Modal "Sobre" integrado com efeito acrílico e backdrop blur.
- Suíte de testes unitários do backend em Rust (`cargo test`).
- Empacotamento de release com instaladores nativos NSIS e MSI.

### Removed

- Dependências do Electron (`electron`, `electron-builder`, `electron-packager`, `electron-log`).
- Runtimes e scripts legados (`main.js`, `port-manager.js`, `preload.js`, `preload-about.js`, `about.html`).

### Changed

- Tamanho do binário reduzido de ~180 MB para ~8.6 MB.
- Tamanho do instalador reduzido para ~1.9 MB (redução de ~98%).
- Consumo de memória reduzido para ~20-30 MB de RAM.

### Added

- Seção de Doação na landing page (cópia fiel do projeto Dahora)
- Imagens e ícones para seção de doação e desenvolvedor
- Suporte a dark mode na seção de doação
- Seção de download final na landing page

### Changed

- Landing page reestruturada para o esqueleto canônico mantendo conteúdo e visual
- README.md atualizado para o padrão visual Dahora (Hero centralizado, Logo 256px, Emoji no título)
- Padronização de layout (padding, largura, grid) com o projeto Dahora
- Header: removido sublinhado do nome do projeto
- Seção Desenvolvedor: atualizada com foto, cores e efeitos do Dahora
- Dependências de build atualizadas para corrigir alertas de segurança
- Padronização global de tipografia com variáveis CSS (`--font-size-xs` a `--font-size-5xl`)
- Seção de Segurança: Layout ajustado para cards lado a lado (grid fix)
- Seção de Doação: Cores neutralizadas e alinhadas à identidade visual do tema
- README.md atualizado com seção de doações (links e QR codes)
- CI simplificado para job único com lint e testes
- Demo interativa da landing page ampliada em ~10%
- Template de release do README atualizado com placeholders
- Documentação de CI/CD alinhada ao workflow atual
- Documentação consolidada no CHANGELOG (sprints)
- Diagnósticos pendentes movidos para ISSUES.md
- Guias de navegação padronizados nos documentos principais
- Navegação do README simplificada (remoção de Licença e Site Oficial)
- Títulos dos documentos padronizados com hífen no cabeçalho
- Navegação padronizada para linha simples nos documentos
- Documentação de hubs ajustada para remover redundâncias

### Security

- Override de `tar` para versão segura e auditoria `npm` limpa

## [0.0.6] - 2025-12-30

### 📝 Resumo curto

- i18n completo (PT-BR/EN), segurança endurecida e CI/CD configurado
- 31 testes unitários e ~70% de cobertura no port-manager
- Documentação principal consolidada (README, CONTRIBUTING, CHANGELOG)

### 🌍 Internacionalização

- **[NOVO]** Sistema de i18n completo para PT-BR e EN
- Módulo `i18n.js` com suporte a runtime switching
- Traduções automáticas em todos os textos da UI
- LocalStorage persiste preferência de idioma
- Event-driven para sincronização entre janelas

### 🔒 Segurança

- **[CRÍTICO]** Adicionada sanitização de PID para prevenir command injection em `killProcess`
- Habilitado `contextIsolation: true` em todas as janelas Electron
- Removido `nodeIntegration: true` do modal About
- Adicionados Content Security Policy (CSP) headers em index.html e about.html
- Criado preload script dedicado (`preload-about.js`) para modal About

### ✨ Novos Recursos

- Sistema de logging estruturado com electron-log (níveis: debug, info, error)
- Modal "Sobre" com links para GitHub, LinkedIn e site oficial
- Ano dinâmico no rodapé da landing page (atualização automática)

### 🧪 Testes

- Implementados 17 testes unitários para `port-manager.js` (100% passing)
- **[NOVO]** Implementados 14 testes unitários para `i18n.js` (100% passing)
- **Total: 31 testes, 100% passing**
- Configurado Jest com cobertura de código (~70% no módulo port-manager)
- Scripts de teste: `npm test`, `npm run test:watch`, `npm run test:coverage`

### 🔧 Qualidade de Código

- Configurado ESLint 9.x com regras recomendadas
- Configurado Prettier para formatação consistente
- Adicionada documentação JSDoc em todas as funções principais (10+ funções)
- Substituídos "magic numbers" por constantes nomeadas:
    - `PORT_THRESHOLD = 1000`
    - `AUTO_REFRESH_INTERVAL = 5000`
    - `ANIMATION_DURATION = 300`
    - `ENRICHABLE_PROCESSES`, `IGNORED_FOLDERS`

### 🏗️ Refatoração

- Extraída lógica de `extractProjectName()` em função separada e testável
- Melhorado parsing de command lines com regex para paths com espaços
- Corrigido tratamento de paths do Windows com múltiplas aspas
- Adicionado logging em operações críticas (getPorts, killProcess, openExternal)

### 🚀 CI/CD

- Configurado GitHub Actions pipeline:
    - Execução automática de testes
    - Validação de linting

### 📚 Documentação

- Atualizado README.md com:
    - Seção de Desenvolvimento e Scripts
    - Arquitetura e Boas Práticas
    - Guia de Contribuição
    - Informações de Segurança implementadas
- Adicionado CHANGELOG.md
- **[NOVO]** Criado CONTRIBUTING.md com guia completo de contribuição
- Corrigida referência de `icon.png` para `icon.svg`

### 🐛 Correções

- **Bug**: `extractProjectName` não tratava corretamente paths com espaços → Corrigido com regex aprimorado
- **Bug**: Função retornava "Program Files" em vez do nome real do projeto → Corrigido
- **Bug**: Paths que terminavam com o nome do processo não eram ignorados → Corrigido
- **Bug**: `console.error` em vez de `log.error` no netstat → Corrigido
- **Bug**: Variáveis não utilizadas gerando warnings de linting → Todas corrigidas

### 🎨 Interface

- Logo convertida para SVG (icon.svg) - transparente e escalável
- Animação de pulso restaurada no hint "Teste aqui" da landing page
- Alinhamento corrigido do simulador de app no hero da landing
- Texto "& Trader" removido da seção Desenvolvedor

### 🔄 Alterações Internas

- Refatorado `port-manager.js` com melhor separação de responsabilidades
- Imports otimizados (removidos `Menu`, `dialog` não utilizados)
- Parâmetros não utilizados prefixados com `_` (convenção ESLint)
- Adicionado tratamento de null/undefined em `extractProjectName()`

### 📊 Resumo dos Sprints

- **Sprint 1 (Segurança & Qualidade):** vulnerabilidades críticas corrigidas, isolamento de contexto, CSP, refatoração e logging estruturado.
- **Sprint 2 (Testes & Infraestrutura):** testes automatizados, cobertura ~70%, linting/formatting e CI/CD com validação automática.
- **Sprint 3 (Documentação & i18n):** documentação consolidada, suporte a dois idiomas e estabilização de métricas.
- **Qualidade final:** 31 testes (100% passing), ~70% cobertura, 0 erros de linting.
- **Segurança final:** 0 vulnerabilidades críticas, context isolation em todas as janelas.

---

## [0.0.5] - Versão Anterior

_(Histórico não documentado)_

---

## Tipos de Mudanças

- `Added` - Novos recursos
- `Changed` - Mudanças em funcionalidades existentes
- `Deprecated` - Recursos que serão removidos
- `Removed` - Recursos removidos
- `Fixed` - Correções de bugs
- `Security` - Correções de vulnerabilidades
