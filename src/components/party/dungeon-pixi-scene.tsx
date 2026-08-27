import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { Application, useApplication, useTick } from '@pixi/react';
import type { ApplicationRef } from '@pixi/react';
import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Ticker, Texture as PixiTexture } from 'pixi.js';

import { cellOrigin, tileCenter } from '#/lib/dungeon-grid';
import type { DungeonGridCell, DungeonGridLayout, DungeonGridTile } from '#/lib/dungeon-grid';
import { dungeonMarkerPresentationForTile } from '#/lib/dungeon-markers';
import { dungeonZoom, followDungeonCamera, snapCamera } from '#/lib/dungeon-camera';
import type { CameraState } from '#/lib/dungeon-camera';
import { DUNGEON_ARRIVAL_BOB_PX, sampleDungeonMotion, walkFrameForElapsed, walkFrameForMotion } from '#/lib/dungeon-motion';
import type { DungeonRecoveryMotion } from '#/lib/dungeon-motion';
import { dungeonMapMonsterArtForArchetype, dungeonMapPartyArt, dungeonPropsArt, dungeonTilesetArt, enemyArchetypes } from '#/lib/game-art';
import type { PartyTravelerDirection } from '#/lib/game-art';
import type { DungeonPropTextureName } from '#/lib/dungeon-props';
import { floorTextureName, TEXTURE_COUNT, TEXTURE_INDEX } from '#/lib/dungeon-tiles';
import {
	createGroundedFrameTexture,
	dungeonPartyScale,
	dungeonMonsterScale,
	dungeonMonsterShadowWidth,
	dungeonMonsterVisibleSize,
	readFrameAlphaBounds,
} from '#/lib/dungeon-sprite';
import { groundedAnchor } from '#/lib/sprite-grounding';
import type { AlphaBounds, SpriteFrameRect } from '#/lib/sprite-grounding';
import type { DungeonMovementController } from '#/lib/dungeon-movement';

export interface DungeonPixiSceneProps {
	layout: DungeonGridLayout;
	movement: DungeonMovementController;
	direction: PartyTravelerDirection;
	partyMemberCount: number;
	recovery: DungeonRecoveryMotion | null;
	viewportRef: RefObject<HTMLDivElement | null>;
	cameraRef: MutableRefObject<CameraState | null>;
	onReady?: (ready: boolean) => void;
	onError?: (message: string) => void;
}

type DungeonPixiRuntimeProps = DungeonPixiSceneProps & { layoutKey: string };

interface GroundedTexture {
	texture: PixiTexture;
	frame: SpriteFrameRect;
	alpha: AlphaBounds | null;
}

interface DungeonPixiAssets {
	tileTextures: PixiTexture[];
	propTextures: Map<DungeonPropTextureName, PixiTexture>;
	partyFrames: Map<string, GroundedTexture>;
	monsterFrames: Map<string, GroundedTexture>;
}

function destroyDungeonAssets(assets: DungeonPixiAssets): void {
	for (const texture of assets.tileTextures) texture.destroy();
	for (const texture of assets.propTextures.values()) texture.destroy();
	for (const grounded of assets.partyFrames.values()) grounded.texture.destroy();
	for (const grounded of assets.monsterFrames.values()) grounded.texture.destroy();
}

interface PulseGraphic {
	graphic: Graphics;
	phase: number;
	baseAlpha: number;
}

interface MoteGraphic {
	graphic: Graphics;
	baseX: number;
	baseY: number;
	phase: number;
	speed: number;
}

