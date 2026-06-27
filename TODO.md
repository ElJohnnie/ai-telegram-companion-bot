# Ayla — Roadmap / TODO

Status: **core bot working locally** (Telegram → Redis/Postgres → LLM → reply), with a
provider-agnostic LLM adapter layer. Items below are what's left.

## 1. LLM provider hardening

Context: HuggingFace migrated to "Inference Providers". On the free tier many open models
(Llama, Mistral, Zephyr) return **400** for a given token; we switched the default to
`Qwen/Qwen2.5-7B-Instruct`, which works. The free tier is also rate-limited and model
availability can change.

- [x] Switch default `HF_MODEL` to `Qwen/Qwen2.5-7B-Instruct` (works on free tier).
- [ ] **Configure the Anthropic fallback** so a transient HF failure still gets answered by Claude:
      set `LLM_FALLBACK_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`. (Code already supports it; just
      needs the key + env.)
- [ ] Decide the long-term primary: stay on HF free tier (cheap, flaky) vs. Anthropic Haiku
      (paid, reliable) vs. another provider.
- [ ] Surface a friendlier user message when *all* providers fail (currently a generic apology).
- [ ] Optional: add a 3rd adapter (e.g. OpenAI/Groq/Ollama) to prove the adapter pattern end-to-end.
- [ ] Handle HF rate-limit (429) explicitly — backoff and/or fall back rather than erroring.

## 2. Hosting on AWS via GitHub Actions CI/CD (deferred from the core pass)

Goal: run the bot 24/7 in the cloud with automated build + deploy on push, as agreed.

- [ ] **App Dockerfile** (multi-stage: build → slim runtime; run `prisma generate`; `npm run start:prod`).
- [ ] `.dockerignore` (node_modules, dist, .env, .git).
- [ ] **GitHub Actions pipeline** (`.github/workflows/deploy.yml`):
      - [ ] CI: install, `prisma generate`, `npm run build`, `npm run lint` on every push/PR.
      - [ ] CD on `main`: build image → push to **Amazon ECR** → deploy.
- [ ] **AWS target** — pick one:
      - [ ] ECS Fargate (managed containers) **or** a single EC2 instance running the image.
      - [ ] Managed **RDS Postgres** + **ElastiCache Redis** (or run both as containers to start).
- [ ] **Run Prisma migrations on deploy** (`npx prisma migrate deploy`), not `migrate dev`.
- [ ] **Secrets**: store `TELEGRAM_BOT_TOKEN`, provider API keys, `DATABASE_URL`, `REDIS_URL` in
      GitHub Actions secrets + AWS SSM Parameter Store / Secrets Manager (never in the image).
- [ ] Decide **polling vs webhook**: long polling works anywhere; a webhook (needs a public HTTPS
      URL) is lighter for production — revisit once hosted.
- [ ] Health check / restart policy and basic logging/observability.

## 3. Code quality / housekeeping

- [ ] Resolve the lint warning in `src/conversation/conversation.service.ts` (`(r: any)` →
      a proper Prisma type) — 0 errors, 1 warning today.
- [ ] Add tests (unit for `LlmService` fallback logic; e2e smoke for the chat flow).
- [ ] Tune the persona / system prompt in `src/chat/persona.ts` as desired.
- [ ] Consider trimming very long histories / token budgeting before sending to the LLM.
