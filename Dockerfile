# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:22-slim AS build
WORKDIR /app

# Prisma engines need OpenSSL at generate/runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Install all deps (incl. dev + Prisma CLI) for build and for `migrate deploy`.
COPY package*.json ./
RUN npm ci

# Generate the Prisma client (linux engine) before compiling.
COPY prisma ./prisma
RUN npx prisma generate

# Compile TypeScript.
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Bring the installed deps (incl. generated Prisma client + Prisma CLI for
# `migrate deploy`), the compiled app, and the migrations.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

USER node
CMD ["node", "dist/main.js"]
