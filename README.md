# Taskvasne

![License](https://img.shields.io/github/license/rkvasne/taskvasne?style=for-the-badge&color=blue)
![Version](https://img.shields.io/badge/version-0.0.6-purple?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows-purple?style=for-the-badge)
![Vercel](https://img.shields.io/badge/vercel-deployed-black?style=for-the-badge&logo=vercel)

> **Taskvasne** é um gerenciador de portas minimalista e elegante para Windows 11, projetado para desenvolvedores que precisam de controle rápido sobre seus ambientes locais (Node.js, Docker, etc.).
>
> **Status:** v0.0.6 (ALPHA)
>
> 🌐 **Acesse o site oficial:** [taskvasne.vercel.app](https://taskvasne.vercel.app) (Disponível em PT-BR e EN)

<p align="center">
  <img src="icon.png" width="128" alt="Taskvasne Icon">
</p>

## ✨ Funcionalidades

*   **⚡ Monitoramento Instantâneo**: Visualize todas as portas TCP ativas (acima de 1000) em tempo real.
*   **🧠 Identificação Inteligente**: Reconhece automaticamente o nome do projeto (pasta) para processos Node.js, Python e Java, facilitando a identificação de qual projeto está rodando em qual porta.
*   **🎨 Design Windows 11**: Interface moderna, compacta, frameless e com modo escuro nativo.
*   **🛡️ System Tray**: Vive silenciosamente na sua bandeja do sistema. Um clique para abrir, um clique para fechar.
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

## 🚀 Instalação

### Pré-requisitos
*   Node.js instalado.
*   Windows 10 ou 11.

### Rodando Localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/rkvasne/taskvasne.git
    ```
2.  Instale as dependências:
    ```bash
    npm install
    ```
3.  Inicie o aplicativo:
    ```bash
    npm start
    ```

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
Devido ao tamanho do binário (`Taskvasne.zip` ~140MB), utilizamos o **Git LFS (Large File Storage)** para versionamento.

1.  **Configuração (.gitattributes)**:
    O arquivo foi configurado para ser rastreado pelo LFS:
    ```ini
    docs/Taskvasne.zip filter=lfs diff=lfs merge=lfs -text
    ```

2.  **Como o arquivo foi aceito**:
    Como arquivos `.zip` estão listados no `.gitignore` para evitar commits acidentais de builds locais, foi necessário forçar a adição do arquivo de distribuição oficial:
    ```bash
    git add -f docs/Taskvasne.zip
    ```
    Isso garante que apenas este zip específico (hospedado na pasta `docs/` para download via GitHub Pages/Raw) seja versionado, enquanto outros zips temporários continuam ignorados.

3.  **Download via Raw URL**:
    Para garantir o download direto do binário (e não do ponteiro LFS), o link no site utiliza o parâmetro `?raw=true`:
    `https://github.com/rkvasne/taskvasne/blob/main/docs/Taskvasne.zip?raw=true`

## 🛠️ Tecnologias

*   **Electron**: Core do aplicativo.
*   **Vanilla JS/CSS**: Para máxima performance e leveza.
*   **Windows API**: Integração nativa via `netstat` e `tasklist`.

## 👤 Autor

Desenvolvido com ☕ por **Raphael Kvasne**.

*   🌐 **Projeto**: [taskvasne.vercel.app](https://taskvasne.vercel.app)
*   👨‍💻 **Portfolio**: [kvasne.com](https://kvasne.com)
*   📧 **Email**: [raphael@kvasne.com](mailto:raphael@kvasne.com)
*   💼 **LinkedIn**: [Raphael Kvasne](https://www.linkedin.com/in/rkvasne/)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
