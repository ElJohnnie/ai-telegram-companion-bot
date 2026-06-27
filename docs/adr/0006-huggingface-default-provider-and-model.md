# ADR-0006: HuggingFace as default provider; Qwen2.5-7B model

## Status

Accepted — 2026-06-27

## Context

For the initial build we want a **free** LLM provider so the bot runs without paid credits. The
adapter layer (ADR-0002) makes the choice swappable, but we still need a sensible default. HuggingFace
offers a free tier, but it has since migrated to **"Inference Providers"**: the `chatCompletion` call
is auto-routed to a backing provider, and **model availability on the free tier is narrow and
volatile**. Empirically, several popular open models returned **HTTP 400** for our token
(`meta-llama/Llama-3.2-3B-Instruct`, `mistralai/Mistral-7B-Instruct-v0.3`, `HuggingFaceH4/zephyr-7b-beta`),
while `Qwen/Qwen2.5-7B-Instruct` worked via auto-routing. The free tier is also rate-limited and has a
small monthly credit, so transient failures are expected.

## Decision

Default to the **HuggingFace** adapter (`LLM_PROVIDER=huggingface`) with model
**`Qwen/Qwen2.5-7B-Instruct`** (`HF_MODEL`), selected because it is reachable on the free tier with a
standard token. The HuggingFace adapter logs the model id and HTTP status on failure to make
free-tier issues diagnosable. `HF_MODEL` is configurable so a failing model can be swapped without a
code change.

## Consequences

- The bot runs at **zero LLM cost** by default.
- Reliability is **not guaranteed**: free-tier rate limits / credit exhaustion / provider routing can
  cause intermittent failures. The adapter classifies transient errors so an optional fallback
  (ADR-0002) can cover them.
- Recommended hardening paths (see `TODO.md`): set `LLM_FALLBACK_PROVIDER=anthropic` (cheap, reliable
  Claude Haiku fallback), run a local model via Ollama (free + unlimited, heavier setup), or add 429
  backoff/retry.
- The default model may need revisiting as HuggingFace's free-tier model coverage shifts; `HF_MODEL`
  being config-driven contains the blast radius of that change.
