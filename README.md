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
