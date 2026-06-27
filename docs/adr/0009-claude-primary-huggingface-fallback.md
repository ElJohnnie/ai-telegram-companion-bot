# ADR-0009: Claude (Anthropic Haiku) primary, HuggingFace free fallback

## Status

Accepted — 2026-06-27 (supersedes [ADR-0006](0006-huggingface-default-provider-and-model.md))

## Context

[ADR-0006](0006-huggingface-default-provider-and-model.md) made the free **HuggingFace** tier the
default *active* provider so the bot ran at zero cost. In practice the free tier proved too flaky for
a good default conversational experience: narrow/volatile model availability on "Inference Providers",
rate limits, and a small monthly credit cause intermittent failures. The adapter layer
([ADR-0002](0002-provider-agnostic-llm-adapter-layer.md)) already supports a primary + retryable
fallback, so the choice is purely configuration.

We want the *default* experience to be reliable while still guaranteeing the bot keeps answering even
when the paid key is absent or exhausted.

## Decision

Default to **Anthropic / Claude (`claude-haiku-4-5`)** as the primary provider
(`LLM_PROVIDER=anthropic`) and keep **HuggingFace** (`Qwen/Qwen2.5-7B-Instruct`) as the free
**last-resort fallback** (`LLM_FALLBACK_PROVIDER=huggingface`). This reverts to the original
"Anthropic primary / HuggingFace fallback" shape noted in ADR-0002, now expressed purely through
config defaults (`env.validation.ts`), not hard-wired code.

To make the missing-key case non-fatal, `LlmService` **promotes the configured fallback to primary at
startup** when the selected primary is not configured (e.g. no `ANTHROPIC_API_KEY`), instead of
throwing and failing to boot. The bot only refuses to start when there is no usable provider at all.
The retryable-only runtime fallback semantics from ADR-0002 are unchanged: a transient primary failure
(429 / 5xx / connection) falls back; a 4xx is not masked.

## Consequences

- The default experience is **reliable** (Claude Haiku) while remaining cheap.
- The bot **always has a free safety net**: HuggingFace covers transient Claude failures, and a
  missing/blank `ANTHROPIC_API_KEY` degrades gracefully to the free tier rather than crashing.
- Running at **zero LLM cost** is still a one-line change (`LLM_PROVIDER=huggingface`, no fallback).
- Default operation now expects an `ANTHROPIC_API_KEY`; without it the bot logs that it promoted the
  HuggingFace fallback to primary and runs on the free tier (with that tier's reliability caveats).
- HuggingFace free-tier caveats from ADR-0006 (model volatility, rate limits) still apply, but now
  only affect the fallback path or the explicit free-only configuration.
