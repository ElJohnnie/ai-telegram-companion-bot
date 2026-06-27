---
name: add-llm-provider
description: Add or swap an LLM provider in this bot (e.g. OpenAI, Groq, Ollama, Anthropic). Use whenever a new model/provider must be wired into the provider-agnostic adapter layer, or an existing one configured as primary/fallback.
---

# Add an LLM provider

Governed by [ADR-0002](../../../docs/adr/0002-provider-agnostic-llm-adapter-layer.md) (adapter layer)
and [ADR-0006](../../../docs/adr/0006-huggingface-default-provider-and-model.md) (default provider).
The bot is LLM-agnostic: a provider is one adapter + config. **Never** import an SDK or classify a
vendor's errors in `LlmService` or in chat/telegram/memory code — that all lives in the adapter.

## Steps

1. **Install the SDK** for the provider (`npm i <sdk>`).

2. **Create the adapter** `src/shared/llm/adapters/<name>.adapter.ts` implementing `LlmAdapter`
   (`src/shared/llm/llm-adapter.interface.ts`):
   - `readonly name` — the stable id used by `LLM_PROVIDER` (e.g. `'openai'`).
   - `isConfigured(): boolean` — `!!this.apiKey`.
   - `isRetryable(err): boolean` — **this adapter owns** its SDK's transient-error classification
     (rate limit / connection / 5xx → true; 4xx → false).
   - `generate(systemPrompt, messages: ChatTurn[]): Promise<string>` — map to the SDK call.
   - Follow the shape of `huggingface.adapter.ts` / `anthropic.adapter.ts` in the same folder.

3. **Invariants (do not break):**
   - Read keys/model in the constructor with `config.get<string>(...)` — **NOT** `getOrThrow` — so a
     missing *optional* provider key never crashes Nest's eager DI.
   - **Lazy-init** the SDK client on first `generate` (`this.client ??= new X(this.apiKey)`); throw a
     clear error if `generate` runs while `!isConfigured()`.
   - Cap output tokens with a small `MAX_TOKENS` const; trim the result; throw on empty.

4. **Register it** in `ADAPTER_CLASSES` in `src/shared/llm/llm.registry.ts` (the factory injects every
   class and keys the `Map` by `adapter.name`). Nothing else needs to know about it.

5. **Env vars** — add to BOTH `src/config/env.validation.ts` and `.env.example`:
   - Optional keys: `Joi.string().allow('').optional()` (empty = "not configured", matches
     `isConfigured()`). The **active** provider's key may be `.required()`.
   - Model id: `Joi.string().default('<sensible-default>')`.

6. **Select it** at runtime via `LLM_PROVIDER=<name>` (or `LLM_FALLBACK_PROVIDER=<name>`). The
   fallback fires only on a retryable primary failure — see `LlmService` in
   `src/shared/llm/llm.service.ts`. No changes to `ChatService`, Telegram, or memory.

## If the provider is Anthropic/Claude-family

Use the **`claude-api`** skill for exact SDK usage, model ids, and `thinking`/`effort` rules. Keep the
adapter shape above; only the `generate` body differs.

## Verify

`npm run build` and `npx eslint "src/**/*.ts"` clean; boot logs
`LLM provider: '<name>' ...`. If `LLM_PROVIDER` names an unconfigured/unknown adapter, `LlmService`
throws a clear startup error by design.
