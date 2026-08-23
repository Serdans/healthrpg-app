import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { Application, useApplication, useTick } from '@pixi/react';
import type { ApplicationRef } from '@pixi/react';
import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Ticker, Texture as PixiTexture } from 'pixi.js';

import { cellOrigin, tileCenter } from '#/lib/dungeon-grid';
import type { DungeonGridCell, DungeonGridLayout, DungeonGridTile } from '#/lib/dungeon-grid';
import { dungeonMarkerPresentation } from '#/lib/dungeon-markers';
import { dungeonZoom, followDungeonCamera, snapCamera } from '#/lib/dungeon-camera';
import type { CameraState } from '#/lib/dungeon-camera';
import { DUNGEON_ARRIVAL_BOB_PX, sampleDungeonMotion, walkFrameForElapsed, walkFrameForMotion } from '#/lib/dungeon-motion';
import type { DungeonRecoveryMotion } from '#/lib/dungeon-motion';
import { battleEnemyArtForArchetype, dungeonPropsArt, dungeonTilesetArt, partyTravelerArt } from '#/lib/game-art';
import type { PartyTravelerDirection } from '#/lib/game-art';
import type { DungeonPropTextureName } from '#/lib/dungeon-props';
import { floorTextureName, TEXTURE_COUNT, TEXTURE_INDEX } from '#/lib/dungeon-tiles';
import {
	createGroundedFrameTexture,
	dungeonMonsterScale,
	dungeonMonsterShadowWidth,
	dungeonMonsterVisibleSize,
	groundedAnchor,
	readFrameAlphaBounds,
} from '#/lib/dungeon-sprite';
import type { AlphaBounds, SpriteFrameRect } from '#/lib/dungeon-sprite';
import type { DungeonMovementController } from '#/lib/dungeon-movement';