interface DungeonPixiRuntime {
	root: Container;
	world: Container;
	markers: Container;
	actors: Container;
	terrain: Container;
	monsterLayer: Container;
	party: Sprite;
	partyPips: Graphics[];
	partyPipCount: number;
	partyShadow: Graphics;
	partyHighlight: Graphics;
	pulses: PulseGraphic[];
	motes: MoteGraphic[];
	assets: DungeonPixiAssets;
	layout: DungeonGridLayout;
	camera: CameraState | null;
	cameraFloorNo: number | null;
	direction: PartyTravelerDirection;
	partyFrameKey: string;
	partyGroundY: number;
	layoutKey: string;
	refreshLayout: (layout: DungeonGridLayout) => void;
	destroy: () => void;
	update: (props: DungeonPixiRuntimeProps, now: number, elapsedMs: number) => void;
}

const DIRECTION_ROW: Record<PartyTravelerDirection, number> = { south: 0, east: 1, north: 2, west: 3 };
const DIRECTIONS: readonly PartyTravelerDirection[] = ['south', 'east', 'north', 'west'];

function frameKey(direction: PartyTravelerDirection, frame: 0 | 1): string {
	return `${direction}:${String(frame)}`;
}

/**
 * The party's current node is intentionally excluded. Optimistic movement
 * changes that value every hop, but it does not require rebuilding terrain or
 * reloading textures. Discovery and floor geometry changes do.
 */
function dungeonLayoutRenderKey(layout: DungeonGridLayout): string {
	const floorKey = layout.floors
		.map((floor) => [floor.floorNo, floor.x, floor.y, floor.width, floor.height, floor.cols, floor.rows].join(','))
		.join(';');
	const cellKey = layout.cells
		.map((cell) =>
			[
				cell.floorNo,
				cell.col,
				cell.row,
				cell.walkable ? 1 : 0,
				cell.discovered ? 1 : 0,
				cell.terrain,
				cell.decorSeed,
				cell.edgeMask,
				cell.floorBelow ? 1 : 0,
				cell.rockEdges.n ? 1 : 0,
				cell.rockEdges.e ? 1 : 0,
				cell.rockEdges.s ? 1 : 0,
				cell.rockEdges.w ? 1 : 0,
			].join(','),
		)
		.join(';');
	const tileKey = layout.tiles
		.map((tile) =>
			[
				tile.node.id,
				tile.floorNo,
				tile.col,
				tile.row,
				tile.kind,
				tile.discovered ? 1 : 0,
				tile.node.encounterCleared ? 1 : 0,
				tile.archetypeKey ?? null,
			].join(','),
		)
		.join(';');
	return JSON.stringify([
		layout.tileSize,
		layout.gap,
		layout.padding,
		layout.activeFloorNo,
		layout.width,
		layout.height,
		floorKey,
		cellKey,
		tileKey,
	]);
}

function textureFrame(texture: PixiTexture, col: number, row: number, columns: number, rows: number): SpriteFrameRect {
	return {
		x: Math.floor((texture.width / columns) * col),
		y: Math.floor((texture.height / rows) * row),
		width: Math.floor(texture.width / columns),
		height: Math.floor(texture.height / rows),
	};
}

function setNearest(texture: PixiTexture): void {
	texture.source.scaleMode = 'nearest';
}

