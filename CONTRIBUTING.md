# 🤝 Contribuindo - Taskvasne

Navegação: [README do projeto](README.md) • [Documentação](docs/README.md)

---

Obrigado por investir seu tempo contribuindo com o **Taskvasne**! 🎉

Siga este guia para entender como contribuir com o Taskvasne, melhorar a aplicação e manter a documentação alinhada.

---

## 1) Comece aqui

- Documentação: [docs/README.md](docs/README.md)
- Visão geral e uso: [README.md](README.md)

---

## 2) Código de Conduta

Este projeto adota um ambiente inclusivo e respeitoso. Ao participar, você concorda em:

- Usar linguagem acolhedora e inclusiva
- Respeitar pontos de vista e experiências diferentes
- Aceitar críticas construtivas com profissionalismo
- Focar no que é melhor para a comunidade

Este projeto segue o [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 3) Como Contribuir

### 3.1) Reportar Bugs

Antes de criar uma issue:

- Verifique se já não existe uma issue similar
- Use o template de bug report
- Inclua informações do sistema (Windows version, Node.js version)
- Descreva os passos para reproduzir o problema
- Anexe logs relevantes (veja `%APPDATA%\taskvasne\logs\`)

**Exemplo de bug report:**

```markdown
**Descrição:** Erro ao matar processo com PID inválido
**Passos para reproduzir:**

1. Abra o Taskvasne
2. Clique em "Matar" em um processo inexistente
3. Observe o erro no console

**Comportamento esperado:** Mensagem de erro clara ao usuário
**Sistema:** Windows 11 Pro | Rust 1.77+ | Node.js 20 | Taskvasne 0.1.0
**Logs:** [anexar arquivo]
```

---

### 3.2) Sugerir Melhorias

Para sugestões de features:

- Descreva claramente o problema que a feature resolve
- Explique o comportamento desejado
- Considere alternativas
- Adicione mockups/capturas de tela se aplicável

---

### 3.3) Desenvolver Código

#### Setup do Ambiente

Scripts e comandos do projeto em [README.md](README.md#-scripts-disponíveis).

#### Pré-requisitos

- **Rust:** 1.77 ou superior (com `cargo` e `rustc`)
- **Node.js:** 18.x ou superior
- **npm:** 9.x ou superior
- **Git:** Qualquer versão recente
- **Windows:** 10/11 (projeto focado em Windows)

---

### 3.4) Workflow de Pull Request

1. **Fork o repositório**
2. **Crie uma branch** para sua feature:
    ```bash
    git checkout -b feature/nome-da-feature
    ```
3. **Desenvolva** seguindo os padrões do projeto (veja abaixo)
4. **Escreva testes** para novas funcionalidades
5. **Rode os testes** e garanta que todos passam:

    ```bash
    npm test
    cargo test --manifest-path src-tauri/Cargo.toml
    npm run lint
    ```

6. **Commit** com mensagens descritivas:
    ```bash
    git commit -m "feat: adiciona filtro de portas por intervalo"
    ```
7. **Push** para o seu fork:
    ```bash
    git push origin feature/nome-da-feature
    ```
8. **Abra um Pull Request** no repositório original

---

## 4) Padrões de Código

### Linting e Formatação

```bash
# Verifica erros de linting
npm run lint

# Formata código automaticamente
npm run format

# Verifica formatação sem alterar arquivos
npm run format:check
```

### Estilo de Código

- **Indentação:** 4 espaços
- **Aspas:** Single quotes (`'`) para strings
- **Ponto e vírgula:** Obrigatório (Prettier)
- **Variáveis:** Prefira `const` sobre `let`, nunca use `var`
- **Nomes:** camelCase para funções/variáveis, PascalCase para classes

### Documentação JSDoc

Todas as funções públicas devem ter JSDoc:

```javascript
/**
 * Extrai o nome do projeto a partir da linha de comando
 * @param {string} commandLine - Linha de comando completa
 * @param {string} processName - Nome do processo
 * @returns {string|null} Nome do projeto ou null se não encontrado
 * @example
 * extractProjectName('node C:\\projects\\app\\server.js', 'node.exe')
 * // Returns: 'app'
 */
function extractProjectName(commandLine, processName) {
    // ...
}
```

---

## 🧪 Testes

### Executando Testes

```bash
# Roda todos os testes
npm test

# Modo watch (desenvolvimento)
npm run test:watch

# Cobertura de código
npm run test:coverage
```

### Escrevendo Testes

- Mantenha cobertura acima de **60%**
- Teste casos de sucesso E casos de erro
- Use nomes descritivos:

```javascript
describe('extractProjectName', () => {
    test('should extract project name from valid path', () => {
        const result = extractProjectName('node C:\\Users\\dev\\myapp\\index.js', 'node.exe');
        expect(result).toBe('myapp');
    });

    test('should return null for invalid paths', () => {
        const result = extractProjectName('', 'node.exe');
        expect(result).toBeNull();
    });
});
```

---

## 🔒 Segurança

### Reportar Vulnerabilidades

Siga a política em [SECURITY.md](SECURITY.md).

### Checklist de Segurança

- ✅ Validar/sanitizar inputs de usuário
- ✅ Usar `contextIsolation: true` em Electron
- ✅ Nunca usar `nodeIntegration: true`
- ✅ Adicionar CSP headers em páginas HTML
- ✅ Escapar comandos shell (`exec`, `spawn`)

---

## 📦 Convenções de Commit

Siga [Conventional Commits](https://www.conventionalcommits.org/):

```text
<tipo>(<escopo>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

**Tipos:**

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças em documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração sem alterar comportamento
- `test`: Adição/modificação de testes
- `chore`: Tarefas de manutenção

**Exemplos:**

```bash
feat(port-manager): adiciona suporte para processos Java
fix(main): corrige vazamento de memória em killProcess
docs(README): atualiza seção de instalação
test(renderer): adiciona testes para loadPorts()
```

---

## 🏗️ Estrutura do Projeto

Estrutura detalhada em [README.md](README.md#-arquitetura-e-boas-praticas).

---

## ❓ Perguntas Frequentes

### Como depurar o aplicativo?

```bash
# Modo dev com DevTools
npm start

# Logs da aplicação
%APPDATA%\taskvasne\logs\main.log
```

### Como adicionar uma nova dependência?

```bash
npm install <pacote> --save
# OU
npm install <pacote> --save-dev  # dev dependencies
```

### Posso contribuir com traduções?

Sim! Veja a issue de internacionalização ou abra uma nova sugerindo seu idioma.

### Quanto tempo leva para revisar um PR?

Geralmente **2-5 dias úteis**. PRs com testes têm prioridade.

---

## 🙏 Agradecimentos

Obrigado por contribuir! Seu trabalho ajuda a tornar o Taskvasne melhor para todos. 🚀

---

**Mantido por:** [RKvasne](https://github.com/rkvasne)  
**Última atualização:** 30/12/2025

---

## 📄 Licença

Ao contribuir, você concorda com a licença descrita em [LICENSE.md](LICENSE.md).