export interface DungeonPixiSceneProps {
	layout: DungeonGridLayout;
	movement: DungeonMovementController;
	direction: PartyTravelerDirection;
	recovery: DungeonRecoveryMotion | null;
	viewportRef: RefObject<HTMLDivElement | null>;
	cameraRef: MutableRefObject<CameraState | null>;
	onReady?: (ready: boolean) => void;
	onError?: (message: string) => void;
	onVisualStateChange?: () => void;
	onRecoveryComplete?: (toNodeId: string, now: number) => void;
}

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
	party: Sprite;
	partyShadow: Graphics;
	partyHighlight: Graphics;
	monsterSprites: Map<string, Sprite>;
	pulses: PulseGraphic[];
	motes: MoteGraphic[];
	assets: DungeonPixiAssets;
	layout: DungeonGridLayout;
	camera: CameraState | null;
	cameraFloorNo: number | null;
	direction: PartyTravelerDirection;
	partyFrameKey: string;
	partyGroundY: number;
	recoveryCompletedKey: string | null;
	destroy: () => void;
	update: (props: DungeonPixiSceneProps, now: number, elapsedMs: number) => void;
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
function dungeonSceneKey(layout: DungeonGridLayout): string {
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
		.map((tile) => [tile.node.id, tile.floorNo, tile.col, tile.row, tile.kind, tile.discovered ? 1 : 0, tile.archetypeKey ?? ''].join(','))
		.join(';');
	return [
		layout.tileSize,
		layout.gap,
		layout.padding,
		layout.activeFloorNo ?? '',
		layout.width,
		layout.height,
		floorKey,
		cellKey,
		tileKey,
	].join('|');
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

async function loadDungeonAssets(layout: DungeonGridLayout): Promise<DungeonPixiAssets> {
	const archetypeKeys = [...new Set(layout.tiles.map((tile) => tile.archetypeKey).filter((key): key is string => Boolean(key)))];
	const [tileset, party, props, ...monsterTextures] = await Promise.all([
		Assets.load<PixiTexture>(dungeonTilesetArt.src),
		Assets.load<PixiTexture>(partyTravelerArt.src),
		Assets.load<PixiTexture>(dungeonPropsArt.src),
		...archetypeKeys.map((key) => Assets.load<PixiTexture>(battleEnemyArtForArchetype(key).src)),
	]);
	setNearest(tileset);
	setNearest(party);
	setNearest(props);

	const tileTextures = Array.from({ length: TEXTURE_COUNT }, (_, index) => {
		const frame = new Rectangle(index * dungeonTilesetArt.tileSize, 0, dungeonTilesetArt.tileSize, dungeonTilesetArt.tileSize);
		return new Texture({
			source: tileset.source,
			frame,
			orig: new Rectangle(0, 0, dungeonTilesetArt.tileSize, dungeonTilesetArt.tileSize),
			label: `dungeon-tile-${String(index)}`,
		});
	});

	const propTextures = new Map<DungeonPropTextureName, PixiTexture>();
	for (const [index, name] of dungeonPropsArt.names.entries()) {
		const frame = new Rectangle(index * dungeonPropsArt.tileSize, 0, dungeonPropsArt.tileSize, dungeonPropsArt.tileSize);
		propTextures.set(
			name,
			new Texture({
				source: props.source,
				frame,
				orig: new Rectangle(0, 0, dungeonPropsArt.tileSize, dungeonPropsArt.tileSize),
				label: `dungeon-prop-${name}`,
			}),
		);
	}

	const partyFrames = new Map<string, GroundedTexture>();
	for (const direction of DIRECTIONS) {
		for (const frameIndex of [0, 1] as const) {
			const frame = textureFrame(party, frameIndex, DIRECTION_ROW[direction], 2, 4);
			const alpha = readFrameAlphaBounds(party, frame);
			const texture = createGroundedFrameTexture(party, frame, `party-${frameKey(direction, frameIndex)}`, alpha);
			partyFrames.set(frameKey(direction, frameIndex), { texture, frame, alpha });
		}
	}

	const monsterFrames = new Map<string, GroundedTexture>();
	for (const [index, key] of archetypeKeys.entries()) {
		const texture = monsterTextures[index];
		setNearest(texture);
		const position = battleEnemyArtForArchetype(key).position;
		const [xp, yp] = position.split(' ').map((value) => Number.parseFloat(value) / 100);
		const frame = textureFrame(texture, Math.round(orZero(xp) * 2), Math.round(orZero(yp) * 2), 3, 3);
		const alpha = readFrameAlphaBounds(texture, frame);
		monsterFrames.set(key, { texture: createGroundedFrameTexture(texture, frame, `monster-${key}`, alpha), frame, alpha });
	}

	return { tileTextures, propTextures, partyFrames, monsterFrames };
}

function orZero(value: number): number {
	return Number.isFinite(value) ? value : 0;
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
	'exit-gate': { tint: 0xd5a44d, baseAlpha: 0.06, yOffset: 0.1, scale: 1.08 },
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
	const marker = dungeonMarkerPresentation(tile.kind);
	if (!marker.visible || !marker.propName) return;
	drawPropMarker(container, layout, tile, propTextures, marker.propName, pulses);
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

function createScene(
	layout: DungeonGridLayout,
	assets: DungeonPixiAssets,
	stage: Container,
	initialCamera: CameraState | null = null,
): DungeonPixiRuntime {
	const root = new Container();
	root.sortableChildren = true;
	const world = new Container();
	world.sortableChildren = true;
	const markers = new Container();
	const actors = new Container();
	actors.sortableChildren = true;
	world.addChild(drawBackdrop(layout), drawPlane(layout, assets), markers, actors);
	root.addChild(world);
	stage.addChild(root);

	const pulses: PulseGraphic[] = [];
	for (const tile of layout.tiles) {
		if (tile.discovered) drawMarker(markers, layout, tile, assets.propTextures, pulses);
	}

	const partyFrame = assets.partyFrames.get(frameKey('south', 0));
	const party = new Sprite(partyFrame?.texture ?? Texture.EMPTY);
	if (partyFrame) setGroundedSpriteTexture(party, partyFrame);
	party.width = layout.tileSize * 1.5;
	party.height = layout.tileSize * 1.5;
	party.zIndex = 0;
	actors.addChild(party);

	const partyShadow = createActorShadow({ x: 0, y: 0 }, layout.tileSize * 0.3, layout.tileSize * 0.12);
	partyShadow.zIndex = -0.2;
	actors.addChild(partyShadow);
	const partyHighlight = new Graphics();
	partyHighlight.zIndex = -0.1;
	actors.addChild(partyHighlight);

	const monsterSprites = new Map<string, Sprite>();
	for (const tile of layout.tiles) {
		if (!tile.archetypeKey || !tile.discovered) continue;
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
		actors.addChild(shadow);
		actors.addChild(sprite);
		monsterSprites.set(tile.node.id, sprite);
	}

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

	const scene: DungeonPixiRuntime = {
		root,
		world,
		markers,
		actors,
		party,
		partyShadow,
		partyHighlight,
		monsterSprites,
		pulses,
		motes,
		assets,
		layout,
		camera: initialCamera,
		cameraFloorNo: initialCamera ? layout.activeFloorNo : null,
		direction: 'south',
		partyFrameKey: frameKey('south', 0),
		partyGroundY: 0,
		recoveryCompletedKey: null,
		destroy: () => {
			root.destroy({ children: true });
			for (const texture of assets.tileTextures) texture.destroy();
			for (const texture of assets.propTextures.values()) texture.destroy();
			for (const grounded of assets.partyFrames.values()) grounded.texture.destroy();
			for (const grounded of assets.monsterFrames.values()) grounded.texture.destroy();
		},
		update: () => undefined,
	};

	scene.update = (props, now, elapsedMs) => {
		const { layout: currentLayout, movement, recovery } = props;
		if (movement.advanceVisual(now)) props.onVisualStateChange?.();
		const recoveryKey = recovery ? `${recovery.toNodeId}:${String(recovery.startedAt)}` : null;
		if (!recovery) scene.recoveryCompletedKey = null;
		if (recovery && now - recovery.startedAt >= recovery.durationMs && scene.recoveryCompletedKey !== recoveryKey) {
			scene.recoveryCompletedKey = recoveryKey;
			props.onRecoveryComplete?.(recovery.toNodeId, now);
		}
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
				scene.party.width = currentLayout.tileSize * 1.5;
				scene.party.height = currentLayout.tileSize * 1.5;
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

		for (const pulse of pulses) pulse.graphic.alpha = pulse.baseAlpha * (0.86 + Math.sin(now / 550 + pulse.phase) * 0.12);
		for (const mote of motes) {
			mote.graphic.position.set(
				mote.baseX + Math.sin(now / 900 + mote.phase) * 4,
				mote.baseY + (((now / 90) * mote.speed + mote.phase * 11) % 18),
			);
		}
		actors.sortChildren();
	};

	return scene;
}

function DungeonPixiRuntime({
	layout,
	movement,
	direction,
	recovery,
	viewportRef,
	cameraRef,
	onReady,
	onError,
	onVisualStateChange,
	onRecoveryComplete,
}: DungeonPixiSceneProps) {
	const { app } = useApplication();
	const sceneRef = useRef<DungeonPixiRuntime | null>(null);
	const layoutRef = useRef(layout);
	const cameraFloorRef = useRef<number | null>(null);
	const sceneKey = dungeonSceneKey(layout);
	const propsRef = useRef({
		layout,
		movement,
		direction,
		recovery,
		viewportRef,
		cameraRef,
		onVisualStateChange,
		onRecoveryComplete,
	});

	useLayoutEffect(() => {
		layoutRef.current = layout;
		propsRef.current = {
			layout,
			movement,
			direction,
			recovery,
			viewportRef,
			cameraRef,
			onVisualStateChange,
			onRecoveryComplete,
		};
	}, [cameraRef, direction, layout, movement, onRecoveryComplete, onVisualStateChange, recovery, viewportRef]);

	useEffect(() => {
		let active = true;
		let created: DungeonPixiRuntime | null = null;
		onReady?.(false);
		void loadDungeonAssets(layoutRef.current)
			.then((assets) => {
				if (!active) return;
				const currentLayout = layoutRef.current;
				const initialCamera = cameraFloorRef.current === currentLayout.activeFloorNo ? cameraRef.current : null;
				created = createScene(currentLayout, assets, app.stage, initialCamera);
				sceneRef.current = created;
				cameraFloorRef.current = currentLayout.activeFloorNo;
				onReady?.(true);
			})
			.catch((error: unknown) => {
				if (!active) return;
				onError?.(error instanceof Error ? error.message : 'Unable to load dungeon graphics.');
			});
		return () => {
			active = false;
			if (sceneRef.current === created) sceneRef.current = null;
			created?.destroy();
		};
	}, [app, onError, onReady, sceneKey]);

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

	const markCanvas = useCallback((app: { canvas: HTMLCanvasElement }) => {
		app.canvas.dataset.testid = 'dungeon-grid-canvas';
		app.canvas.dataset.renderer = 'pixi';
	}, []);

	useLayoutEffect(() => {
		const canvas = applicationRef.current?.getCanvas();
		if (canvas) {
			canvas.dataset.testid = 'dungeon-grid-canvas';
			canvas.dataset.renderer = 'pixi';
		}
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
			onInit={markCanvas}
		>
			<DungeonPixiRuntime {...props} />
		</Application>
	);
}
