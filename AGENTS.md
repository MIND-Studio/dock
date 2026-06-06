# This is NOT the Next.js you know

This version (16.2.6) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# mind-dock-v0 — agent rules

The **branded front door** to a user's Solid pod: an **app launcher**
(tiles to the sibling Mind apps), a **profile** editor, and **account management**
(pods, linked WebIDs, client credentials). It is the React hub that sits *around*
the (server-rendered, separately-themed) CommunitySolidServer login/consent pages.

## The two-session split (the rule that shapes the app)

- **WebID / OIDC session** (browser, `useSession`, DPoP `fetch`) — used for reading
  and writing the user's **pod**: their `profile/card` and the app registry at
  `{pod}/home/apps.ttl`. This is the everyday session.
- **CSS *account* session** — a DIFFERENT credential (pod-account email+password),
  a pod-origin cookie, cross-origin to `:3080`. Required only for account
  management (pods/WebIDs/credentials). Held **server-side**: `/api/account/*`
  routes log into the CSS account with a cookie jar (see
  `src/lib/solid/css-account.ts`), store the cookie encrypted in sqlite
  (`src/lib/dock/account-session.ts`), and proxy operations. **Never** expose the
  CSS account cookie to the browser; never log it.

CSS v7's account API has **no** control to revoke authorized OIDC apps (its keys are
`create/pod/webId/clientCredentials/logout`). So "revoke connected apps" is not a
feature — link out to the pod's `/.account/` page instead.

## Design system & voice

Uses the shared **`@mind-studio/ui`** on the **default Mind brand** (teal-green), **dark**
default. `globals.css` does `@import "../../node_modules/@mind-studio/ui/dist/styles.css"` +
`@source "../../node_modules/@mind-studio/ui/dist"`; `layout.tsx` sets
`<html data-mind-theme="mind">` + `<ThemeProvider theme={mind} defaultTheme="dark"
enableSystem={false} storageKey="mind-dock-theme-v1">`. Build UI from `@mind-studio/ui`
components. Both `@mind-studio/ui` and `@mind-studio/core` install from **GitHub
Packages** (registry deps, `package.json` pins `^0.1.0`); a committed `.npmrc`
scopes `@mind-studio` to `npm.pkg.github.com` — export a token with `read:packages`
(`export NODE_AUTH_TOKEN=<PAT>`) before `npm install`. To iterate on the shared
packages locally, bump+publish them, or `npm install` a local `npm pack` tarball
as a temporary override.

Voice = for everyone, plain words. No "WebID/OIDC/RDF/Turtle" in user-facing copy —
say "your account", "your apps", "your profile", "your private space".

## Storage (pod-native — never a central DB for user data)

- Profile: `{pod}/profile/card#me` (`foaf:name`, `vcard:note`, `vcard:hasPhoto`).
- App launcher registry: `{pod}/home/apps.ttl` (vocab `http://mind.example/voc#App`).
  The `/home/` path is fixed by `@mind-studio/core` (`apps/registry.js`) and is the
  same across all consumers — it stays `/home/` even though this app is now Dock.
  Renaming it is a cross-cutting change in core, not here.
- The sqlite store (`.dock-data/`) holds ONLY the server-side CSS account session
  (encrypted cookie) — a transient auth convenience, never user content.

## Never log

Pod credentials, the CSS account cookie, account email/password, profile bodies.
OK to log: WebID, route, status, latency, event type.

## Ports

Dev app `:3080`, own CSS `:3082` (`:3081`/`:3083` belong to mind-hermes).
