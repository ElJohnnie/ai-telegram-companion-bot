# ADR-0008: Self-host the full stack on a single EC2 t3.small via Docker Compose

## Status

Accepted — 2026-06-27 (refines the deferred hosting target in ADR-0007)

## Context

ADR-0007 deferred hosting and left the target open (ECS Fargate vs. EC2; managed RDS/ElastiCache vs.
self-run datastores). For the first real deployment we want the **simplest, cheapest** thing that
runs the bot 24/7. Traffic is low, there is no high-availability requirement yet, and the entire
system is already containerizable and env-driven (ADR-0001, ADR-0003). The LLM runs remotely
(ADR-0006), so the host needs no GPU and little RAM beyond the datastores + Node process.

## Decision

Host on a **single EC2 `t3.small`** instance running the **entire stack as containers via Docker
Compose**: the app (its own multi-stage Dockerfile), **PostgreSQL**, and **Redis** all run on that
one box. **No managed AWS services** initially — no ECS, no RDS, no ElastiCache. The app reaches the
datastores over the Compose network (service names, not `localhost`). GitHub Actions builds the image
and deploys to the instance (registry pull + `docker compose up -d`); Prisma migrations run as a
one-shot `migrate deploy` step. Secrets are delivered as an env file / SSM, never baked into the
image.

## Consequences

- **Cheapest and simplest** to stand up and reason about: one instance, one `docker-compose.yml`, one
  deploy target. Low monthly cost.
- **Single point of failure / no HA:** if the instance dies, the bot is down. Accepted for this phase.
- **Data durability is our responsibility:** Postgres data lives on the instance's EBS volume — we
  must configure EBS snapshots / backups, or an instance loss loses conversation history.
- **t3.small is 2 vCPU / 2 GiB RAM (burstable):** Postgres + Redis + Node coexist but the budget is
  tight — set per-container memory limits. No local LLM means no model RAM pressure.
- **Security:** lock the security group down (SSH from a known IP; no inbound port needed because the
  bot uses long polling, ADR-0005). Keep the host patched.
- **Clean upgrade path:** because everything is containerized and configured via env vars, moving to
  ECS/Fargate with managed RDS + ElastiCache later (for HA and horizontal scale) is a wiring change,
  not a rewrite — only `DATABASE_URL`/`REDIS_URL` and the deploy target change.
