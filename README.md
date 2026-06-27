# Ayla — AI Companion Telegram Bot

A NestJS Telegram bot that holds warm, context-aware conversations using **Claude
(`claude-haiku-4-5`)**, with a **HuggingFace** free model as an automatic fallback when Claude is
unavailable. Conversation history is cached in **Redis** and durably stored in **PostgreSQL**.

> This is the core-bot pass. Containerizing the app and the GitHub Actions → AWS deploy pipeline are
> intentionally deferred.

## Architecture

```
Telegram → TelegramUpdate → ChatService
   → ConversationService (Redis hot cache, hydrate from Postgres on miss)
   → AiService → AnthropicProvider (claude-haiku-4-5)
                 └─ on retryable failure (429 / 5xx / connection) → HuggingFaceProvider
   → persist exchange (Postgres + Redis) → reply
```

## Prerequisites

- Node 20+
- Docker (for local Postgres + Redis)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An Anthropic API key and a HuggingFace API token

## Setup

```bash
cp .env.example .env          # fill in the tokens
npm install
docker compose up -d          # start Postgres + Redis
npm run prisma:migrate        # create tables (name the migration e.g. "init")
npm run start:dev             # start the bot (long polling)
```

Message your bot on Telegram. `/start` greets you; any text gets a reply.

## Inspecting state

```bash
npx prisma studio             # browse User / Message rows
redis-cli get conv:<telegramId>   # see the cached recent turns
```

## Environment

| Variable              | Purpose                                            |
| --------------------- | -------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`  | BotFather token                                    |
| `ANTHROPIC_API_KEY`   | Primary LLM provider                               |
| `HUGGINGFACE_API_KEY` | Fallback provider                                  |
| `HF_MODEL`            | Fallback model id (default Llama-3.2-3B-Instruct)  |
| `DATABASE_URL`        | Postgres connection string                         |
| `REDIS_URL`           | Redis connection string                            |
