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

## First playable slice

- Google sign-in and callback handling
- Eight-question character creation and origin preview
- Party creation, invite generation, and invite joining
- Party dashboard with current node, visible map, roster, daily movement/recovery signal
- Branch votes and non-combat event choices

Combat, inventory, villages, and progression screens remain outside this first
slice even though their typed API operations are available in the generated
contract.

## Backend contract

From the backend repository, export and regenerate the client after API changes:

```bash
cd ../healthrpg
pnpm api:export
cd ../healthrpg-app
pnpm api:generate
```

The generated client is `src/api/generated.ts`; it should not be edited by hand.

## Checks and production build

```bash
pnpm typecheck
pnpm lint
pnpm doctor
pnpm check
pnpm test
pnpm build
pnpm start
```

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
