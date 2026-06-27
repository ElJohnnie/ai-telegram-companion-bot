# Roadmap / TODO

> The bot's name is configurable via `BOT_NAME` (default `Ayla`); "the bot" below is name-agnostic.

Status: **core bot working locally** (Telegram → Redis/Postgres → LLM → reply), with a
provider-agnostic LLM adapter layer. Items below are what's left.

## 1. LLM provider hardening

Context: Default is now **Claude (Anthropic Haiku) primary, HuggingFace free fallback** (see
ADR-0009). HuggingFace migrated to "Inference Providers"; on the free tier many open models (Llama,
Mistral, Zephyr) return **400** for a given token, so the fallback uses `Qwen/Qwen2.5-7B-Instruct`,
which works. The free tier is also rate-limited and model availability can change.

- [x] Switch default `HF_MODEL` to `Qwen/Qwen2.5-7B-Instruct` (works on free tier).
- [x] **Decide the long-term primary:** Claude (Anthropic Haiku) is primary; HuggingFace free tier is
      the last-resort fallback (`LLM_PROVIDER=anthropic` + `LLM_FALLBACK_PROVIDER=huggingface`).
- [x] **Don't crash on a missing primary key:** `LlmService` promotes the configured fallback to
      primary at startup when the selected primary isn't configured.
- [ ] Set the real `ANTHROPIC_API_KEY` in the environment (still blank locally; the bot currently
      boots on the promoted HuggingFace fallback until it's set).
- [ ] Surface a friendlier user message when *all* providers fail (currently a generic apology).
- [ ] Optional: add a 3rd adapter (e.g. OpenAI/Groq/Ollama) to prove the adapter pattern end-to-end.
- [ ] Handle HF rate-limit (429) explicitly — backoff and/or fall back rather than erroring.

## 2. Hosting — single EC2 t3.small, full stack in Docker Compose (see ADR-0008)

Goal: run the bot 24/7 on **one EC2 `t3.small`** with the **whole stack as containers** (app +
Postgres + Redis via `docker-compose`). **No managed services** (no ECS/RDS/ElastiCache) initially.
Automated build + deploy on push via GitHub Actions.

- [ ] **App Dockerfile** (multi-stage: build → slim runtime; run `prisma generate`; `npm run start:prod`).
- [ ] `.dockerignore` (node_modules, dist, .env, .git).
- [ ] **Production `docker-compose`** running all three services (app + postgres + redis) on the box,
      with a named volume for Postgres data and `restart: unless-stopped`. App reaches the datastores
      via the compose network (`DATABASE_URL`/`REDIS_URL` point at the service names, not localhost).
- [ ] **GitHub Actions pipeline** (`.github/workflows/deploy.yml`):
      - [ ] CI: install, `prisma generate`, `npm run build`, `npm run lint` on every push/PR.
      - [ ] CD on `main`: build image → push to a registry (**Amazon ECR** or GHCR) → SSH/SSM to the
            instance → `docker compose pull && up -d`.
- [ ] **Run Prisma migrations on deploy** (`npx prisma migrate deploy`, not `migrate dev`) as a
      one-shot step against the Postgres container.
- [ ] **Secrets**: `TELEGRAM_BOT_TOKEN`, provider API keys, DB/Redis creds in GitHub Actions secrets;
      delivered to the instance as an env file / SSM — never baked into the image or committed.
- [ ] **t3.small sizing (2 vCPU / 2 GiB RAM):** set container memory limits so Postgres + Redis +
      Node coexist; the LLM runs remotely (HF/Anthropic), so no local model RAM needed.
- [ ] **Data durability:** Postgres lives on the instance's EBS volume — set up EBS snapshots / a
      backup so an instance loss doesn't lose history (single box = single point of failure).
- [ ] **Instance hardening:** restrict the security group (SSH from your IP only; no inbound needed
      for long polling), keep the OS patched.
- [ ] Decide **polling vs webhook**: long polling needs no inbound URL (fine on this box); a webhook
      would require opening HTTPS — revisit only if polling becomes a constraint.
- [ ] Health check / restart policy (`restart: unless-stopped`) and basic logging.

> Everything is already containerized and env-driven, so migrating later to ECS/RDS/ElastiCache (for
> HA/scale) is a wiring change, not a rewrite.

## 3. Code quality / housekeeping

- [ ] Resolve the lint warning in `src/conversation/conversation.service.ts` (`(r: any)` →
      a proper Prisma type) — 0 errors, 1 warning today.
- [ ] Add tests (unit for `LlmService` fallback logic; e2e smoke for the chat flow).
- [ ] Tune the persona / system prompt in `src/chat/persona.ts` as desired.
- [ ] Consider trimming very long histories / token budgeting before sending to the LLM.
