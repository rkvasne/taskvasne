<div align="center">

<h1>💀 Taskvasne</h1>

<img src="icon.svg" width="256" height="256" alt="Taskvasne Icon">

**O gerenciador de portas minimalista e elegante para Windows 11.**  
_Controle rápido sobre seus ambientes locais (Node.js, Docker, etc.) com design moderno._

[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg?style=for-the-badge)](https://github.com/rkvasne/taskvasne/releases)
[![Rust](https://img.shields.io/badge/rust-1.77%2B-red.svg?style=for-the-badge)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/tauri-v2-yellow.svg?style=for-the-badge)](https://tauri.app/)
[![License](https://img.shields.io/badge/license-MIT-orange.svg?style=for-the-badge)](https://choosealicense.com/licenses/mit/)
[![Tests](https://img.shields.io/badge/tests-automated-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md#-testes)
[![Architecture](https://img.shields.io/badge/architecture-documented-brightblue.svg?style=for-the-badge)](#-arquitetura-e-boas-praticas)

[Sobre](#-sobre) • [Funcionalidades](#-funcionalidades) • [Instalação](#-instalação) • [Como Usar](#-como-usar) • [Documentação](#-documentação) • [Apoie o Projeto](#-apoie-o-projeto-opcional) • [Contribuição](CONTRIBUTING.md) • [Segurança](SECURITY.md) • [Changelog](CHANGELOG.md)

</div>

## 📖 Sobre

Taskvasne é um gerenciador de portas para Windows 11 ultra-leve construído em **Rust** e **Tauri v2**, substituindo runtimes pesados por um binário nativo de alto desempenho (~8.6 MB, ~25 MB de RAM). Facilita visualizar e encerrar processos em portas locais, com foco em rapidez, clareza e interface moderna com tema escuro.

## ✨ Funcionalidades

- **Motor Nativo Rust**: Varredura direta de sockets TCP em memória via APIs de sistema, sem processos externos lentos.
- **Ultra Leve**: Consumo mínimo de memória (~20-30 MB de RAM) e binário executável otimizado.
- **Categorização Automática**: Classificação inteligente em **Dev**, **Bancos de Dados**, **Apps** e **Sistema Windows**, com badges visuais e filtros rápidos por pílula.
- **Identificação Aprofundada**: Exibe o nome do projeto, pasta de trabalho (`cwd`), script em execução (`telemetry-server.js`, `index.mjs`) e linha de comando completa em tooltip.
- **Segurança Operacional**: Trava de confirmação de segurança para processos críticos do sistema operacional.
- **Visibilidade no Startup**: Notificação no Windows ao iniciar e banner visual animado indicando atividade na bandeja.
- **Monitoramento Instantâneo**: Visualize todas as portas TCP ativas (acima de 1000) em tempo real.
- **Internacionalização**: Suporte completo a PT-BR e EN com troca em tempo real (localStorage persistente).
- **Design Windows 11**: Interface moderna, compacta, frameless e com modo escuro nativo.
- **System Tray**: Vive silenciosamente na bandeja do sistema. Um clique para abrir, um clique para fechar.
- **Modal Sobre**: Janela "Sobre" embutida com informações do aplicativo, links para GitHub, LinkedIn e site oficial.
- **Kill Process**: Encerre processos travados ou indesejados com um único clique e feedback visual suave.
- **Atualização Automática**: A lista de portas se atualiza automaticamente a cada 5 segundos com botão de refresh manual.
- **Click-to-Open**: Clique no número da porta ou no nome do processo para abrir `http://localhost:<porta>` no navegador padrão.
- **Instância Única**: Previne múltiplas janelas, focando a instância existente caso seja aberta novamente.

## 🔒 Segurança e Privacidade

- Resumo público: https://taskvasne.vercel.app/#security
- Detalhes técnicos e mudanças: [CHANGELOG.md](CHANGELOG.md)

## 👨‍💻 Desenvolvimento

### Pré-requisitos

- Rust 1.77+ (com `cargo` e `rustc`)
- Node.js 18+ instalado
- Windows 10 ou 11

### Configuração do Ambiente

Para setup completo, scripts, testes e fluxo de PR, veja [CONTRIBUTING.md](CONTRIBUTING.md).

### Scripts Disponíveis

```bash
npm run dev            # Inicia o app em modo desenvolvimento (Tauri Dev)
npm run build          # Gera os instaladores NSIS e MSI de release (Tauri Build)
npm test               # Executa testes unitários do Frontend (Jest)
cargo test --manifest-path src-tauri/Cargo.toml # Executa testes unitários do Rust
npm run lint           # Verifica qualidade do código JS
npm run format         # Formata código com Prettier
```

## 🚀 Instalação

### Pré-requisitos para Uso

- Windows 10 ou 11

### Download

Baixe a versão mais recente em [taskvasne.vercel.app](https://taskvasne.vercel.app) ou diretamente do GitHub:

**Opção 1: Via Site Oficial (Recomendado)**

Acesse [taskvasne.vercel.app](https://taskvasne.vercel.app) para baixar o instalador oficial.

**Opção 2: Direto das Releases do GitHub**

Acesse [GitHub Releases](https://github.com/rkvasne/taskvasne/releases/latest) e baixe o formato desejado:

- `taskvasne_0.1.1_x64-setup.exe` (Instalador NSIS, ~1.9 MB)
- `taskvasne_0.1.1_x64_en-US.msi` (Instalador MSI, ~2.9 MB)
- `taskvasne.exe` (Binário standalone portátil, ~8.6 MB)

**Instalação:**

1. Baixe o instalador (`.exe` ou `.msi`) ou utilize a versão portátil standalone.
2. Execute o Taskvasne. O aplicativo iniciará minimizado na bandeja do sistema (System Tray).

## 🚀 Como Usar

1. Abra o `Taskvasne.exe`.
2. Aguarde a lista carregar ou clique em **Refresh**.
3. Clique na porta para abrir `http://localhost:<porta>` no navegador.
4. Clique em **Stop** para encerrar processos indesejados.

## 🌐 Site (Documentação Web)

O site publicado em [taskvasne.vercel.app](https://taskvasne.vercel.app) é servido a partir da pasta `docs/`.

- A configuração de deploy/rotas está em `vercel.json`.
- Para pré-visualizar localmente, basta servir a pasta `docs/` via qualquer servidor estático.
    - Exemplo: `npx serve docs`

## 📚 Documentação

Consulte o índice central em [docs/README.md](docs/README.md).

### 📦 Distribuição e Arquitetura

#### Geração do Executável (Tauri v2 + Rust)

O projeto utiliza o motor nativo do **Tauri v2** acoplado ao compilador **Rust** para gerar binários otimizados, protegidos e compactos para Windows 10/11.

1. **Comando de Build:**

    ```bash
    npm run build
    ```

    Este comando compila o código Rust em modo release (`cargo build --release`) e empacota o executável e instaladores oficiais.

2. **Resultado:**
   Os artefatos finais são gerados em `src-tauri/target/release/`:
    - `taskvasne.exe`: Executável nativo standalone (~8.6 MB).
    - `bundle/nsis/taskvasne_0.1.1_x64-setup.exe`: Instalador moderno NSIS (~1.9 MB).
    - `bundle/msi/taskvasne_0.1.1_x64_en-US.msi`: Instalador MSI para ambientes corporativos (~2.9 MB).

#### Vantagens da Arquitetura Rust + Tauri v2 vs Electron:

- **Tamanho Reduzido:** O download caiu de ~114 MB (Electron ZIP) para apenas ~1.9 MB (instalador) e ~8.6 MB (standalone).
- **Consumo de Memória:** Queda drástica de ~180 MB para ~20-30 MB de RAM.
- **Segurança e Desempenho:** Inspeção nativa em memória via `sysinfo` e `netstat2`, sem criação de processos shell paralelos.
- **Distribuição Direta:** Releases distribuídas diretamente via GitHub Releases, eliminando dependência de Git LFS no repositório de código.

## ☕ Apoie o Projeto (Opcional)

Se o Taskvasne te ajuda no dia a dia e você quiser apoiar o desenvolvimento, você tem várias formas de contribuir financeiramente:

### 💳 Métodos de Doação

- **GitHub Sponsors** → https://github.com/sponsors/rkvasne
- **Mercado Pago** (Brasil) → https://link.mercadopago.com.br/kvasne
- **PayPal** (Internacional) → https://www.paypal.com/donate/?hosted_button_id=JJFQZK647286S
- **Pix** (Brasil) → `fa550c5d-fdaf-4484-b52b-760071fe524d`

### 📱 QR Codes (Pix / PayPal)

Escaneie para doação rápida via **Pix** ou **PayPal**:

<div align="center">

|                                       Pix                                        |                                         PayPal                                         |
| :------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------: |
| <img src="docs/landing/images/qr_pix.png" alt="QR Pix" width="150" height="150"> | <img src="docs/landing/images/qr_paypal.png" alt="QR PayPal" width="150" height="150"> |

</div>

### 🤝 Outras Formas de Apoio

Não tem condições financeiras? Sem problema! Você também pode ajudar:

- Contribuindo com **issues, PRs e sugestões** de melhoria
- Divulgando o projeto com amigos e na comunidade
- Reportando bugs e sugestões de features

> **Nota:** O Taskvasne permanece **100% open-source e gratuito**. Doações são completamente opcionais e ajudam a manter o ritmo de desenvolvimento e novas features.

## 🛠️ Tecnologias

- **Electron**: Core do aplicativo.
- **Vanilla JS/CSS**: Para máxima performance e leveza.
- **Windows API**: Integração nativa via `netstat` e `tasklist`.
- **electron-log**: Sistema de logging estruturado para debugging e monitoramento.

## 🏛️ Arquitetura e Boas Práticas

### Estrutura do Projeto

```text
taskvasne/
├── src-tauri/               # Backend nativo Rust (Tauri v2)
│   ├── Cargo.toml           # Dependências Rust e metadados
│   ├── tauri.conf.json      # Configuração da janela, tray e empacotamento
│   └── src/
│       ├── main.rs          # Entrypoint Windows sem console
│       └── lib.rs           # Motor de portas, enriquecimento, IPC e Tray
├── ui/                      # Frontend do App Desktop (HTML/CSS/JS)
│   ├── index.html           # Layout flyout e modal Sobre
│   ├── styles.css           # Estilos Fluent Windows 11
│   ├── renderer.js          # IPC bridge e renderizador de portas
│   └── i18n.js              # Internacionalização runtime (PT-BR/EN)
├── tests/                   # Testes unitários do frontend (Jest)
├── docs/                    # Landing page pública (Vercel)
└── package.json             # Scripts Tauri CLI e linters
```

### Princípios Implementados

- **Separação de Responsabilidades**: Módulos dedicados para cada funcionalidade
- **Constantes Nomeadas**: Todos os magic numbers substituídos por constantes
- **Logging Estruturado**: Sistema de logs com níveis (debug, info, error)
- **Funções Testáveis**: Lógica extraída em funções puras
- **Documentação JSDoc**: Todas as funções públicas documentadas
- **Segurança por Design**: Context isolation, input sanitization, CSP headers

## 📋 Processo de Release

Para criar uma nova versão do Taskvasne:

### 1. Atualizar Versão

**package.json:**

```json
{
    "version": "X.Y.Z"
}
```

**README.md:**

```markdown
![Version](https://img.shields.io/badge/version-X.Y.Z-purple?style=for-the-badge)
```

**docs/index.html:**

```html
<title>Taskvasne vX.Y.Z - Kvasne.com</title>
<div class="badge">vX.Y.Z BETA</div>
```

### 2. Atualizar CHANGELOG.md

```markdown
## [X.Y.Z] - DD/MM/AAAA

### Adicionado

- Nova feature X
- Suporte para Y

### Corrigido

- Bug Z
```

### 3. Build e Upload

```bash
# 1. Gerar build
npm run dist

# 2. Criar ZIP
Compress-Archive -Path dist-portable/Taskvasne-win32-x64 -DestinationPath dist-portable/Taskvasne.zip

# 3. Adicionar ao Git LFS
git add -f dist-portable/Taskvasne.zip
git add package.json README.md docs/index.html CHANGELOG.md

# 4. Commit
git commit -m "release: vX.Y.Z - Description

- Feature 1
- Feature 2
- Bug fixes"

# 5. Tag
git tag -a vX.Y.Z -m "Release vX.Y.Z

Highlights:
- Feature 1
- Feature 2"

# 6. Push
git push origin main
git push origin vX.Y.Z
```

### 4. GitHub Release

1. Acesse: https://github.com/rkvasne/taskvasne/releases/new
2. **Tag:** `vX.Y.Z`
3. **Title:** "Taskvasne vX.Y.Z - [Nome da Release]"
4. **Description:** Copie do CHANGELOG.md
5. **Binário:** Não precisa anexar (já está no LFS)
6. **Link:** Adicione na descrição:
    ```markdown
    📦 **Download:** [Taskvasne.zip](https://github.com/rkvasne/taskvasne/raw/main/dist-portable/Taskvasne.zip) (114 MB)
    ```
7. Marque como **Pre-release** se for BETA
8. Clique em **Publish release**

### 5. Verificar Deploy

- ✅ Landing page atualizada: https://taskvasne.vercel.app
- ✅ GitHub Release criada
- ✅ Download funcionando
- ✅ CI/CD passou (GitHub Actions)

### Checklist de Release Completo

- [ ] Versão atualizada (package.json, README, landing page)
- [ ] CHANGELOG.md atualizado
- [ ] Todos os testes passando (`npm test`)
- [ ] Linting sem erros (`npm run lint`)
- [ ] Build gerado (`npm run dist`)
- [ ] ZIP criado e adicionado ao LFS
- [ ] Commit e tag criados
- [ ] Push realizado (main + tag)
- [ ] GitHub Release publicada
- [ ] Landing page verificada (Vercel)
- [ ] Download testado
- [ ] CI/CD passou
- [ ] Ignorar pasta dist em validações (evitar falsos positivos)

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para orientações completas.

Veja o [CHANGELOG.md](CHANGELOG.md) para histórico completo de mudanças.

### 📚 Documentação Adicional

- [CHANGELOG.md](CHANGELOG.md) - Histórico de mudanças
- [ISSUES.md](ISSUES.md) - Diagnósticos pendentes
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guia de contribuição

## 👨‍💻 Autor

Desenvolvido por **Raphael Kvasne**.

- 🌐 **Projeto**: [taskvasne.vercel.app](https://taskvasne.vercel.app)
- 👨‍💻 **Portfolio**: [kvasne.com](https://kvasne.com)
- 📧 **Email**: [raphael@kvasne.com](mailto:raphael@kvasne.com)
- 💼 **LinkedIn**: [Raphael Kvasne](https://www.linkedin.com/in/rkvasne/)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes.
