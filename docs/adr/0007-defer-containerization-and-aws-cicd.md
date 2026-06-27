# ADR-0007: Defer containerization and AWS CI/CD

## Status

Accepted — 2026-06-27

## Context

The end goal is to run the bot 24/7 in the cloud with automated build-and-deploy on push (AWS +
GitHub Actions). However, the first milestone is a working, debuggable bot. Standing up Docker images,
an ECR/ECS or EC2 target, managed datastores, and a deploy pipeline before the core behavior is solid
would slow iteration and front-load infra decisions we can make better once the app is stable.

## Decision

Scope the first pass to a **locally runnable core bot**. Provide only a `docker-compose.yml` for the
**local datastores** (PostgreSQL + Redis); the bot runs on the host via `npm run start:dev`
(long polling, ADR-0005). **Defer** the application Dockerfile, the GitHub Actions CI/CD pipeline, and
the AWS hosting target to a later, dedicated pass, tracked in `TODO.md`.

## Consequences

- Fast local iteration with real datastores, no cloud account required to develop.
- The bot is **not yet online 24/7** — it runs only while a local process is up. This is an accepted,
  explicit limitation of the current phase.
- The deferred work is enumerated so it isn't forgotten: app Dockerfile + `.dockerignore`; CI
  (install → `prisma generate` → build → lint) on every push; CD on `main` (build image → push to
  ECR → deploy to ECS Fargate or EC2); managed RDS Postgres + ElastiCache Redis; `prisma migrate
  deploy` on release; secrets in GitHub Actions + AWS Secrets Manager; and a polling-vs-webhook
  decision (ADR-0005) for production.
- Because config is fully env-driven (ADR-0001) and datastores are already external services, moving
  to containers/cloud is a packaging-and-wiring change, not an app rewrite.
