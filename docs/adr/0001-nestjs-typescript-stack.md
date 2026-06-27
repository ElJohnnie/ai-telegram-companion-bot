# ADR-0001: Use NestJS + TypeScript

## Status

Accepted — 2026-06-27

## Context

The bot needs several long-lived collaborating components (Telegram handler, conversation memory,
LLM access, config). We want strong typing, dependency injection, clear module boundaries, and a
conventional structure that a team can navigate. The project brief specified Node + Nest.

## Decision

Build the bot on **NestJS** with **TypeScript**. Use Nest modules to enforce boundaries
(`TelegramModule`, `ChatModule`, `ConversationModule`, `shared/LlmModule`, plus global
`ConfigModule`, `PrismaModule`, `RedisModule`), and Nest DI to wire services together.

## Consequences

- DI + module isolation make each layer independently testable and swappable (see ADR-0002).
- Strong typing across the LLM message shapes, Prisma models, and config reduces a class of bugs.
- Config is validated at startup via `@nestjs/config` + Joi (`src/config/env.validation.ts`) — the
  app fails fast on missing/invalid env instead of erroring deep in a request.
- Cost: NestJS adds boilerplate (modules, providers) versus a bare Telegraf script — acceptable for
  a system meant to grow (hosting, multiple providers, persistence).
