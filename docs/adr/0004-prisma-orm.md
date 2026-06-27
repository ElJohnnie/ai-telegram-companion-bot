# ADR-0004: Use Prisma as the ORM

## Status

Accepted — 2026-06-27

## Context

We need typed access to PostgreSQL for `User` and `Message`, plus a migration workflow to evolve the
schema. Options in the Node/Nest ecosystem include TypeORM, MikroORM, Knex, and Prisma.

## Decision

Use **Prisma**. The schema lives in `prisma/schema.prisma`; a thin `PrismaService` extends
`PrismaClient` and manages connect/disconnect via Nest lifecycle hooks, exposed through a global
`PrismaModule`.

The Prisma client is generated to the **default location** (`node_modules/@prisma/client`), not a
custom `src/` output path. (An early attempt at a custom `output` under `src/generated` broke at
runtime: `nest build` only compiles `.ts`, so the generated JS client wasn't copied into `dist/` and
`require` failed. The default location is always present at runtime.)

## Consequences

- Fully typed queries and results; the generated types feed directly into the memory layer.
- First-class migration workflow: `prisma migrate dev` locally; **`prisma migrate deploy`** in
  CI/CD (do not run `migrate dev` in production).
- The generated client lives in `node_modules` (gitignored) → `prisma generate` must run after
  `npm install` and on any schema change. This is wired into the deploy steps in the roadmap.
- Trade-off: Prisma's generate step is an extra build dependency versus a query builder like Knex;
  accepted for the type safety and migration ergonomics.
