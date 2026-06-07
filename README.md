# dock

The **branded front door** to a Mind pod — an **app launcher**, a
**profile** editor, and **account management**. The React hub on the shared
`@mind-studio/ui` design system that sits around the (separately-themed) Solid-server
login/consent pages.

## Shared packages (GitHub Packages)

This app installs `@mind-studio/core` and `@mind-studio/ui` from **GitHub Packages**.
A committed `.npmrc` scopes `@mind-studio` to that registry; before installing, export
a GitHub token with `read:packages`:

```bash
export NODE_AUTH_TOKEN=<a GitHub PAT with read:packages>
npm install
```

## What it is

- **Launcher** — a grid of your Mind apps, read from a pod-native registry
  at `{pod}/home/apps.ttl` (path owned by `@mind-studio/core`; seeded with the
  siblings; add/remove your own).
- **Profile** — edit your name / bio / photo; saved to your pod `profile/card`.
- **Account** — manage pods, linked WebIDs, and app credentials, via your pod
  account (a separate sign-in, handled server-side).

It deliberately does NOT reimplement the OIDC login/consent screens — those are
rendered by your pod's own server (themed separately in [codespaces](https://github.com/MIND-Studio/codespaces)).

## Dev setup

```bash
docker compose up -d        # local CommunitySolidServer on :3082 (persona: alice)
npm install
npm run dev                 # dock on :3080
```

Open <http://localhost:3080>, sign in (issuer `http://localhost:3082/`,
`alice@mind-dock.local` / `dev-only-do-not-use-in-prod`).

## Architecture note — two sessions

dock holds your **WebID session** (browser) for pod reads/writes (profile,
app registry). **Account management** needs your **pod-account** sign-in (a
different credential), held **server-side** by `/api/account/*` — the CSS account
cookie never reaches the browser and is encrypted at rest. See `AGENTS.md`.

## Ports

| Service | Port |
|---|---|
| dock (Next.js) | 3080 |
| CommunitySolidServer | 3082 |

(`:3081` / `:3083` belong to mind-hermes.)

## Releases

Versioning, `CHANGELOG.md`, and tags are automated with
[release-please](https://github.com/googleapis/release-please) — **don't tag or
edit `CHANGELOG.md` by hand.**

1. Commit to `main` using [Conventional Commits](https://www.conventionalcommits.org):
   `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE:` → major.
   `chore:` / `docs:` / `refactor:` / `test:` don't trigger a release.
2. release-please keeps an open **"chore(main): release X.Y.Z"** PR that rolls the
   pending commits into `CHANGELOG.md` and bumps the version.
3. Merge that PR to release: it creates the `vX.Y.Z` tag + GitHub Release, which
   fires `release.yml` to build and push the Docker image to GHCR.
4. Deploying the image to production is a separate, manual GitOps step in
   [`mindpods-infra`](https://github.com/MIND-Studio/mindpods-infra) (`mind-deploy.sh`).
