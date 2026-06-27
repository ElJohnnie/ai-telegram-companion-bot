# ADR-0005: Telegram via nestjs-telegraf with long polling

## Status

Accepted — 2026-06-27

## Context

The bot's interface is Telegram. We need to receive updates (commands, text) and send replies, wired
into the Nest DI graph. Telegram offers two delivery modes: **long polling** (the bot pulls updates;
no public URL needed) and **webhooks** (Telegram pushes to a public HTTPS endpoint).

## Decision

Use **`nestjs-telegraf`** (a Nest wrapper over Telegraf). Update handlers live in
`telegram.update.ts` as a decorated `@Update()` class (`@Start()`, `@Help()`, `@On('text')`); the
text handler shows a `typing` action, calls `ChatService.handleMessage(...)`, and replies. The bot
runs in **long-polling** mode for now.

## Consequences

- Long polling runs anywhere — laptop or server — with **no public URL, TLS, or inbound ports**.
  Ideal for local development and the current pre-hosting phase.
- nestjs-telegraf integrates cleanly with DI: the Telegram layer depends on `ChatService` like any
  other Nest provider; the bot token is injected from validated config.
- Errors in handling are caught and turned into a friendly fallback reply, with the real error
  logged — a transport failure never crashes the update loop.
- Trade-off / future change: long polling keeps an open connection and doesn't scale to multiple
  instances cleanly. Production should revisit **webhooks** (lighter, push-based) once the bot is
  hosted behind HTTPS. Tracked in `TODO.md` and to be captured as a follow-up ADR when decided.