async function loadDungeonAssets(): Promise<DungeonPixiAssets> {
	const [tileset, party, props, monsters] = await Promise.all([
		Assets.load<PixiTexture>(dungeonTilesetArt.src),
		Assets.load<PixiTexture>(dungeonMapPartyArt.src),
		Assets.load<PixiTexture>(dungeonPropsArt.src),
		Assets.load<PixiTexture>(dungeonMapMonsterArtForArchetype('unknown').src),
	]);
	setNearest(tileset);
	setNearest(party);
	setNearest(props);
	setNearest(monsters);

	const assets: DungeonPixiAssets = {
		tileTextures: [],
		propTextures: new Map(),
		partyFrames: new Map(),
		monsterFrames: new Map(),
	};

	try {
		for (let index = 0; index < TEXTURE_COUNT; index += 1) {
			const frame = new Rectangle(index * dungeonTilesetArt.tileSize, 0, dungeonTilesetArt.tileSize, dungeonTilesetArt.tileSize);
			assets.tileTextures.push(
				new Texture({
					source: tileset.source,
					frame,
					orig: new Rectangle(0, 0, dungeonTilesetArt.tileSize, dungeonTilesetArt.tileSize),
					label: `dungeon-tile-${String(index)}`,
				}),
			);
		}

		for (const [index, name] of dungeonPropsArt.names.entries()) {
			const frame = new Rectangle(index * dungeonPropsArt.tileSize, 0, dungeonPropsArt.tileSize, dungeonPropsArt.tileSize);
			assets.propTextures.set(
				name,
				new Texture({
					source: props.source,
					frame,
					orig: new Rectangle(0, 0, dungeonPropsArt.tileSize, dungeonPropsArt.tileSize),
					label: `dungeon-prop-${name}`,
				}),
			);
		}

		for (const direction of DIRECTIONS) {
			for (const frameIndex of [0, 1] as const) {
				const frame = textureFrame(party, frameIndex, DIRECTION_ROW[direction], dungeonMapPartyArt.columns, dungeonMapPartyArt.rows);
				const alpha = readFrameAlphaBounds(party, frame);
				const texture = createGroundedFrameTexture(party, frame, `party-${frameKey(direction, frameIndex)}`, alpha);
				assets.partyFrames.set(frameKey(direction, frameIndex), { texture, frame, alpha });
			}
		}

		for (const key of enemyArchetypes) {
			const position = dungeonMapMonsterArtForArchetype(key).position;
			const frame = textureFrame(monsters, position[0], position[1], 3, 3);
			const alpha = readFrameAlphaBounds(monsters, frame);
			assets.monsterFrames.set(key, {
				texture: createGroundedFrameTexture(monsters, frame, `monster-${key}`, alpha),
				frame,
				alpha,
			});
		}

		return assets;
	} catch (error) {
		destroyDungeonAssets(assets);
		throw error;
	}
}

function drawBackdrop(layout: DungeonGridLayout): Container {
	const container = new Container();
	const background = new Graphics();
	background.rect(0, 0, layout.width, layout.height).fill({ color: 0x03070d });
	background.rect(0, 0, layout.width, layout.height * 0.58).fill({ color: 0x0d1a23, alpha: 0.7 });
	const floor = layout.floors.at(0);
	if (floor) {
		background.rect(floor.x - 10, floor.y - 10, floor.width + 20, floor.height + 20).fill({ color: 0x04080d, alpha: 0.86 });
		background.rect(floor.x - 9, floor.y - 9, floor.width + 18, floor.height + 18).stroke({ width: 2, color: 0x84a9a7, alpha: 0.17 });
	}
	container.addChild(background);
	return container;
}

function drawPlane(layout: DungeonGridLayout, assets: DungeonPixiAssets): Container {
	const container = new Container();
	for (const cell of layout.cells) {
		const origin = cellOrigin(layout, cell);
		const textureIndex = terrainTextureIndex(cell);
		const texture = assets.tileTextures[textureIndex];
		const tile = new Sprite(texture);
		tile.position.set(origin.x, origin.y);
		tile.scale.set(layout.tileSize / dungeonTilesetArt.tileSize);
		container.addChild(tile);
	}
	return container;
}

function clearChildren(container: Container): void {
	for (const child of container.removeChildren()) child.destroy({ children: true });
}

function terrainTextureIndex(cell: DungeonGridCell): number {
	if (cell.terrain === 'fog') return TEXTURE_INDEX.fog;
	if (cell.terrain === 'floor') return TEXTURE_INDEX[floorTextureName(cell.edgeMask, cell.decorSeed)];
	if (cell.floorBelow) return TEXTURE_INDEX[cell.decorSeed % 2 === 0 ? 'wall-face' : 'wall-face-alt'];
	if (cell.edgeMask === 255) return TEXTURE_INDEX['wall-deep'];
	return TEXTURE_INDEX[cell.decorSeed % 2 === 0 ? 'wall-top' : 'wall-top-alt'];
}

