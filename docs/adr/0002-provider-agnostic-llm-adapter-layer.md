# ADR-0002: Provider-agnostic LLM adapter layer

## Status

Accepted — 2026-06-27 (supersedes the initial hard-wired "Anthropic primary / HuggingFace fallback"
design)

## Context

The first cut hard-wired the AI layer to Anthropic: the orchestrator imported the Anthropic SDK and
classified Anthropic-specific errors. That coupled the whole bot to one vendor. We also decided
**not** to use LangChain — for a single-turn chat loop it adds abstraction we don't need, and it
would itself become the coupling point. Requirements that emerged: run on a free provider now
(HuggingFace), keep Claude available, and be able to add any future LLM by "just dropping in an
adapter with an API key".

## Decision

Introduce a provider-agnostic adapter layer in `src/shared/llm/`:

- **`LlmAdapter` interface** — `name`, `isConfigured()`, `isRetryable(err)`, `generate(systemPrompt,
  messages)`. Each provider's SDK call *and* its transient-error classification live inside its own
  adapter, so no vendor types leak into the orchestrator.
- **One adapter per provider** under `adapters/` (`HuggingFaceAdapter`, `AnthropicAdapter`). Adapters
  read their own key/model from config, never throw on a missing optional key (lazy SDK client), and
  expose `isConfigured()`.
- **`llm.registry.ts`** builds a `Map<name, LlmAdapter>`.
- **`LlmService`** selects the active provider via `LLM_PROVIDER` (and an optional
  `LLM_FALLBACK_PROVIDER`) at startup, and on a *retryable* failure of the primary falls back to the
  fallback adapter; non-retryable (4xx) errors are rethrown, not masked.

`ChatService` depends only on `LlmService.generateReply(...)` — it is fully LLM-agnostic.

## Consequences

- **Adding an LLM** = create one adapter implementing `LlmAdapter`, register it, add its env vars,
  point `LLM_PROVIDER` at it. No changes to chat/telegram/memory code.
- **Vendor lock-in removed**; provider choice is configuration, not code.
- The fallback policy is centralized and explicit (retryable-only), preserving "don't burn the
  fallback on a 4xx" semantics regardless of provider.
- Cost: a small amount of indirection (interface + registry) versus calling an SDK directly. Worth
  it given the free-tier volatility documented in ADR-0006.
- No LangChain dependency to track, secure, or upgrade.
