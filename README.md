# HealthRPG UI

TanStack Start UI for the sibling [`healthrpg`](../healthrpg) backend. The app
uses Nitro’s portable Node server adapter, a same-origin BFF, an HttpOnly
session cookie, and a ky client backed by generated OpenAPI types.

## Local development

```bash
cp .env.example .env
pnpm install
pnpm api:generate
pnpm dev
```

The UI runs at `http://localhost:3001` and proxies authenticated API calls to
`http://localhost:3000`. Start the backend separately with its local setup,
then configure Google OAuth there with:

```text
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
WEB_ORIGIN=http://localhost:3001
```

The browser never receives the backend bearer token. The UI BFF stores it in
the `healthrpg_session` HttpOnly cookie and forwards it server-side.

## Current UI slice

- Google sign-in and callback handling
- Eight-question character creation and origin preview
- Party creation, invite generation, and invite joining
- Party dashboard with current node, visible map, roster, daily movement/recovery signal
- Branch votes and non-combat event choices
- Health connection status, manual sync, and timezone preferences
- Inventory, loadout, equipment, and personal progression views
- Combat action selection, target selection, and field-kit healing
- Village merchant purchases and departure voting
- Party progression history and leader roster management

Persistent invite listing is deferred because the current backend contract only
supports creating and revoking invites; the freshly-created token remains
available in the party management panel for the current session.

The adventure/land panel is deferred until the backend’s new adventure contract
is stable and reflected in the checked-in OpenAPI types. No UI code depends on
that endpoint yet.

## Backend contract

From the backend repository, export and regenerate the client after API changes:

```bash
cd ../healthrpg
pnpm api:export
cd ../healthrpg-app
pnpm api:generate
```

The generated client is `src/api/generated.ts`; it should not be edited by hand.
Regenerate it only after the backend contract is stable; while backend endpoint
changes are in flight, the UI intentionally remains on the last compatible
generated contract.

## Checks and production build

```bash
pnpm verify
pnpm test:e2e
pnpm start
```

`pnpm verify` runs formatting, ESLint, TypeScript, React Doctor, unit tests,
and the production build. Playwright uses the local mock backend and remains a
separate check.

Nitro emits the production server to `.output/server/index.mjs`. Set
`API_BASE_URL` and `APP_ORIGIN` in the hosting environment rather than
committing secrets or environment files.

## Styling

The visual system is source-owned shadcn-style primitives with a custom
parchment, deep indigo, gold, amethyst, and teal palette. New primitives can
be added with:

```bash
pnpm dlx shadcn@latest add button
```