function drawGlow(container: Container, center: { x: number; y: number }, radius: number, tint: number, alpha: number): Graphics {
	const graphic = new Graphics();
	graphic.circle(center.x, center.y, radius).fill({ color: tint, alpha });
	container.addChild(graphic);
	return graphic;
}

const PROP_MARKER_STYLE: Record<DungeonPropTextureName, { tint: number; baseAlpha: number; yOffset: number; scale: number }> = {
	'treasure-chest': { tint: 0xd5a44d, baseAlpha: 0.055, yOffset: 0.12, scale: 1.08 },
	'stairs-down': { tint: 0xd5a44d, baseAlpha: 0.085, yOffset: 0.1, scale: 1.08 },
	'stairs-up': { tint: 0x65c6bd, baseAlpha: 0.085, yOffset: 0.1, scale: 1.08 },
	'objective-beacon': { tint: 0xf1be4e, baseAlpha: 0.12, yOffset: 0.06, scale: 1.2 },
	'entry-gate': { tint: 0x65c6bd, baseAlpha: 0.07, yOffset: 0.1, scale: 1.08 },
	'rest-camp': { tint: 0xf1be4e, baseAlpha: 0.075, yOffset: 0.08, scale: 1.12 },
	'combat-rune': { tint: 0xd0804a, baseAlpha: 0.06, yOffset: 0.1, scale: 1.08 },
	'boss-rune': { tint: 0xb36d80, baseAlpha: 0.09, yOffset: 0.1, scale: 1.12 },
};

function drawPropMarker(
	container: Container,
	layout: DungeonGridLayout,
	tile: DungeonGridTile,
	propTextures: Map<DungeonPropTextureName, PixiTexture>,
	propName: DungeonPropTextureName,
	pulses: PulseGraphic[],
): void {
	const texture = propTextures.get(propName);
	if (!texture) return;
	const center = tileCenter(layout, tile);
	const size = layout.tileSize;
	const style = PROP_MARKER_STYLE[propName];
	const glow = drawGlow(container, { x: center.x, y: center.y + size * style.yOffset }, size * 0.7, style.tint, style.baseAlpha);
	pulses.push({ graphic: glow, phase: tile.col * 0.7 + tile.row, baseAlpha: style.baseAlpha });

	const sprite = new Sprite(texture);
	sprite.anchor.set(0.5, 0.5);
	sprite.position.set(center.x, center.y);
	sprite.scale.set((size / dungeonPropsArt.tileSize) * style.scale);
	container.addChild(sprite);
}

function drawMarker(
	container: Container,
	layout: DungeonGridLayout,
	tile: DungeonGridTile,
	propTextures: Map<DungeonPropTextureName, PixiTexture>,
	pulses: PulseGraphic[],
): void {
	const marker = dungeonMarkerPresentationForTile(tile);
	if (!marker.visible || !marker.propName) return;
	drawPropMarker(container, layout, tile, propTextures, marker.propName, pulses);
}

function drawMarkers(markers: Container, layout: DungeonGridLayout, assets: DungeonPixiAssets, pulses: PulseGraphic[]): void {
	clearChildren(markers);
	pulses.length = 0;
	for (const tile of layout.tiles) {
		if (tile.discovered) drawMarker(markers, layout, tile, assets.propTextures, pulses);
	}
}

function createActorShadow(center: { x: number; y: number }, width: number, height: number): Graphics {
	const shadow = new Graphics();
	shadow.ellipse(center.x, center.y, width, height).fill({ color: 0x000000, alpha: 0.42 });
	return shadow;
}

function setGroundedSpriteTexture(sprite: Sprite, grounded: GroundedTexture): void {
	sprite.texture = grounded.texture;
	const anchor = groundedAnchor(grounded.alpha, grounded.frame);
	sprite.anchor.set(anchor.x, anchor.y);
}

