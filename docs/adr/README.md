# Architecture Decision Records

This directory records the significant architectural decisions for the Ayla bot, using lightweight
[ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (Michael Nygard
format). Each ADR captures one decision: its context, the decision itself, and the consequences.

ADRs are immutable once accepted. When a decision changes, add a new ADR and mark the old one
`Superseded by ADR-NNNN`.

## Index

| ADR | Title | Status |
| --- | --- | --- |
| [0000](0000-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0001](0001-nestjs-typescript-stack.md) | Use NestJS + TypeScript | Accepted |
| [0002](0002-provider-agnostic-llm-adapter-layer.md) | Provider-agnostic LLM adapter layer | Accepted |
| [0003](0003-two-tier-conversation-memory.md) | Two-tier conversation memory (Redis + PostgreSQL) | Accepted |
| [0004](0004-prisma-orm.md) | Use Prisma as the ORM | Accepted |
| [0005](0005-telegram-nestjs-telegraf-long-polling.md) | Telegram via nestjs-telegraf with long polling | Accepted |
| [0006](0006-huggingface-default-provider-and-model.md) | HuggingFace as default provider; Qwen2.5-7B model | Accepted |
| [0007](0007-defer-containerization-and-aws-cicd.md) | Defer containerization and AWS CI/CD | Accepted |
| [0008](0008-single-ec2-docker-compose-host.md) | Self-host full stack on a single EC2 t3.small via Docker Compose | Accepted |

## Template (Nygard)

```
# ADR-NNNN: <title>
## Status
Accepted | Proposed | Superseded by ADR-XXXX
## Context
<forces at play, the problem>
## Decision
<what we decided>
## Consequences
<resulting trade-offs, good and bad>
```
