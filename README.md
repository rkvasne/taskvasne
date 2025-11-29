# Taskvasne

![License](https://img.shields.io/github/license/rkvasne/taskvasne?style=for-the-badge&color=blue)
![Version](https://img.shields.io/badge/version-0.0.6-purple?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows-purple?style=for-the-badge)
![Vercel](https://img.shields.io/badge/vercel-deployed-black?style=for-the-badge&logo=vercel)

> **Taskvasne** é um gerenciador de portas minimalista e elegante para Windows 11, projetado para desenvolvedores que precisam de controle rápido sobre seus ambientes locais (Node.js, Docker, etc.).
>
> 🌐 **Acesse o site oficial:** [taskvasne.vercel.app](https://taskvasne.vercel.app)

<p align="center">
  <img src="icon.png" width="128" alt="Taskvasne Icon">
</p>

## ✨ Funcionalidades

*   **⚡ Monitoramento Instantâneo**: Visualize todas as portas TCP ativas (acima de 1000) em tempo real.
*   **🎨 Design Windows 11**: Interface moderna, compacta e com modo escuro nativo.
*   **🛡️ System Tray**: Vive silenciosamente na sua bandeja do sistema. Um clique para abrir, um clique para fechar.
*   **🛑 Kill Process**: Encerre processos travados ou indesejados com um único clique.
    *   *Feedback Visual*: O item desliza e desaparece suavemente ao ser encerrado.
    *   *Sem Interrupções*: Ação imediata para manter seu fluxo de trabalho rápido.
*   **🔄 Atualização Inteligente**: Botão de refresh com animação e feedback visual.
*   **🔒 Instância Única**: Previne múltiplas janelas, mantendo seu workspace limpo.

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

### 📦 Criando Executável

Para gerar um arquivo `.exe` portátil e otimizado com o ícone correto:

```bash
npm run dist
```
O executável será criado na pasta `dist/`.

**⚠️ Importante**: O arquivo `Taskvasne.exe` **não pode ser movido sozinho**. Ele depende dos outros arquivos na pasta para funcionar.
*   Para "instalar", mova a **pasta inteira** para um local seguro (ex: `Meus Documentos`).
*   Crie um **atalho** do `Taskvasne.exe` na sua Área de Trabalho.

## 🛠️ Tecnologias

*   **Electron**: Core do aplicativo.
*   **Vanilla JS/CSS**: Para máxima performance e leveza.
*   **Windows API**: Integração nativa via `netstat` e `tasklist`.

## 👤 Autor

Desenvolvido com ❤️ por **Raphael Kvasne**.

*   🌐 **Projeto**: [taskvasne.vercel.app](https://taskvasne.vercel.app)
*   👨‍💻 **Portfolio**: [kvasne.com](https://kvasne.com)
*   📧 **Email**: [raphael@kvasne.com](mailto:raphael@kvasne.com)
*   💼 **LinkedIn**: [Raphael Kvasne](https://www.linkedin.com/in/rkvasne/)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
