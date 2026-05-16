# GitHub Actions

Workflows estão temporariamente desabilitados porque a conta do GitHub e basica (Free).

Para reativar, renomeie `ci-cd.yml.disabled` de volta para `ci-cd.yml`.

## Workflows existentes

| Arquivo | Status | Descricao |
|---------|--------|-----------|
| `ci-cd.yml.disabled` | Inativo | Pipeline CI/CD completo: lint → test → seguranca → build Docker → deploy staging/production |

## Como reativar

1. Renomeie o arquivo:
   ```bash
   mv .github/workflows/ci-cd.yml.disabled .github/workflows/ci-cd.yml
   ```

2. Commit e push:
   ```bash
   git add .github/workflows/ci-cd.yml
   git commit -m "ci: reativar pipeline CI/CD"
   git push
   ```

3. Certifique-se de que GitHub Actions esteja habilitado nas configuracoes do repositorio (requer conta Pro ou superior).
