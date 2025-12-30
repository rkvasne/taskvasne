# Taskvasne

![License](https://img.shields.io/github/license/rkvasne/taskvasne?style=for-the-badge&color=blue)
![Version](https://img.shields.io/badge/version-0.0.6-purple?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows-purple?style=for-the-badge)
![Vercel](https://img.shields.io/badge/vercel-deployed-black?style=for-the-badge&logo=vercel)
![Tests](https://img.shields.io/badge/tests-31%20passing-brightgreen?style=for-the-badge)
![Coverage](https://img.shields.io/badge/coverage-70%25-yellow?style=for-the-badge)

> **Taskvasne** é um gerenciador de portas minimalista e elegante para Windows 11, projetado para desenvolvedores que precisam de controle rápido sobre seus ambientes locais (Node.js, Docker, etc.).
>
> **Status:** v0.0.6 (✨ BETA-READY)
>
> 🌐 **Acesse o site oficial:** [taskvasne.vercel.app](https://taskvasne.vercel.app) (Disponível em PT-BR e EN)

<p align="center">
  <img src="icon.svg" width="128" alt="Taskvasne Icon">
</p>

## ✨ Funcionalidades

*   **⚡ Monitoramento Instantâneo**: Visualize todas as portas TCP ativas (acima de 1000) em tempo real.
*   **🧠 Identificação Inteligente**: Reconhece automaticamente o nome do projeto (pasta) para processos Node.js, Python e Java, facilitando a identificação de qual projeto está rodando em qual porta.
*   **� Internacionalização**: Suporte completo a PT-BR e EN com troca em tempo real (localStorage persistente).
*   **�🎨 Design Windows 11**: Interface moderna, compacta, frameless e com modo escuro nativo.
*   **🛡️ System Tray**: Vive silenciosamente na sua bandeja do sistema. Um clique para abrir, um clique para fechar.
*   **ℹ️ Modal Sobre**: Janela "Sobre" com informações do aplicativo, links para GitHub, LinkedIn e site oficial.
*   **🛑 Kill Process**: Encerre processos travados ou indesejados com um único clique.
    *   *Feedback Visual*: O item desliza e desaparece suavemente ao ser encerrado.
    *   *Sem Interrupções*: Ação imediata para manter seu fluxo de trabalho rápido.
*   **🔄 Atualização Automática**: A lista de portas se atualiza automaticamente a cada 5 segundos. Também possui botão de refresh manual.
*   **🔗 Click-to-Open**: Clique no número da porta ou no nome do processo para abrir `http://localhost:<porta>` instantaneamente no seu navegador padrão.
*   **🔒 Instância Única**: Previne múltiplas janelas, mantendo seu fluxo de trabalho limpo.

## 🛡️ Segurança e Privacidade

*   **Código Aberto**: Todo o código fonte está disponível no GitHub. Você pode auditar cada linha.
*   **Zero Telemetria**: Não coletamos dados, não rastreamos seu uso e não enviamos nada para a nuvem.
*   **Sem Malware**: Livre de vírus, keyloggers ou qualquer software malicioso. Garantia de código limpo.
*   **Context Isolation**: Utiliza `contextIsolation` e `preload scripts` para isolar código e prevenir vulnerabilidades.
*   **Input Sanitization**: Todos os inputs do usuário são validados antes de execução de comandos do sistema.
*   **Content Security Policy**: Headers CSP configurados para prevenir ataques XSS.

## �‍💻 Desenvolvimento

### Pré-requisitos
*   Node.js 18+ instalado
*   Windows 10 ou 11

### Configuração do Ambiente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/rkvasne/taskvasne.git
    cd taskvasne
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o aplicativo em modo desenvolvimento:
    ```bash
    npm start
    ```

### Scripts Disponíveis

```bash
npm start              # Inicia o app em modo desenvolvimento
npm test               # Executa testes unitários
npm run test:watch     # Executa testes em modo watch
npm run test:coverage  # Gera relatório de cobertura
npm run lint           # Verifica qualidade do código
npm run lint:fix       # Corrige automaticamente problemas de linting
npm run format         # Formata código com Prettier
npm run dist           # Gera build portátil (.exe)
```

### Testes Automatizados

O projeto conta com testes unitários usando Jest:

```bash
npm test
```

**Cobertura atual:** ~70% (módulo port-manager)
- 17 testes implementados
- Validação de extração de nomes de projetos
- Tratamento de edge cases e erros

### Qualidade de Código

*   **ESLint**: Linting automático configurado
*   **Prettier**: Formatação consistente
*   **JSDoc**: Documentação completa de funções
*   **CI/CD**: GitHub Actions pipeline automático

## 🚀 Instalação

### Pré-requisitos para Uso
*   Windows 10 ou 11

### Download

Baixe a versão mais recente em [taskvasne.vercel.app](https://taskvasne.vercel.app) ou diretamente do GitHub:

**Opção 1: Via Site (Recomendado)**
```bash
https://taskvasne.vercel.app/#download
```

**Opção 2: Direto do GitHub (Git LFS)**
```bash
# Link direto para download (114 MB)
https://github.com/rkvasne/taskvasne/raw/main/dist-portable/Taskvasne.zip
```

**Instalação:**
1. Extraia o arquivo ZIP
2. Execute `Taskvasne.exe`
3. Pronto! Sem instalação necessária (aplicação portátil)

## 🌐 Site (Documentação Web)

O site publicado em [taskvasne.vercel.app](https://taskvasne.vercel.app) é servido a partir da pasta `docs/`.

- A configuração de deploy/rotas está em `vercel.json`.
- Para pré-visualizar localmente, basta servir a pasta `docs/` via qualquer servidor estático.
    - Exemplo: `npx serve docs`

### 📦 Distribuição e Arquitetura

#### Geração do Executável
O projeto utiliza o `electron-packager` para criar uma versão portátil e otimizada para Windows x64.

1.  **Comando de Build**:
    ```bash
    npm run dist
    ```
    Este comando executa o script configurado no `package.json`:
    ```json
    "dist": "electron-packager . \"Taskvasne\" --platform=win32 --arch=x64 --out=dist-portable --overwrite --icon=icon.ico ..."
    ```

2.  **Resultado**:
    O processo gera a pasta `dist-portable/Taskvasne-win32-x64`, contendo o executável e todas as dependências necessárias.

#### Conteúdo do Pacote (Zip)
O arquivo `Taskvasne.zip` é uma compressão da pasta gerada acima. Ele contém tudo o que o aplicativo precisa para rodar isoladamente (Standalone):

*   **Taskvasne.exe**: O ponto de entrada do aplicativo.
*   **Bibliotecas Gráficas e Multimídia (DLLs)**:
    *   `ffmpeg.dll`: Suporte a áudio e vídeo.
    *   `libGLESv2.dll`, `libEGL.dll`: Renderização gráfica (OpenGL/WebGL).
    *   `vulkan-1.dll`, `vk_swiftshader.dll`: Suporte a Vulkan.
    *   `d3dcompiler_47.dll`, `dxcompiler.dll`: Compiladores DirectX.
*   **Core do Electron**:
    *   `resources.pak`, `chrome_*.pak`: Recursos visuais do Chromium.
    *   `icudtl.dat`: Suporte a internacionalização (i18n).
*   **Código Fonte**:
    *   `resources/`: Pasta contendo o código da aplicação (`main.js`, `renderer.js`, `index.html`, etc.), geralmente empacotado.

#### Versionamento no Git (Git LFS)
Devido ao tamanho do binário (`Taskvasne.zip` ~114MB), utilizamos o **Git LFS (Large File Storage)** para versionamento.

##### 📌 Por que Git LFS?

**Sem LFS (problema):**
- ❌ Repositório incha com cada versão (~100+ MB por release)
- ❌ Clone lento (baixa todo histórico de binários)
- ❌ Operações Git ficam lentas

**Com LFS (solução):**
- ✅ Apenas ponteiros no Git (~100 bytes)
- ✅ Clone rápido (binários baixados sob demanda)
- ✅ Repositório permanece leve
- ✅ Versionamento eficiente de binários

##### 🔧 Configuração Inicial (Setup)

**1. Instalação do Git LFS:**
```bash
git lfs install
git lfs version  # Verificar instalação
```

**2. Configuração (.gitattributes):**
```ini
*.exe filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
```

Este arquivo configura quais tipos de arquivo são rastreados pelo LFS.

##### 📦 Envio de Novos Binários (Release)

**Passo 1: Gerar Build**
```bash
npm run dist  # Gera dist-portable/Taskvasne-win32-x64/
```

**Passo 2: Criar ZIP (opcional)**
```powershell
# PowerShell
Compress-Archive -Path dist-portable/Taskvasne-win32-x64 -DestinationPath dist-portable/Taskvasne.zip
```

**Passo 3: Adicionar ao Git LFS**
```bash
# Forçar adição (ignora .gitignore)
git add -f dist-portable/Taskvasne.zip
git add .gitattributes
```

**Passo 4: Commit**
```bash
git commit -m "release: v0.0.7 - Add new portable build to LFS

- Taskvasne.zip (~114 MB)
- Bug fixes and improvements"
```

**Passo 5: Push (Upload LFS)**
```bash
git push origin main
```

**Saída esperada:**
```
Uploading LFS objects: 100% (1/1), 114 MB | 9.2 MB/s, done
Enumerating objects: 5, done.
...
To https://github.com/rkvasne/taskvasne.git
   abc1234..def5678  main -> main
```

##### ✅ Verificação

**Listar arquivos no LFS:**
```bash
git lfs ls-files
```

**Saída esperada:**
```
65b2de1e3a * dist-portable/Taskvasne.zip
454beb7c1c * docs/Taskvasne.zip
```

**Verificar status:**
```bash
git lfs status
```

##### 🔄 Clone do Repositório (para novos colaboradores)

**Com LFS instalado (recomendado):**
```bash
git clone https://github.com/rkvasne/taskvasne.git
cd taskvasne
git lfs pull  # Baixa arquivos LFS
```

**Sem LFS (apenas código):**
```bash
git clone https://github.com/rkvasne/taskvasne.git
# Binários aparecem como ponteiros (texto pequeno)
# Para baixar: git lfs install && git lfs pull
```

##### 🚨 Troubleshooting

**Problema: Arquivo não vai para LFS**
```bash
# Remover do cache
git rm --cached dist-portable/Taskvasne.zip

# Adicionar novamente (com LFS)
git add -f dist-portable/Taskvasne.zip

# Amend commit
git commit --amend --no-edit

# Force push (CUIDADO!)
git push origin main --force
```

**Problema: Clone sem LFS**
```bash
git lfs install
git lfs pull
```

**Problema: Autenticação**
```bash
git config lfs.url https://github.com/rkvasne/taskvasne.git/info/lfs
git credential reject
git push origin main  # Redigitar credenciais
```

##### 📊 Histórico de Uploads

| Data | Versão | Arquivo | Tamanho | Commit |
|------|--------|---------|---------|--------|
| 2025-12-30 | v0.0.6 | dist-portable/Taskvasne.zip | 114 MB | cd1ec52 |
| 2025-11-28 | - | docs/Taskvasne.zip | 109 MB | (anterior) |

##### 📖 Documentação Completa

Para mais detalhes sobre Git LFS, veja:
- [GIT_LFS_SETUP.md](GIT_LFS_SETUP.md) - Guia completo de configuração
- [Git LFS Documentation](https://git-lfs.github.com/)
- [GitHub LFS Guide](https://docs.github.com/en/repositories/working-with-files/managing-large-files)

##### 🔗 Download via Raw URL

Para garantir o download direto do binário (e não do ponteiro LFS), o link no site utiliza:
```
https://github.com/rkvasne/taskvasne/raw/main/dist-portable/Taskvasne.zip
```

O GitHub detecta automaticamente arquivos LFS e serve o binário real, não o ponteiro.

## 🛠️ Tecnologias

*   **Electron**: Core do aplicativo.
*   **Vanilla JS/CSS**: Para máxima performance e leveza.
*   **Windows API**: Integração nativa via `netstat` e `tasklist`.*   **electron-log**: Sistema de logging estruturado para debugging e monitoramento.

## 🏛️ Arquitetura e Boas Práticas

### Estrutura do Projeto

```
taskvasne/
├── main.js                  # Main process (Electron)
├── renderer.js              # Renderer process (UI)
├── port-manager.js          # Lógica de gerenciamento de portas
├── preload.js               # Preload script (contextBridge)
├── preload-about.js         # Preload para modal About
├── index.html               # UI principal
├── about.html               # Modal "Sobre"
├── styles.css               # Estilos da aplicação
├── __tests__/               # Testes unitários
└── docs/                    # Landing page (Vercel)
```

### Princípios Implementados

*   **Separação de Responsabilidades**: Módulos dedicados para cada funcionalidade
*   **Constantes Nomeadas**: Todos os magic numbers substituídos por constantes
*   **Logging Estruturado**: Sistema de logs com níveis (debug, info, error)
*   **Funções Testáveis**: Lógica extraída em funções puras
*   **Documentação JSDoc**: Todas as funções públicas documentadas
*   **Segurança por Design**: Context isolation, input sanitization, CSP headers
## 📋 Processo de Release

Para criar uma nova versão do Taskvasne:

### 1. Atualizar Versão

**package.json:**
```json
{
  "version": "0.0.7"
}
```

**README.md:**
```markdown
![Version](https://img.shields.io/badge/version-0.0.7-purple?style=for-the-badge)
```

**docs/index.html:**
```html
<title>Taskvasne v0.0.7 - Kvasne.com</title>
<div class="badge">v0.0.7 BETA</div>
```

### 2. Atualizar CHANGELOG.md

```markdown
## [0.0.7] - 2025-01-15

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
git commit -m "release: v0.0.7 - Description

- Feature 1
- Feature 2
- Bug fixes"

# 5. Tag
git tag -a v0.0.7 -m "Release v0.0.7

Highlights:
- Feature 1
- Feature 2"

# 6. Push
git push origin main
git push origin v0.0.7
```

### 4. GitHub Release

1. Acesse: https://github.com/rkvasne/taskvasne/releases/new
2. **Tag:** `v0.0.7`
3. **Title:** "Taskvasne v0.0.7 - [Nome da Release]"
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

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para orientações completas.

**Resumo rápido:**
1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

**Antes de submeter:**
- Execute `npm test` (todos os 31 testes devem passar)
- Execute `npm run lint` (zero erros)
- Execute `npm run format` (código formatado)

Veja o [CHANGELOG.md](CHANGELOG.md) para histórico completo de mudanças.

### 📚 Documentação Adicional

- [SPRINT1_REPORT.md](SPRINT1_REPORT.md) - Relatório Sprint 1 (Segurança & Qualidade)
- [SPRINT2_REPORT.md](SPRINT2_REPORT.md) - Relatório Sprint 2 (Testes & Infraestrutura)
- [SPRINT3_REPORT.md](SPRINT3_REPORT.md) - Relatório Sprint 3 (i18n & Documentação)
- [RELEASE_NOTES.md](RELEASE_NOTES.md) - Notas de release completas v0.0.6
- [GIT_LFS_SETUP.md](GIT_LFS_SETUP.md) - Guia completo de Git LFS
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guia de contribuição

## 👨‍💻 Autor

Desenvolvido com ☕ por **Raphael Kvasne**.

*   🌐 **Projeto**: [taskvasne.vercel.app](https://taskvasne.vercel.app)
*   👨‍💻 **Portfolio**: [kvasne.com](https://kvasne.com)
*   📧 **Email**: [raphael@kvasne.com](mailto:raphael@kvasne.com)
*   💼 **LinkedIn**: [Raphael Kvasne](https://www.linkedin.com/in/rkvasne/)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
