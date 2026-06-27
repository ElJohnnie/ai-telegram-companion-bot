# ADR-0003: Two-tier conversation memory (Redis + PostgreSQL)

## Status

Accepted — 2026-06-27

## Context

Replies must be context-aware, so each turn needs the recent conversation history assembled and sent
to the LLM. Reading the full history from a relational store on every message is wasteful (a query
per turn), but we also need durable history that survives restarts and can back user profiles and
analytics later. The two needs — fast hot reads vs. durable truth — pull in different directions.

## Decision

Use a **two-tier, cache-aside** memory in `ConversationService`:

- **Redis = hot cache.** Key `conv:{telegramId}` holds a JSON array of the last **10** turns, with a
  **1-hour TTL**. Read first on every turn.
- **PostgreSQL = source of truth.** The `Message` table stores the full history; `User` stores the
  Telegram user.

Flow:
- `getContext()` — read Redis; on a miss (expired / first contact) hydrate the last 10 turns from
  Postgres, write them back to Redis, and return them.
- `append()` — write both the user turn and the assistant turn to Postgres (truth), then refresh the
  Redis cache from the *prior context the caller already held* + the two new turns, trimmed to 10.
  Passing the prior context in avoids re-reading the DB and avoids double-counting the just-written
  rows.

Redis is treated as **disposable**: a cache miss or a Redis outage degrades to a Postgres read, never
to data loss. Cache writes are best-effort and logged, not fatal.

## Consequences

- Hot path is an in-memory Redis read instead of a DB query per turn.
- History is durable and complete in Postgres; Redis can be flushed or lost safely.
- Bounded context (last 10 turns, 1h TTL) keeps prompts small and Redis memory bounded; idle
  conversations expire on their own.
- Trade-off: the cache is currently rewritten in full on each turn (serialize the whole 10-turn
  array). At higher volume this can move to native Redis list ops (`LPUSH` + `LTRIM`). See the
  roadmap in `TODO.md`.
- A managed Redis (e.g. AWS ElastiCache) shared across instances later enables horizontal scaling of
  the bot without changing this design.
