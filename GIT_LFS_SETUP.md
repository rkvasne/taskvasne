# 📦 Git LFS Setup - Taskvasne

## ✅ Configuração Completa do Git LFS

Este documento registra a configuração do **Git LFS** (Large File Storage) para o projeto Taskvasne, permitindo armazenar binários grandes (.exe e .zip) de forma eficiente.

---

## 🎯 O que foi feito?

### 1. Instalação do Git LFS
```powershell
git lfs install
```
**Status:** ✅ Hooks do Git atualizados

### 2. Configuração de Rastreamento
Arquivo `.gitattributes` configurado para rastrear:
- `*.exe` - Executáveis do Electron
- `*.zip` - Arquivos compactados para download

```gitattributes
*.exe filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
```

### 3. Arquivos Enviados
```powershell
git add -f dist-portable/Taskvasne.zip
git add .gitattributes
git commit -m "release: v0.0.6 - Add Taskvasne portable executable to LFS"
git push origin main
```

**Resultado:**
- ✅ `dist-portable/Taskvasne.zip` (~114 MB) enviado via LFS
- ✅ `docs/Taskvasne.zip` (já estava no LFS)
- ✅ Upload LFS: 100% (114 MB @ 9.2 MB/s)

---

## 📊 Status Atual

### Arquivos no LFS
```bash
$ git lfs ls-files
65b2de1e3a * dist-portable/Taskvasne.zip
454beb7c1c * docs/Taskvasne.zip
```

### Verificação
```bash
$ git lfs status
On branch main
Objects to be pushed to origin/main:

Objects to be committed:

Objects not staged for commit:
```

**Interpretação:** ✅ Tudo sincronizado, nenhum objeto pendente

---

## 🚀 Como Usar (para novos clones)

### Clonar o Repositório
```powershell
git clone https://github.com/rkvasne/taskvasne.git
cd taskvasne
```

### Baixar Arquivos LFS
```powershell
git lfs install  # Apenas na primeira vez
git lfs pull     # Baixa todos os arquivos LFS
```

### Verificar Download
```powershell
git lfs ls-files
ls dist-portable/Taskvasne.zip
```

---

## 📦 Adicionar Novos Binários

### Para uma nova versão (ex: v0.0.7):

1. **Gerar novo build:**
```powershell
npm run dist
```

2. **Adicionar ao Git LFS:**
```powershell
git add -f dist-portable/Taskvasne-v0.0.7.zip
```

3. **Commit e Push:**
```powershell
git commit -m "release: v0.0.7 - Add new portable build to LFS"
git push origin main
```

**Saída esperada:**
```
Uploading LFS objects: 100% (1/1), XXX MB | X.X MB/s, done
```

---

## 🔧 Troubleshooting

### Problema: Arquivo não vai para LFS
**Sintoma:** Arquivo grande commitado diretamente no Git (não LFS)

**Solução:**
```powershell
# Remover do cache
git rm --cached dist-portable/Taskvasne.zip

# Adicionar novamente (agora com LFS)
git add -f dist-portable/Taskvasne.zip

# Amend commit anterior
git commit --amend --no-edit

# Force push (CUIDADO: modifica histórico)
git push origin main --force
```

### Problema: Clone sem LFS
**Sintoma:** Arquivos .zip e .exe aparecem como pequenos (ponteiros)

**Solução:**
```powershell
git lfs install
git lfs pull
```

### Problema: Autenticação LFS
**Sintoma:** Erro de autenticação ao push

**Solução:**
```powershell
git config lfs.url https://github.com/rkvasne/taskvasne.git/info/lfs
git credential reject  # Limpar credenciais antigas
git push origin main   # Redigitar credenciais
```

---

## 📈 Benefícios do LFS

### Sem LFS (antes)
- ❌ Repositório incha com cada versão (~100+ MB por release)
- ❌ Clone lento (baixa todo histórico de binários)
- ❌ Git operations ficam lentas

### Com LFS (agora)
- ✅ Apenas ponteiros no Git (~100 bytes)
- ✅ Clone rápido (binários baixados sob demanda)
- ✅ Repositório permanece leve
- ✅ Versionamento eficiente de binários

---

## 📝 Checklist de Release com LFS

- [x] Git LFS instalado (`git lfs install`)
- [x] `.gitattributes` configurado
- [x] Build gerado (`npm run dist`)
- [x] ZIP adicionado (`git add -f dist-portable/Taskvasne.zip`)
- [x] Commit criado com mensagem descritiva
- [x] Push realizado (`git push origin main`)
- [x] Upload LFS confirmado (saída "Uploading LFS objects")
- [x] Verificação (`git lfs ls-files`)
- [ ] Tag de release criada (`git tag v0.0.6`)
- [ ] Release no GitHub com link para ZIP

---

## 🔗 Links Úteis

- **Git LFS Docs:** https://git-lfs.github.com/
- **GitHub LFS Guide:** https://docs.github.com/en/repositories/working-with-files/managing-large-files
- **Taskvasne Repo:** https://github.com/rkvasne/taskvasne
- **Releases:** https://github.com/rkvasne/taskvasne/releases

---

## 📊 Histórico de Uploads LFS

| Data | Versão | Arquivo | Tamanho | Commit |
|------|--------|---------|---------|--------|
| 2025-12-30 | v0.0.6 | dist-portable/Taskvasne.zip | 114 MB | cd1ec52 |
| 2025-11-28 | - | docs/Taskvasne.zip | 109 MB | (anterior) |

---

**Última Atualização:** 30 de Dezembro de 2025  
**Status:** ✅ LFS Configurado e Funcionando  
**Próximo Passo:** Criar GitHub Release v0.0.6 e anexar ZIP
