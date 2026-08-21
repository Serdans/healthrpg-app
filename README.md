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

Run the component workbench independently of the backend with:

```bash
pnpm storybook
```

Storybook is available at `http://localhost:6006` and uses static fixtures for
its initial component and party-state stories.

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
- Adventure atlas with current land, objective, and completed landmark history
- Party progression history and leader roster management

Persistent invite listing is deferred because the current backend contract only
supports creating and revoking invites; the freshly-created token remains
available in the party management panel for the current session.

## Backend contract

From the backend repository, export and regenerate the client after API changes:

```bash
cd ../healthrpg
pnpm api:export
cd ../healthrpg-app
pnpm api:generate
```

The generated client is `src/api/generated.ts`; it should not be edited by hand.
The UI BFF accepts browser requests under `/api/v1` and forwards them to the
backend’s `/api/v1` API. Regenerate the client whenever the backend OpenAPI
contract changes.

## Checks and production build

```bash
pnpm verify
pnpm build-storybook
pnpm test:e2e
pnpm start
```

`pnpm verify` runs formatting, ESLint, TypeScript, React Doctor, unit tests,
and the production build. Storybook has a separate production build check, and
Playwright uses the local mock backend as a separate check.

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
