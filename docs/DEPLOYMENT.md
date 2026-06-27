# Deployment — single EC2 `t3.small`, full stack in Docker Compose

This is the concrete how-to for the hosting decision in [ADR-0008](adr/0008-single-ec2-docker-compose-host.md).
The whole stack — **app + PostgreSQL + Redis** — runs as containers on **one EC2 `t3.small`**, with no
managed AWS services. CI/CD is GitHub Actions: every push runs CI; a push to `main` builds the image,
pushes it to **GHCR**, and deploys to the instance over SSH.

```
 push → GitHub Actions ──build image──▶ GHCR (ghcr.io/<owner>/<repo>)
                          │
                          └─SSH/SCP──▶ EC2 t3.small
                                        └─ docker compose: app + postgres + redis
```

Everything below is already in the repo (`Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`,
`.github/workflows/{ci,deploy}.yml`). You only need to provision the box and set the secrets.

---

## 1. Provision the EC2 instance

1. Launch an EC2 **`t3.small`** (2 vCPU / 2 GiB RAM). Amazon Linux 2023 or Ubuntu 22.04+.
2. Attach enough EBS (e.g. 20 GiB gp3) — Postgres data lives here.
3. **Security group:** allow inbound **SSH (22) from your IP only**. No other inbound is needed —
   the bot uses Telegram long polling (outbound only).
4. Keep the SSH key pair; you'll add the private key to GitHub secrets.

## 2. Install Docker on the instance

```bash
# Amazon Linux 2023
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # re-login after this
# Compose plugin:
sudo dnf install -y docker-compose-plugin || true
```

(Ubuntu: `sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin`.)

Verify: `docker compose version`.

## 3. Create the app directory + `.env` on the instance

```bash
mkdir -p ~/ayla && cd ~/ayla
```

Create `~/ayla/.env` (this file holds the secrets and stays on the box — never commit it):

```bash
# Telegram
TELEGRAM_BOT_TOKEN=...

# LLM (provider-agnostic — see ADR-0002 / ADR-0009)
# Default: Claude primary, HuggingFace as the free last-resort fallback.
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
LLM_FALLBACK_PROVIDER=huggingface
HUGGINGFACE_API_KEY=...
HF_MODEL=Qwen/Qwen2.5-7B-Instruct

# Postgres password (used by both the app's DATABASE_URL and the postgres container)
POSTGRES_PASSWORD=choose-a-strong-password
```

> `DATABASE_URL` and `REDIS_URL` are **not** set here — `docker-compose.prod.yml` injects them
> pointing at the `postgres` and `redis` service names on the Compose network.

The deploy workflow copies `docker-compose.prod.yml` into `~/ayla` automatically, so you don't place
it manually.

## 4. GitHub repo secrets

Settings → Secrets and variables → Actions → **New repository secret**:

| Secret        | Value                                                        |
| ------------- | ----------------------------------------------------------- |
| `EC2_HOST`    | Public IP / DNS of the instance                             |
| `EC2_USER`    | SSH user (`ec2-user` on Amazon Linux, `ubuntu` on Ubuntu)   |
| `EC2_SSH_KEY` | The **private** SSH key (full PEM contents)                  |
| `GHCR_PAT`    | *Optional* — a PAT with `read:packages`, only if you keep the image **private** |

**Image visibility:** the workflow pushes to `ghcr.io/<owner>/<repo>`. Simplest is to make that GHCR
package **public** (then the instance pulls with no auth and you can skip `GHCR_PAT`). To keep it
private, set `GHCR_PAT` and the deploy step will `docker login` on the box.

## 5. Deploy

- **Automatic:** push to `main`. The `Deploy` workflow builds → pushes to GHCR → SCPs the compose
  file → SSHes in and runs `pull`, `prisma migrate deploy`, `up -d`.
- **Manual:** run the `Deploy` workflow via "Run workflow" (workflow_dispatch).

First deploy creates the tables (via `migrate deploy`) and starts all three containers.

## 6. Operate

On the instance, from `~/ayla`:

```bash
docker compose -f docker-compose.prod.yml ps          # status
docker compose -f docker-compose.prod.yml logs -f app # follow bot logs
docker compose -f docker-compose.prod.yml restart app # restart just the app
docker compose -f docker-compose.prod.yml down         # stop everything (data persists in volumes)
```

Run a migration manually if ever needed:

```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

## 7. Backups & durability (important — single box)

Postgres data is on the instance's EBS volume. A lost instance loses history unless you back up:

- Enable **EBS snapshots** (AWS Backup or a scheduled snapshot policy), **or**
- Periodic logical dump:
  ```bash
  docker compose -f docker-compose.prod.yml exec postgres \
    pg_dump -U ayla ayla | gzip > ~/ayla-backup-$(date +%F).sql.gz
  ```

## 8. Resource notes (`t3.small`)

2 GiB RAM is shared by Postgres + Redis + Node. The compose file sets memory limits
(`postgres 768m`, `app 512m`, `redis 256m`). The LLM runs remotely (HuggingFace/Anthropic), so there's
no model RAM pressure. If memory gets tight, lower `HISTORY_LIMIT` / Redis usage or resize the box.

## 9. Scaling later (out of scope now)

Because everything is containerized and env-driven, moving to managed services (ECS/Fargate + RDS +
ElastiCache) for HA/scale is a wiring change — point `DATABASE_URL`/`REDIS_URL` at the managed
endpoints and change the deploy target. See ADR-0007 / ADR-0008.
