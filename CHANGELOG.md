# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added
- Seção de Doação na landing page (cópia fiel do projeto Dahora)
- Imagens e ícones para seção de doação e desenvolvedor
- Suporte a dark mode na seção de doação

### Changed
- Landing page reestruturada para o esqueleto canônico mantendo conteúdo e visual
- Padronização de layout (padding, largura, grid) com o projeto Dahora
- Header: removido sublinhado do nome do projeto
- Seção Desenvolvedor: atualizada com foto, cores e efeitos do Dahora
- Dependências de build atualizadas para corrigir alertas de segurança

### Security
- Override de `tar` para versão segura e auditoria `npm` limpa

## [0.0.6] - 30/12/2025

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
  - Build do executável Windows
  - Upload de artifacts

### 📚 Documentação
- Atualizado README.md com:
  - Seção de Desenvolvimento e Scripts
  - Arquitetura e Boas Práticas
  - Guia de Contribuição
  - Informações de Segurança implementadas
- Adicionado CHANGELOG.md
- Criado docs/analise-tecnica.md com relatório completo do projeto
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

---

## [0.0.5] - Versão Anterior
*(Histórico não documentado)*

---

## Tipos de Mudanças
- `Added` - Novos recursos
- `Changed` - Mudanças em funcionalidades existentes
- `Deprecated` - Recursos que serão removidos
- `Removed` - Recursos removidos
- `Fixed` - Correções de bugs
- `Security` - Correções de vulnerabilidades
