# Contopia

A estante mágica de quem escreve: um site para crianças escreverem livros,
contos, histórias e diários, guardarem tudo numa estante que muda de tema e
lerem as histórias umas das outras com segurança.

Plano do produto: https://claude.ai/artifact/Fwh7qR1GAMKHfc3oxC795G

## Arquitetura

Tudo roda em containers, na mesma receita do moneyTrackr:

| Container  | O que faz                                              |
|------------|--------------------------------------------------------|
| `nginx`    | Proxy: `/` vai para o frontend e `/api/` para o backend |
| `frontend` | React + Vite com Motion para as animações, servido por nginx |
| `backend`  | Node + Express                                          |
| `mongodb`  | Livros, usuários e progresso de leitura                 |
| `redis`    | Sessões e limites de requisição                         |

As capas e figuras ficam no volume `contopia_uploads_data`.

## Rodar localmente

Com Docker:

```bash
cp .env.example .env
docker compose up -d --build
# http://localhost:8089
```

Sem Docker, só o frontend (a estante funciona com livros de exemplo):

```bash
cd frontend && npm install && npm run dev
```

Testes: `npm test` dentro de `backend/` e de `frontend/`.

## Publicar

Cada commit `feat:` ou `fix:` na `main` gera uma versão (semantic-release), que
constrói as imagens arm64 no GHCR e faz o deploy por SSH no servidor da OCI.
Commits `chore:`, `docs:` e afins não geram versão nem deploy.

### Preparação única

1. **DuckDNS:** criar o subdomínio `contopia` apontando para o IP do servidor.
2. **Secrets do repositório** (Settings > Secrets and variables > Actions):
   `SSH_HOST`, `SSH_USER` e `SSH_PRIVATE_KEY`, os mesmos do moneyTrackr.
3. **No servidor**, criar `~/contopia/.env` a partir do `.env.example` com
   `NODE_ENV=production`, senhas novas para Mongo e Redis, um `JWT_SECRET`
   (`openssl rand -base64 64`) e `FRONTEND_URL=https://contopia.duckdns.org`.
4. **HTTPS:** o Caddy do moneyTrackr já usa as portas 80 e 443. O nginx do
   Contopia entra na rede dele (`moneytrackr_frontend`) e o Caddyfile do
   moneyTrackr ganha um bloco para `contopia.duckdns.org`.
