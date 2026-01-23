# Diagnósticos Pendentes

## Performance
- Parser de processos ainda pode ser custoso com múltiplas chamadas shell; avaliar cache por PID e debounce no refresh.
- Renderização total da lista pode ser otimizada se o volume de portas crescer.

## Arquitetura
- Separação de responsabilidades em `port-manager.js` pode melhorar testabilidade e manutenibilidade.
- Lógica de UI e controle em `renderer.js` pode ser desacoplada caso o app cresça.

## UX e Permissões
- Clarificar limitações de permissões do `taskkill` quando o processo não pertence ao usuário atual.
