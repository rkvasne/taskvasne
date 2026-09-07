# 🧭 Diagnósticos e Dívida Técnica - Taskvasne

Navegação: [README do projeto](README.md) • [Documentação](docs/README.md)

---

Registro de diagnósticos, dívidas técnicas resolvidas e itens em acompanhamento.

---

## ✅ Dívidas Resolvidas (v0.1.0 - Migração Rust / Tauri v2)

- **[Performance] Overhead de Parser Shell**: Resolvido. O app migrou para Rust nativo utilizando a crate `netstat2` e `sysinfo`, eliminando spawn repetitivo de comandos de console (`tasklist`, `netstat`, PowerShell).
- **[Arquitetura] Acoplamento de port-manager**: Resolvido. A lógica foi encapsulada no módulo tipado `taskvasne_lib` em Rust, com testes unitários automatizados integrados ao Cargo.
- **[Performance] Consumo de Memória**: Resolvido. Consumo reduzido de ~180 MB (Electron) para ~20-30 MB (Rust + Tauri v2).

---

## 📌 Itens em Acompanhamento

### UX e Permissões

- Clarificar limitações de permissões do `taskkill` quando o processo alvo for de sistema ou de outro usuário sem privilégios de administrador.

### Monitoramento

- Acompanhar comportamento do flyout e eventos de perda de foco (`blur`) em múltiplos monitores com resoluções e taxas de DPI distintas.
