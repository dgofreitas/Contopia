## RTK — CLI proxy instalado (economia de 60-90% de tokens)

O RTK intercepta comandos bash automaticamente via plugin. Para máxima eficácia, siga estas regras:

### Regra crítica: npm
Sempre use a forma longa `npm run <script>`, NUNCA a forma curta:
- ❌ `npm test`   → ✅ `npm run test`
- ❌ `npm start`  → ✅ `npm run start`
- ❌ `npm build`  → ✅ `npm run build`

### Evite pipes desnecessários
O RTK já filtra saídas — nunca use `2>&1 | tail -N`, `| head -N` em comandos suportados.

### Comandos suportados (o plugin reescreve automaticamente)
- git: status, diff, log, add, commit, push, pull
- gh: pr list/view, issue list, run list
- cargo: test, build, clippy
- cat/head/tail → rtk read
- rg/grep → rtk grep
- ls → rtk ls
- find → rtk find
- vitest, jest → rtk vitest
- tsc → rtk tsc
- eslint/biome → rtk lint
- prettier → rtk prettier
- playwright → rtk playwright
- prisma → rtk prisma
- ruff check/format → rtk ruff
- pytest → rtk pytest
- pip list/install → rtk pip
- go test/build/vet → rtk go
- golangci-lint → rtk golangci-lint
- docker ps/images/logs → rtk docker
- kubectl get/logs → rtk kubectl
- aws * → rtk aws
- curl → rtk curl
- pnpm list/outdated → rtk pnpm
