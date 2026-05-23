## RTK — CLI proxy instalado (economia de 60-90% de tokens)

O RTK intercepta comandos bash automaticamente via plugin. Para máxima eficácia, siga estas regras:

### Regra crítica: npm
Sempre use a forma longa `npm run <script>`, NUNCA a forma curta:
- ❌ `npm test`   → ✅ `npm run test`
- ❌ `npm start`  → ✅ `npm run start`
- ❌ `npm build`  → ✅ `npm run build`

### Evite pipes desnecessários
O RTK já filtra saídas — NUNCA use `| grep`, `2>&1 | tail -N`, ou `| head -N` em comandos suportados (isso quebra a formatação e gera erros como `(no output)`).

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

---

## 🧪 Regras Rígidas para Testes e Cobertura

Agentes frequentemente erram ao rodar testes. Siga **OBRIGATORIAMENTE** a estratégia definida em `.opencode/skills/test-execution/SKILL.md`:

1. **NO PIPES:** Nunca use `| grep`, `| tail` ou `| head` ao rodar vitest/jest/mocha/npm test.
2. **VERIFY CWD:** Sempre dê `cd backend` ou `cd frontend` antes de rodar o teste. Não rode da raiz se o `package.json` de teste estiver em uma sub-pasta.
3. **TEXT COVERAGE:** Nunca tente ler arquivos JSON de cobertura (`coverage-summary.json` etc). Use repórteres de texto direto no console:
   - Vitest: `npx vitest run --coverage.enabled=true --coverage.reporter=text-summary`
   - Jest: `npx jest --coverage --coverageReporters="text-summary"`
4. **ISOLATE FAILURES:** Se uma suíte inteira falhar com log gigante, **NÃO** tente ler o log bruto do RTK. Isole e rode apenas o arquivo que falhou (`npm run test -- arquivo_especifico.test.ts`).

---

## Fallback quando o RTK falhar

`rtk` é um **proxy de economia de tokens** (Rust). **NÃO é uma ferramenta de build.**

Quando `rtk <comando>` falhar (erro de parse JSON, saída vazia, exit 2, loop infinito):

1. **NÃO modifique configurações da ferramenta** (ex: não altere `.eslintrc` porque `rtk lint` quebrou)
2. **NÃO faça loop** — mesmo erro 2x = PARE imediatamente (regra dos 2 strikes)
3. **Use o comando nativo diretamente:**
   - `rtk lint` falhou → `npx eslint src/` ou `npm run lint`
   - `rtk vitest` falhou → `npx vitest run` ou `npm test`
   - `rtk tsc` falhou → `npx tsc --noEmit`
4. **O comando nativo é a fonte da verdade.** O rtk é apenas um wrapper de otimização.
5. **Apenas o OpenCode CLI** (`opencode`) e **o próprio RTK** (`rtk`) usam o plugin de interceptação. Quando você usa `npx`, `npm run`, ou comandos locais diretamente, o RTK não está envolvido — e é isso que você quer quando o proxy falha.
