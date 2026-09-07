# 🔐 Política de Segurança - Taskvasne

Navegação: [README do projeto](README.md) • [Documentação](docs/README.md)

---

Política de segurança e contato para reporte responsável.

---

## 1) Reporte de vulnerabilidades

Se você encontrar um problema de segurança:

- Não abra issues públicas para vulnerabilidades. Envie detalhes para: [raphael@kvasne.com](mailto:raphael@kvasne.com)
- Inclua:
    - Passos para reproduzir
    - Impacto observado/esperado
    - Versão do Taskvasne e do Windows
    - Evidências (logs, prints, PoC)
    - Logs relevantes em `%APPDATA%\taskvasne\logs\`

Repositório: https://github.com/rkvasne/taskvasne

---

## 2) Escopo

O Taskvasne é um utilitário local. Ainda assim, são considerados problemas relevantes:

- Execução de comandos inesperados via PID/processo
- Vazamento de dados locais (logs, histórico, paths sensíveis)
- Falhas de permissões e persistência insegura
- Corrupção de dados com impacto relevante

---

## 3) Versões suportadas

- A versão suportada é a mais recente publicada em Releases (v0.1.2 no momento).
- Consulte o histórico em [CHANGELOG.md](CHANGELOG.md).