function setPartySpriteScale(sprite: Sprite, grounded: GroundedTexture, tileSize: number): void {
	sprite.scale.set(dungeonPartyScale(grounded.alpha, grounded.frame, tileSize));
}

function createPartyPips(actors: Container, partyMemberCount: number): Graphics[] {
	const pips: Graphics[] = [];
	for (let index = 0; index < Math.max(0, partyMemberCount - 1); index += 1) {
		const pip = new Graphics();
		pip.circle(0, 0, 3.2).fill({ color: 0x65c6bd, alpha: 0.92 }).stroke({ width: 1, color: 0x07131a, alpha: 0.9 });
		pip.circle(0, 0, 1.35).fill({ color: 0xf1be4e, alpha: 0.9 });
		pip.zIndex = 0;
		actors.addChild(pip);
		pips.push(pip);
	}
	return pips;
}

function positionPartyPips(
	pips: Graphics[],
	center: { x: number; y: number },
	groundY: number,
	tileSize: number,
	direction: PartyTravelerDirection,
	now: number,
): void {
	if (pips.length === 0) return;
	const facing = {
		north: { x: 0, y: -1 },
		south: { x: 0, y: 1 },
		east: { x: 1, y: 0 },
		west: { x: -1, y: 0 },
	}[direction];
	const backward = { x: -facing.x, y: -facing.y };
	const side = { x: -backward.y, y: backward.x };
	const columns = Math.min(3, pips.length);
	for (const [index, pip] of pips.entries()) {
		const row = Math.floor(index / columns);
		const column = index % columns;
		const lateral = (column - (columns - 1) / 2) * tileSize * 0.18;
		const backwardDistance = tileSize * (0.34 + row * 0.18);
		pip.position.set(
			center.x + backward.x * backwardDistance + side.x * lateral,
			groundY + backward.y * backwardDistance + side.y * lateral,
		);
		pip.alpha = 0.78 + Math.sin(now / 440 + index * 0.7) * 0.08;
		pip.zIndex = groundY - backwardDistance - 0.1;
	}
}

function drawMonsters(monsterLayer: Container, layout: DungeonGridLayout, assets: DungeonPixiAssets): void {
	clearChildren(monsterLayer);
	for (const tile of layout.tiles) {
		if (!tile.archetypeKey || !tile.discovered || tile.node.encounterCleared) continue;
		const grounded = assets.monsterFrames.get(tile.archetypeKey);
		if (!grounded) continue;
		const sprite = new Sprite(grounded.texture);
		setGroundedSpriteTexture(sprite, grounded);
		const center = tileCenter(layout, tile);
		const groundY = center.y + layout.tileSize * 0.25;
		const role = tile.kind === 'boss' ? 'boss' : 'regular';
		const scale = dungeonMonsterScale(grounded.alpha, grounded.frame, layout.tileSize, role);
		const visibleSize = dungeonMonsterVisibleSize(grounded.alpha, scale, grounded.frame);
		sprite.scale.set(scale);
		sprite.position.set(center.x, groundY);
		sprite.zIndex = groundY;
		const shadow = createActorShadow(
			{ x: center.x, y: groundY },
			dungeonMonsterShadowWidth(visibleSize.width, layout.tileSize),
			layout.tileSize * 0.1,
		);
		shadow.zIndex = groundY - 0.2;
		monsterLayer.addChild(shadow, sprite);
	}
}

