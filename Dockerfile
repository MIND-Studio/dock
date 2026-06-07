# syntax=docker/dockerfile:1.7
#
# Production image for mind-dock (the "dock"). Two stages:
#   builder — installs deps (incl. C toolchain for better-sqlite3) and runs
#             `next build` to emit .next/standalone.
#   runtime — minimal Debian-slim running the standalone server as non-root.
#
# bookworm-slim (glibc), not Alpine, because better-sqlite3's prebuilt binary
# wants glibc; building from source on Alpine is slower and needs apk toolchain
# every time. Mirrors the mind-codespaces bridge image.

# --- Stage 1: build --------------------------------------------------------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential python3 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# `.npmrc` points the @mind-studio scope at GitHub Packages and reads the auth
# token from $NODE_AUTH_TOKEN. The token is passed as a BuildKit secret (never
# baked into a layer) and exported only for this npm ci invocation.
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=secret,id=node_auth_token \
    NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token 2>/dev/null || true)" \
    npm ci --no-audit --no-fund

# Guarantee Next's native swc binary. `npm ci` intermittently omits a
# platform-optional native dep even when it's correctly in the lockfile
# (npm/cli #4828) — and Next 16's Turbopack has NO WASM fallback, so a missing
# binary aborts the build ("Turbopack is not supported on this platform"). We
# force-install the binary matching the build platform's arch + the resolved
# next version (process.arch is "x64"/"arm64", matching the package names) so the
# build never depends on npm-ci luck. It's a public package (no GHCR auth), and
# `--no-save` leaves package.json/lock untouched.
RUN npm install --no-save "@next/swc-linux-$(node -p process.arch)-gnu@$(node -p "require('next/package.json').version")"

COPY . .
# Next.js handles a missing public/ at runtime, but the runtime-stage COPY
# refuses a path that doesn't exist — materialise it so the copy succeeds.
RUN mkdir -p public

# NEXT_PUBLIC_* are inlined at build time, so the deploy target is baked into
# the image here (passed as build-args by the release workflow).
ARG NEXT_PUBLIC_OIDC_ISSUER
ARG NEXT_PUBLIC_SOLID_ISSUER
ARG NEXT_PUBLIC_POD_BASE_URL
ENV NEXT_PUBLIC_OIDC_ISSUER=$NEXT_PUBLIC_OIDC_ISSUER \
    NEXT_PUBLIC_SOLID_ISSUER=$NEXT_PUBLIC_SOLID_ISSUER \
    NEXT_PUBLIC_POD_BASE_URL=$NEXT_PUBLIC_POD_BASE_URL

# The app launcher (shared @mind-studio/core) links to the sibling Mind apps;
# their public URLs are inlined here too.
ARG NEXT_PUBLIC_APP_DOCK_URL
ARG NEXT_PUBLIC_APP_DRIVE_URL
ARG NEXT_PUBLIC_APP_BUILDER_URL
ARG NEXT_PUBLIC_APP_CODESPACES_URL
ENV NEXT_PUBLIC_APP_DOCK_URL=$NEXT_PUBLIC_APP_DOCK_URL \
    NEXT_PUBLIC_APP_DRIVE_URL=$NEXT_PUBLIC_APP_DRIVE_URL \
    NEXT_PUBLIC_APP_BUILDER_URL=$NEXT_PUBLIC_APP_BUILDER_URL \
    NEXT_PUBLIC_APP_CODESPACES_URL=$NEXT_PUBLIC_APP_CODESPACES_URL

# App-owned feedback inbox (public-append container). Inlined at build time.
ARG NEXT_PUBLIC_FEEDBACK_INBOX
ENV NEXT_PUBLIC_FEEDBACK_INBOX=$NEXT_PUBLIC_FEEDBACK_INBOX

RUN npm run build

# --- Stage 2: runtime ------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

# ca-certificates for TLS to the pod / OIDC issuer; tini as PID 1 so SIGTERM
# is propagated and zombies reaped.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*

# node:22-bookworm-slim ships a non-root `node` user at uid 1000.
USER node

# Next.js standalone output: server.js + only the traced node_modules
# (incl. the better-sqlite3 native binary built in the builder stage).
COPY --chown=node:node --from=builder /app/.next/standalone ./
COPY --chown=node:node --from=builder /app/.next/static ./.next/static
COPY --chown=node:node --from=builder /app/public ./public

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
