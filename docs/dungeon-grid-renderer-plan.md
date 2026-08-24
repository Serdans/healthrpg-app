# Dungeon Grid Renderer — PMD-Style Floor Plan

## Goal

Bring the dungeon exploration scene closer to the readable, atmospheric
presentation of the DS-era Pokémon Mystery Dungeon floors while preserving the
existing React page, API, and optimistic movement behavior.

The scene now treats the party's current `floorNo` as the active floor. The
renderer derives a continuous orthogonal plane from the existing
`tileX`/`tileY`, `discovered`, `role`, and `spawnArchetype` fields, then draws
that floor through one persistent PixiJS/WebGL scene and ticker loop.

## Dungeon loop contract

The dungeon is a Health-driven autoplay expedition rather than a second
overworld branch graph. Daily Health projection adds clearly named **Explore
energy** to the party's tile balance; manual arrows and Auto-explore spend that
balance one tile at a time.

Daily resolution is also the party's default Navigator: newly accrued movement
units run a server-side automatic expedition even when a member currently owns
the manual Navigator lease. The lease is an override for hands-on movement,
not a pause button for the Health loop. Safe ground and newly revealed ordinary
tiles are explored automatically; bosses and low-health risk states halt the
automatic route instead of spending the party's progress blindly.

The party's route is policy-first. Mission is the default. Any member can
suggest Mission, Explore, Treasure, or Rest; the Navigator commits one policy
and the server follows it until the policy target is reached or the Navigator
changes it. Stairs are planner-managed floor transitions, not a separate route
choice. Suggestions are advisory and never race the shared party position. The
map keeps a four-button touch D-pad alongside keyboard input for an explicit
one-tile manual nudge.

- Stairs are the only floor-transition marker. Stairs down land the party on
  the linked stair landing on the next floor; stairs up are the corresponding
  return landing.
- The final floor has one required **Mission objective** landmark. For the
  first ruins this is the Memory Well. Reaching it pauses movement for its
  narrative event. Once that event succeeds in daily resolution, the server
  completes the objective and returns the party to the overworld location that
  opened the dungeon.
- Rest, treasure, goal, and live combat tiles pause movement. Combat remains
  pinned until resolved; event tiles remain in place until their daily choice
  resolves.
- Routine encounters can be reached by the automatic route when party health
  is safe and resolve with the party's default combat behavior, with the daily
  recap recording the result. Boss encounters remain a deliberate party
  decision. Any member below 25% projected health sends the party to the
  nearest discovered campsite, then resumes Mission after recovery. The
  current tile remains the single source of truth for the next daily
  resolution.
- Tile dungeons never create overworld branch votes or silently follow graph
  edges during daily projection. The tile graph owns movement while the party
  is inside the location session.

## Active-floor layout

- Only the party's active floor is rendered; floors switch automatically after
  a server response changes the current node's floor.
- Known walkable nodes become floor cells. Missing cells inside the bounding box
  become wall cells, while known-but-undiscovered nodes remain fog cells. A
  two-cell non-walkable context border keeps compact API maps readable without
  inventing additional movement nodes.
- Each cell exposes a deterministic decoration seed and eight-neighbor edge
  mask for terrain variants, wall caps, corners, and props.
- Maps without tile coordinates continue to use the existing `InteriorMap`
  fallback.

## Art and rendering

- Dungeon terrain is authored directly as detailed 24×24 source tiles and baked
  into a 54-chunk atlas by `scripts/build-dungeon-tileset.ts`.
- The terrain atlas contains three variants for every four-way floor boundary
  mask, authored wall cap/face/deep chunks, and fog. Floor variants use calmer
  clustered details and limited accent pixels so texture does not overpower
  actors. Floor boundaries come from the atlas lookup rather than procedural
  rectangular strokes.
- Dungeon markers use a separate transparent 24×24 prop atlas built by
  `scripts/build-dungeon-props.ts`. It contains the chest, directional
  stairwells, objective beacon, entry gate, campsite, and combat/boss runes.
  Their glows and ambient effects remain deterministic Pixi overlays, so the
  API does not need new prop metadata.
- The PixiJS scene-graph draw order is backdrop, terrain, cliff edges, light pools,
  markers, shadows, depth-sorted actors, atmospheric tint, motes, and the
  party's underfoot feedback.
- `@pixi/react` owns the WebGL canvas while Pixi containers, sprites, and
  graphics remain persistent between ticker frames. WebGL2 is preferred and
  WebGL1 remains an allowed Pixi fallback; the UI reports a renderer error if
  initialization or asset loading fails.
- The camera uses the same transform for rendering and pointer hit-testing. Its
  centered viewport origin keeps compact stages visually centered while the
  stage remains at a stable 2× source-pixel scale. Larger layouts scroll around
  the party instead of fit-zooming small floors into chunky blocks.
- The party and monsters retain the existing sprite sheets, with eased movement,
  walking frames, idle bob, ground shadows, ambient light, and reduced-motion
  support. Monster sprites are normalized from their alpha bounds: regular
  silhouettes target 0.86 tile of visible footprint and bosses target one tile,
  independent of transparent atlas padding.

## Movement and reconciliation

- Manual movement remains locally projected and serialized through one
  `mutateAsync` request at a time.
- Rejections still discard unconfirmed intents and slide the party back to the
  confirmed node.
- Auto-explore consumes the returned path directly. A floor transition snaps
  the movement controller to the confirmed target before the new active-floor
  layout renders.

## UI and accessibility

- The scene HUD shows dungeon name, active floor, Explore energy, and the active
  required mission objective. The legend spells out what stairs, campsite,
  hidden cache, monster, and objective markers mean; meaning is never carried
  by color alone.
- The inspector presents a marker's semantic label and description. A goal is
  explicitly described as the mission objective, not as an unexplained crystal
  or a separate exit.
- The route panel explains that the Mission objective is the final return
  objective; stairs only change floors. It shows the active automatic policy,
  the party's suggestions, and whether the current user is the Navigator.
- Event responses expose `resolved: boolean`. Resolved event choices are
  visibly closed in the client and the daily-loop command center reports that
  the next projection will advance the expedition.
- Tile dungeons use an atmospheric dark panel shell with teal/moss surfaces and
  brass objective accents. The dungeon objective ribbon, action row, inspector,
  and scene HUD share the same visual language; village and overworld panels
  retain their existing treatments.
- Keyboard movement, focus handling, pointer inspection, live status, read-only
  mode, and reduced-motion behavior remain available.
- Stable floor, tile-balance, party-position, and recovery attributes support
  browser-level assertions.

## Tests

- Unit tests cover active-floor selection, terrain edge masks, fog, chunk atlas
  invariants, camera zoom/dead zones/pixel snapping, projected movement,
  constant-velocity sampling, rejection, floor changes, and alpha-grounded
  sprite anchors.
- Storybook covers an atmospheric room/corridor floor and interactive walking.
- E2E covers the HUD, delayed optimistic movement, rejection recovery, queued
  input discard, and dungeon request payloads.

## Verification

- `pnpm check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test-storybook`
- `pnpm test:e2e --grep dungeon`
- `pnpm build`
