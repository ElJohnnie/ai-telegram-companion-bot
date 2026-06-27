# AI Companion Telegram Bot

A NestJS Telegram bot that holds warm, context-aware conversations. The LLM is **provider-agnostic**:
a pluggable adapter layer lets you run any model by setting `LLM_PROVIDER` + its API key. By default
the active provider is a free **HuggingFace** model (`Qwen/Qwen2.5-7B-Instruct`); **Anthropic / Claude
(`claude-haiku-4-5`)** ships as an adapter too and can be the active provider or an optional fallback.
Conversation history is cached in **Redis** and durably stored in **PostgreSQL**.

> This is the core-bot pass (runs locally). Containerizing the app and the GitHub Actions → AWS deploy
> pipeline are deferred — see [TODO.md](./TODO.md).

## Architecture

```
Telegram → TelegramUpdate → ChatService
   → ConversationService (Redis hot cache, hydrate from Postgres on miss)
   → LlmService → active LlmAdapter (LLM_PROVIDER, default 'huggingface')
                  └─ on retryable failure (429 / 5xx / connection), if a fallback
                     is configured (LLM_FALLBACK_PROVIDER) → fallback LlmAdapter
   → persist exchange (Postgres + Redis) → reply
```

The LLM layer lives in [`src/shared/llm/`](src/shared/llm/): an `LlmAdapter` interface, one adapter
per provider under `adapters/`, a registry, and `LlmService` (selects primary/fallback from config).
**To add a new LLM:** create an adapter implementing `LlmAdapter`, register it in `llm.registry.ts`,
add its env vars, and point `LLM_PROVIDER` at it — nothing else in the bot changes.

## Prerequisites

- Node 20+
- Docker (for local Postgres + Redis)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An API key for whichever LLM provider is active (HuggingFace by default)

## Setup

```bash
cp .env.example .env          # fill in TELEGRAM_BOT_TOKEN + the active provider's key
npm install
docker compose up -d          # start Postgres + Redis
npm run prisma:migrate        # create tables (name the migration e.g. "init")
npm run start:dev             # start the bot (long polling)
```

Message your bot on Telegram. `/start` greets you; any text gets a reply.

### Day-to-day: one command to run it

After the one-time setup above, just use:

```bash
npm run dev     # brings up Postgres + Redis, applies migrations, starts the bot
npm run stop    # stops the datastores (Ctrl+C already stops the bot)
```

A shell shortcut `ayla` is also installed (in `~/.zshrc`) — type `ayla` from any terminal to start
everything. Open a new terminal (or `source ~/.zshrc`) to pick it up.

> **HuggingFace note:** HF migrated to "Inference Providers"; many open models (Llama, Mistral,
> Zephyr) return **400** on the free tier. `Qwen/Qwen2.5-7B-Instruct` works on the free tier. If a
> model stops responding, switch `HF_MODEL` or configure the Anthropic fallback (see below).

## Switching / adding providers

- **Use Claude instead of HuggingFace:** set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...`.
- **Add a fallback:** set `LLM_FALLBACK_PROVIDER=anthropic` (+ its key). The fallback is used only on a
  *retryable* failure of the active provider (rate limit, connection error, 5xx); a 4xx is not masked.

## Inspecting state

```bash
npx prisma studio                 # browse User / Message rows
redis-cli get conv:<telegramId>   # see the cached recent turns
```

## Environment

| Variable                | Purpose                                                            |
| ----------------------- | ----------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`    | BotFather token                                                   |
| `LLM_PROVIDER`          | Active LLM adapter (`huggingface` \| `anthropic`); default `huggingface` |
| `LLM_FALLBACK_PROVIDER` | Optional fallback adapter used on a retryable primary failure     |
| `HUGGINGFACE_API_KEY`   | HuggingFace token (required when HF is active)                    |
| `HF_MODEL`              | HF model id (default `Qwen/Qwen2.5-7B-Instruct`)                  |
| `ANTHROPIC_API_KEY`     | Anthropic key (optional; only if Anthropic is active or fallback) |
| `DATABASE_URL`          | Postgres connection string                                        |
| `REDIS_URL`             | Redis connection string                                           |

## Deployment

Hosting is a single EC2 `t3.small` running the whole stack (app + Postgres + Redis) in Docker Compose,
deployed via GitHub Actions. Step-by-step guide: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**. The
build/deploy assets (`Dockerfile`, `docker-compose.prod.yml`, `.github/workflows/`) are in the repo;
you only provision the instance and set the secrets.

## Decisions & roadmap

- Architecture decisions: [docs/adr/](docs/adr/)
- Remaining work: [TODO.md](./TODO.md) — LLM provider hardening, then the hosting rollout above.
