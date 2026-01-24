# Diagnósticos Pendentes

> **Lista de diagnósticos pendentes** e dívidas técnicas em aberto.
>
> Navegação: [README do projeto](README.md) • [Documentação](docs/README.md) • [CHANGELOG](CHANGELOG.md)
>
> **Última atualização:** 23 de janeiro de 2026

## Performance
- Parser de processos ainda pode ser custoso com múltiplas chamadas shell; avaliar cache por PID e debounce no refresh.
- Renderização total da lista pode ser otimizada se o volume de portas crescer.

## Arquitetura
- Separação de responsabilidades em `port-manager.js` pode melhorar testabilidade e manutenibilidade.
- Lógica de UI e controle em `renderer.js` pode ser desacoplada caso o app cresça.

## UX e Permissões
- Clarificar limitações de permissões do `taskkill` quando o processo não pertence ao usuário atual.
