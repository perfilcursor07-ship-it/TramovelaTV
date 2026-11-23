# TramaNovela TV

Plataforma de micro novelas (estilo drama vertical): o visitante assiste os primeiros episódios grátis,
curte e comenta, e desbloqueia a novela completa pagando via **Pix (PagBank)**.

## Stack

| Parte | Tecnologia |
|---|---|
| API | Node 22 + Express + TypeScript (`apps/api`) |
| Banco | MySQL + **Knex migrations** (`apps/api/src/db/migrations`) |
| Web | React 18 + Vite + Tailwind + React Query (`apps/web`) |
| Compartilhado | Tipos + cliente HTTP usados por web e app (`packages/shared`) |
| App | Expo / React Native — estrutura pronta (`apps/mobile`) |

## Rodando

```bash
npm install
npm run migrate     # cria as tabelas no banco tramovelatv
npm run seed        # cria o admin (+ novelas demo, se o banco estiver vazio)
npm run dev         # API em :3333 e site em http://localhost:5173
```

- Configuração em `apps/api/.env` (modelo em `.env.example`).
- Login do admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env`.
- Contas de teste criadas durante o desenvolvimento: `teste@novelas.local` e `comprador@novelas.local` (senha `teste123`).

### Migrations

```bash
npm run migrate                       # aplica pendentes
npm run migrate:rollback              # desfaz o último lote
npm run migrate:status
npm run migrate:make -- nome_da_tabela
```

## PagBank (Pix)

No `apps/api/.env`:

```
PAGBANK_ENV=sandbox            # mock | sandbox | production
PAGBANK_TOKEN_SANDBOX=...
PAGBANK_TOKEN_PRODUCTION=...
PUBLIC_API_URL=https://seu-dominio.com   # HTTPS público ativa o webhook
```

- `mock` (padrão): gera QR local e mostra o botão **“Simular pagamento”** — para testar sem credenciais.
- Fluxo em `apps/api/src/modules/payments/pagbank.client.ts`: `createPixOrder` → `extractQrCode` → `getOrder` + `isOrderPaid`.
- Webhook: `POST /api/webhooks/pagbank` responde 200 e confirma consultando `GET /orders/{id}` (nunca confia só no corpo).
- Sem webhook (ex.: localhost), o status é confirmado consultando o PagBank enquanto o cliente está com o QR aberto.

## Proteção dos vídeos

- Arquivos ficam em `apps/api/storage/videos` (fora da pasta pública).
- O player recebe um link **temporário e assinado** (`/api/stream/<token>`) com entrega por partes (Range).
- Abrir o link direto numa aba é recusado; o player não tem botão de download, menu de contexto, PiP nem arrastar.
- Limite honesto: nenhum site impede 100% gravação de tela / ferramentas avançadas. Para nível “streaming profissional”, o próximo passo é HLS criptografado (ffmpeg) + DRM.

## Painel (`/painel`)

- **Usuário:** início, minhas novelas, minha lista, pedidos, perfil.
- **Admin:** dashboard de vendas, novelas & vídeos (upload múltiplo com progresso, preço, promoção com contagem regressiva real,
  episódios grátis, prévia do paywall, link de divulgação), pedidos, usuários (nível de acesso / liberar cortesia), comentários, configurações (textos do paywall).

## Produção

```bash
npm run build      # compila API (apps/api/dist) e site (apps/web/dist)
npm start -w apps/api   # a API também serve o site buildado no mesmo domínio
```
