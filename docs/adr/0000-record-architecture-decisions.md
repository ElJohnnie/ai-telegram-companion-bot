# ADR-0000: Record architecture decisions

## Status

Accepted — 2026-06-27

## Context

This is a greenfield project that is making several non-obvious technical choices early (LLM
abstraction, memory topology, framework). Without a record, the *why* behind each choice is lost,
and future contributors re-litigate settled questions or break invariants they didn't know existed.

## Decision

We will keep Architecture Decision Records (ADRs) in `docs/adr/`, one Markdown file per decision,
using the Michael Nygard format (Context / Decision / Consequences). ADRs are immutable once
accepted; a changed decision is captured as a new ADR that supersedes the old one.

## Consequences

- New contributors can read `docs/adr/` to understand the system's rationale, not just its code.
- Each significant change should ask "does this need an ADR?" — a small, ongoing discipline.
- The ADR log doubles as a changelog of architectural intent over time.
