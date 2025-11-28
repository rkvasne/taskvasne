# Taskvasne

![License](https://img.shields.io/github/license/raphaelkvasne/taskvasne?style=for-the-badge&color=blue)
![Version](https://img.shields.io/badge/version-0.0.1-blue?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-windows-blue?style=for-the-badge)

> **Taskvasne** é um gerenciador de portas minimalista e elegante para Windows 11, projetado para desenvolvedores que precisam de controle rápido sobre seus ambientes locais (Node.js, Docker, etc.).

<p align="center">
  <img src="icon.png" width="128" alt="Taskvasne Icon">
</p>

## ✨ Funcionalidades

*   **⚡ Monitoramento Instantâneo**: Visualize todas as portas TCP ativas (acima de 1000) em tempo real.
*   **🎨 Design Windows 11**: Interface moderna, compacta e com modo escuro nativo.
*   **🛡️ System Tray**: Vive silenciosamente na sua bandeja do sistema. Um clique para abrir, um clique para fechar.
*   **🛑 Kill Process**: Encerre processos travados ou indesejados com um único clique.
*   **🔒 Instância Única**: Previne múltiplas janelas, mantendo seu workspace limpo.

## 🚀 Instalação

### Pré-requisitos
*   Node.js instalado.
*   Windows 10 ou 11.

### Rodando Localmente

1.  Clone o repositório:
    ```bash
    git clone https://github.com/raphaelkvasne/taskvasne.git
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

Para gerar um arquivo `.exe` portátil e otimizado:

```bash
npm run dist
```
O executável será criado na pasta `dist/`.

## 🛠️ Tecnologias

*   **Electron**: Core do aplicativo.
*   **Vanilla JS/CSS**: Para máxima performance e leveza.
*   **Windows API**: Integração nativa via `netstat` e `tasklist`.

## 👤 Autor

Desenvolvido com ❤️ por **Raphael Kvasne**.

*   🌐 **Website**: [kvasne.com](https://kvasne.com)
*   📧 **Email**: [raphael@kvasne.com](mailto:raphael@kvasne.com)
*   💼 **LinkedIn**: [Raphael Kvasne](https://linkedin.com/in/raphaelkvasne)

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