function createMotes(layout: DungeonGridLayout, world: Container): MoteGraphic[] {
	const motes: MoteGraphic[] = [];
	const moteFloor = layout.floors.at(0) ?? { x: 0, y: 0, width: layout.width, height: layout.height };
	const moteWidth = Math.max(1, moteFloor.width - 32);
	const moteHeight = Math.max(1, moteFloor.height - 32);
	for (let index = 0; index < 12; index += 1) {
		const graphic = new Graphics();
		graphic.circle(0, 0, 1.5).fill({ color: 0x9cd3be, alpha: 0.24 + ((index * 7) % 5) * 0.05 });
		const mote = {
			graphic,
			baseX: moteFloor.x + 16 + ((index * 191) % moteWidth),
			baseY: moteFloor.y + 16 + ((index * 97 + index * index * 7) % moteHeight),
			phase: index * 0.8,
			speed: 0.5 + (index % 3) * 0.25,
		};
		graphic.position.set(mote.baseX, mote.baseY);
		world.addChild(graphic);
		motes.push(mote);
	}
	return motes;
}

function createScene(
	layout: DungeonGridLayout,
	assets: DungeonPixiAssets,
	stage: Container,
	partyMemberCount: number,
	initialCamera: CameraState | null = null,
): DungeonPixiRuntime {
	const root = new Container();
	root.sortableChildren = true;
	const world = new Container();
	world.sortableChildren = true;
	const terrain = new Container();
	const markers = new Container();
	const actors = new Container();
	actors.sortableChildren = true;
	const monsterLayer = new Container();
	monsterLayer.sortableChildren = true;
	terrain.addChild(drawBackdrop(layout), drawPlane(layout, assets));
	actors.addChild(monsterLayer);
	world.addChild(terrain, markers, actors);
	root.addChild(world);
	stage.addChild(root);

	const pulses: PulseGraphic[] = [];
	drawMarkers(markers, layout, assets, pulses);

	const partyFrame = assets.partyFrames.get(frameKey('south', 0));
	const party = new Sprite(partyFrame?.texture ?? Texture.EMPTY);
	if (partyFrame) {
		setGroundedSpriteTexture(party, partyFrame);
		setPartySpriteScale(party, partyFrame, layout.tileSize);
	}
	party.zIndex = 0;
	actors.addChild(party);
	const partyPips = createPartyPips(actors, partyMemberCount);

	const partyShadow = createActorShadow({ x: 0, y: 0 }, layout.tileSize * 0.3, layout.tileSize * 0.12);
	partyShadow.zIndex = -0.2;
	actors.addChild(partyShadow);
	const partyHighlight = new Graphics();
	partyHighlight.zIndex = -0.1;
	actors.addChild(partyHighlight);

	drawMonsters(monsterLayer, layout, assets);
	const motes = createMotes(layout, world);

	let destroyed = false;
	const scene: DungeonPixiRuntime = {
		root,
		world,
		markers,
		actors,
		terrain,
		monsterLayer,
		party,
		partyPips,
		partyPipCount: partyMemberCount,
		partyShadow,
		partyHighlight,
		pulses,
		motes,
		assets,
		layout,
		camera: initialCamera,
		cameraFloorNo: initialCamera ? layout.activeFloorNo : null,
		direction: 'south',
		partyFrameKey: frameKey('south', 0),
		partyGroundY: 0,
		layoutKey: dungeonLayoutRenderKey(layout),
		destroy: () => {
			if (destroyed) return;
			destroyed = true;
			root.destroy({ children: true });
			destroyDungeonAssets(assets);
		},
		refreshLayout(nextLayout) {
			scene.layout = nextLayout;
			scene.layoutKey = dungeonLayoutRenderKey(nextLayout);
			clearChildren(terrain);
			terrain.addChild(drawBackdrop(nextLayout), drawPlane(nextLayout, assets));
			drawMarkers(markers, nextLayout, assets, pulses);
			drawMonsters(monsterLayer, nextLayout, assets);
			for (const mote of scene.motes) mote.graphic.destroy();
			scene.motes = createMotes(nextLayout, world);
		},
		update(props, now, elapsedMs) {
			const { layout: currentLayout, movement, recovery } = props;
			if (scene.partyPipCount !== props.partyMemberCount) {
				for (const pip of scene.partyPips) {
					actors.removeChild(pip);
					pip.destroy();
				}
				scene.partyPips = createPartyPips(actors, props.partyMemberCount);
				scene.partyPipCount = props.partyMemberCount;
			}
			if (scene.layoutKey !== props.layoutKey) scene.refreshLayout(currentLayout);
			const viewport = props.viewportRef.current;
			if (!viewport) return;
			const width = Math.max(1, viewport.clientWidth);
			const height = Math.max(1, viewport.clientHeight);
			const zoom = dungeonZoom(currentLayout, { width, height });
			const sample = sampleDungeonMotion(currentLayout, movement, recovery, now);
			const floor = currentLayout.floors.at(0);
			const floorFits = Boolean(floor && floor.width * zoom <= width - 48 && floor.height * zoom <= height - 48);
			const sameFloor = scene.cameraFloorNo === currentLayout.activeFloorNo;
			scene.camera = followDungeonCamera(
				sample.point,
				{ width, height },
				{ width: currentLayout.width, height: currentLayout.height },
				zoom,
				{
					deadZone: { width: currentLayout.tileSize * 4, height: currentLayout.tileSize * 4 },
					lockToCenter: floorFits,
					catchupMs: 180,
					previous: sameFloor ? (scene.camera ?? props.cameraRef.current) : null,
					elapsedMs,
				},
			);
			scene.cameraFloorNo = currentLayout.activeFloorNo;
			const renderCamera = snapCamera(scene.camera);
			props.cameraRef.current = renderCamera;
			world.position.set(
				renderCamera.originX - renderCamera.offsetX * renderCamera.zoom,
				renderCamera.originY - renderCamera.offsetY * renderCamera.zoom,
			);
			world.scale.set(renderCamera.zoom);

			const motionDirection = movement.snapshot.motion?.direction ?? props.direction;
			scene.direction = motionDirection;
			const frameIndex = recovery
				? walkFrameForElapsed(now, recovery.startedAt)
				: sample.moving
					? walkFrameForMotion(now, sample.segment)
					: 0;
			const nextPartyFrameKey = frameKey(scene.direction, frameIndex);
			if (nextPartyFrameKey !== scene.partyFrameKey) {
				const grounded = assets.partyFrames.get(nextPartyFrameKey);
				if (grounded) {
					setGroundedSpriteTexture(scene.party, grounded);
					setPartySpriteScale(scene.party, grounded, currentLayout.tileSize);
					scene.partyFrameKey = nextPartyFrameKey;
				}
			}
			const groundY = sample.point.y + currentLayout.tileSize * 0.25;
			const arrival = sample.moving ? Math.sin(Math.PI * sample.progress) : 0;
			const bob = arrival * DUNGEON_ARRIVAL_BOB_PX;
			scene.party.position.set(sample.point.x, groundY - bob);
			scene.party.zIndex = groundY;
			scene.partyGroundY = groundY;
			scene.partyShadow.position.set(sample.point.x, groundY);
			scene.partyShadow.zIndex = groundY - 0.2;
			scene.partyShadow.scale.set(1 - arrival * 0.06, 1 - arrival * 0.06);
			scene.partyHighlight.zIndex = groundY - 0.1;
			scene.partyHighlight.clear();
			scene.partyHighlight
				.ellipse(sample.point.x, groundY - currentLayout.tileSize * 0.06, currentLayout.tileSize * 0.72, currentLayout.tileSize * 0.34)
				.fill({ color: 0xf1be4e, alpha: 0.025 + arrival * 0.015 });
			scene.partyHighlight
				.ellipse(sample.point.x, groundY - currentLayout.tileSize * 0.08, currentLayout.tileSize * 0.4, currentLayout.tileSize * 0.16)
				.fill({
					color: 0xf1be4e,
					alpha: 0.08 + arrival * 0.04 + Math.sin(now / 480) * 0.01,
				});
			positionPartyPips(scene.partyPips, sample.point, groundY, currentLayout.tileSize, scene.direction, now);

			for (const pulse of pulses) pulse.graphic.alpha = pulse.baseAlpha * (0.86 + Math.sin(now / 550 + pulse.phase) * 0.12);
			for (const mote of scene.motes) {
				mote.graphic.position.set(
					mote.baseX + Math.sin(now / 900 + mote.phase) * 4,
					mote.baseY + (((now / 90) * mote.speed + mote.phase * 11) % 18),
				);
			}
			actors.sortChildren();
		},
	};

	return scene;
}

function DungeonPixiRuntime({
	layout,
	layoutKey,
	movement,
	direction,
	partyMemberCount,
	recovery,
	viewportRef,
	cameraRef,
	onReady,
	onError,
}: DungeonPixiRuntimeProps) {
	const { app } = useApplication();
	const sceneRef = useRef<DungeonPixiRuntime | null>(null);
	const layoutRef = useRef(layout);
	const cameraFloorRef = useRef<number | null>(null);
	const propsRef = useRef({
		layout,
		layoutKey,
		movement,
		direction,
		partyMemberCount,
		recovery,
		viewportRef,
		cameraRef,
		onReady,
		onError,
	});

	useLayoutEffect(() => {
		layoutRef.current = layout;
		propsRef.current = {
			layout,
			layoutKey,
			movement,
			direction,
			partyMemberCount,
			recovery,
			viewportRef,
			cameraRef,
			onReady,
			onError,
		};
	}, [cameraRef, direction, layout, layoutKey, movement, onError, onReady, partyMemberCount, recovery, viewportRef]);

	useEffect(() => {
		let active = true;
		let created: DungeonPixiRuntime | null = null;
		propsRef.current.onReady?.(false);
		void loadDungeonAssets()
			.then((assets) => {
				if (!active) {
					destroyDungeonAssets(assets);
					return;
				}
				try {
					const currentLayout = layoutRef.current;
					const initialCamera = cameraFloorRef.current === currentLayout.activeFloorNo ? cameraRef.current : null;
					created = createScene(currentLayout, assets, app.stage, propsRef.current.partyMemberCount, initialCamera);
					sceneRef.current = created;
					cameraFloorRef.current = currentLayout.activeFloorNo;
					propsRef.current.onReady?.(true);
				} catch (error) {
					created?.destroy();
					if (!created) destroyDungeonAssets(assets);
					throw error;
				}
			})
			.catch((error: unknown) => {
				if (!active) return;
				propsRef.current.onError?.(error instanceof Error ? error.message : 'Unable to load dungeon graphics.');
			});
		return () => {
			active = false;
			if (sceneRef.current === created) sceneRef.current = null;
			created?.destroy();
		};
	}, [app]);

	const tick = useCallback((ticker: Ticker) => {
		const scene = sceneRef.current;
		if (!scene) return;
		scene.update(propsRef.current, performance.now(), ticker.elapsedMS);
	}, []);
	useTick(tick);
	return null;
}

export function DungeonPixiScene(props: DungeonPixiSceneProps) {
	const applicationRef = useRef<ApplicationRef>(null);
	const resolution = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1);

	useLayoutEffect(() => {
		const canvas = applicationRef.current?.getCanvas();
		if (!canvas) return;
		canvas.dataset.testid = 'dungeon-grid-canvas';
		canvas.dataset.renderer = 'pixi';
	}, []);

	return (
		<Application
			ref={applicationRef}
			className="dungeon-grid-canvas"
			resizeTo={props.viewportRef}
			preference="webgl"
			preferWebGLVersion={2}
			antialias={false}
			autoDensity
			resolution={resolution}
			backgroundAlpha={0}
		>
			<DungeonPixiRuntime {...props} layoutKey={dungeonLayoutRenderKey(props.layout)} />
		</Application>
	);
}
