import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Application, useApplication } from '@pixi/react';
import type { ApplicationRef } from '@pixi/react';
import { Assets, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import type { Texture as PixiTexture } from 'pixi.js';

import type { Encounter } from '#/lib/api';
import type { BattleArtSource } from '#/lib/battle-art';
import { battleEnemyArtForArchetype, battlePartyArtForClass, battleTerrainArt } from '#/lib/game-art';
import type { BattleTerrain } from '#/lib/battle-terrain';
import type { BattleCameraState, BattleScreenPlacement, BattleViewportSize } from '#/lib/battle-camera';
import { battleActorStageSize } from '#/lib/battle-camera';

type EncounterMember = Encounter['members'][number];
type BattleTargetMode = 'enemy' | 'ally' | 'none';

export interface BattlePixiSceneProps {
	battleTerrain: BattleTerrain;
	encounter: Encounter;
	targetEnemyId: string | null;
	selectedTargetUserId: string | null;
	targetMode: BattleTargetMode | null;
	viewportRef: RefObject<HTMLDivElement | null>;
	viewportSize: BattleViewportSize;
	camera: BattleCameraState;
	enemyPlacements: BattleScreenPlacement[];
	partyPlacements: BattleScreenPlacement[];
	onError: (message: string) => void;
}

interface BattlePixiAssets {
	terrain: PixiTexture;
	partyAtlas: PixiTexture;
	enemyAtlas: PixiTexture;
}

interface BattlePixiActor {
	side: 'enemy' | 'party';
	art: BattleArtSource;
	frameKey: string;
	sprite: Sprite;
	shadow: Graphics;
	selection: Graphics;
	texture: PixiTexture;
}

interface BattlePixiRuntimeComponentProps {
	props: BattlePixiSceneProps;
	battleTerrain: BattleTerrain;
	onReady: (ready: boolean) => void;
}

interface RenderableBattleApplication {
	render: () => void;
	renderer?: unknown;
}

interface BattlePixiRuntime {
	root: Container;
	world: Container;
	actors: Container;
	actorSprites: Map<string, BattlePixiActor>;
	assets: BattlePixiAssets;
	destroy: () => void;
	update: (props: BattlePixiSceneProps) => void;
}

function renderBattleApp(app: RenderableBattleApplication): boolean {
	if (!app.renderer) return false;
	app.render();
	return true;
}

function setNearest(texture: PixiTexture): void {
	texture.source.scaleMode = 'nearest';
}

function frameKey(art: BattleArtSource): string {
	const { atlasFrame } = art;
	return [atlasFrame.columns, atlasFrame.rows, atlasFrame.column, atlasFrame.row].join(':');
}

function frameTexture(atlas: PixiTexture, art: BattleArtSource): PixiTexture {
	const { columns, rows, column, row } = art.atlasFrame;
	const width = atlas.width / columns;
	const height = atlas.height / rows;
	const frame = new Rectangle(Math.floor(width * column), Math.floor(height * row), Math.floor(width), Math.floor(height));
	return new Texture({
		source: atlas.source,
		frame,
		orig: new Rectangle(0, 0, frame.width, frame.height),
		label: `battle-${String(column)}-${String(row)}`,
	});
}

async function loadBattleAssets(terrain: BattleTerrain): Promise<BattlePixiAssets> {
	const [terrainTexture, partyAtlas, enemyAtlas] = await Promise.all([
		Assets.load<PixiTexture>(battleTerrainArt[terrain]),
		Assets.load<PixiTexture>(battlePartyArtForClass('warrior').src),
		Assets.load<PixiTexture>(battleEnemyArtForArchetype('unknown').src),
	]);
	setNearest(partyAtlas);
	setNearest(enemyAtlas);
	terrainTexture.source.scaleMode = 'linear';
	return { terrain: terrainTexture, partyAtlas, enemyAtlas };
}

function drawTerrainEffects(container: Container, terrain: BattleTerrain, worldWidth: number, worldHeight: number): void {
	const floorGlow = new Graphics();
	floorGlow.ellipse(worldWidth * 0.5, worldHeight * 0.76, worldWidth * 0.38, worldHeight * 0.18).fill({
		color: terrain === 'ruins' ? 0x6cc1b2 : 0xe2ab45,
		alpha: 0.07,
	});
	floorGlow.zIndex = 2;

	const lightWash = new Graphics();
	lightWash.rect(0, 0, worldWidth, worldHeight).fill({ color: 0x10142c, alpha: 0.07 });
	lightWash.zIndex = 3;

	container.addChild(floorGlow, lightWash);
}

function createBattlePixiActor(
	container: Container,
	assets: BattlePixiAssets,
	side: 'enemy' | 'party',
	art: BattleArtSource,
): BattlePixiActor {
	const texture = frameTexture(side === 'enemy' ? assets.enemyAtlas : assets.partyAtlas, art);
	const sprite = new Sprite(texture);
	sprite.anchor.set(art.grounding.sourceAnchor.x, art.grounding.sourceAnchor.y);
	sprite.roundPixels = true;

	const shadow = new Graphics();
	const selection = new Graphics();
	container.addChild(shadow, selection, sprite);

	return { side, art, frameKey: frameKey(art), sprite, shadow, selection, texture };
}

function disposeActor(container: Container, actor: BattlePixiActor): void {
	container.removeChild(actor.shadow, actor.selection, actor.sprite);
	actor.shadow.destroy();
	actor.selection.destroy();
	actor.sprite.destroy();
	actor.texture.destroy();
}

function actorPlacement(props: BattlePixiSceneProps, side: 'enemy' | 'party', index: number): BattleScreenPlacement | undefined {
	return side === 'enemy' ? props.enemyPlacements[index] : props.partyPlacements[index];
}

function actorId(side: 'enemy' | 'party', id: string): string {
	return `${side}:${id}`;
}

function actorArt(side: 'enemy' | 'party', entity: Encounter['enemies'][number] | EncounterMember): BattleArtSource {
	if (side === 'enemy' && 'archetypeKey' in entity) return battleEnemyArtForArchetype(entity.archetypeKey);
	if (side === 'party' && 'classKey' in entity) return battlePartyArtForClass(entity.classKey);
	throw new Error(`Cannot resolve art for ${side} actor.`);
}

function entityId(side: 'enemy' | 'party', entity: Encounter['enemies'][number] | EncounterMember): string {
	if (side === 'enemy' && 'id' in entity) return entity.id;
	if (side === 'party' && 'userId' in entity) return entity.userId;
	throw new Error(`Cannot resolve identity for ${side} actor.`);
}

function syncActors(scene: BattlePixiRuntime, props: BattlePixiSceneProps): void {
	const next = new Map<string, { side: 'enemy' | 'party'; art: BattleArtSource }>();
	for (const enemy of props.encounter.enemies) {
		const art = actorArt('enemy', enemy);
		next.set(actorId('enemy', enemy.id), { side: 'enemy', art });
	}
	for (const member of props.encounter.members) {
		const art = actorArt('party', member);
		next.set(actorId('party', member.userId), { side: 'party', art });
	}

	for (const [id, actor] of scene.actorSprites) {
		if (next.has(id)) continue;
		disposeActor(scene.actors, actor);
		scene.actorSprites.delete(id);
	}

	for (const [id, nextActor] of next) {
		const current = scene.actorSprites.get(id);
		if (current && current.frameKey === frameKey(nextActor.art)) {
			current.art = nextActor.art;
			continue;
		}
		if (current) disposeActor(scene.actors, current);
		const created = createBattlePixiActor(scene.actors, scene.assets, nextActor.side, nextActor.art);
		scene.actorSprites.set(id, created);
	}
}

function updateActor(
	actor: BattlePixiActor,
	props: BattlePixiSceneProps,
	index: number,
	entity: Encounter['enemies'][number] | EncounterMember,
): void {
	const placement = actorPlacement(props, actor.side, index);
	if (!placement) {
		actor.sprite.visible = false;
		actor.shadow.visible = false;
		actor.selection.visible = false;
		return;
	}

	const count = actor.side === 'enemy' ? props.encounter.enemies.length : props.encounter.members.length;
	const screenStageSize = battleActorStageSize(props.viewportSize, actor.side, count, placement.scale);
	const worldStageSize = screenStageSize / props.camera.scale;
	const worldX = placement.worldX;
	const worldY = placement.worldY - actor.art.grounding.lift * worldStageSize;
	const spriteSize = worldStageSize * actor.art.grounding.scale;
	const defeated = actor.side === 'enemy' && entity.currentHealth <= 0;
	const selected =
		actor.side === 'enemy'
			? props.targetMode === 'enemy' && props.targetEnemyId === entityId('enemy', entity)
			: props.targetMode === 'ally' && props.selectedTargetUserId === entityId('party', entity);

	actor.sprite.visible = true;
	actor.sprite.position.set(worldX, worldY);
	actor.sprite.width = spriteSize;
	actor.sprite.height = spriteSize;
	actor.sprite.alpha = defeated ? 0.38 : 1;
	actor.sprite.zIndex = placement.zIndex + 3;

	actor.shadow.visible = true;
	actor.shadow.clear();
	actor.shadow
		.ellipse(
			worldX,
			placement.worldY + worldStageSize * 0.018,
			worldStageSize * actor.art.grounding.shadowWidth * 0.56,
			worldStageSize * 0.065,
		)
		.fill({ color: 0x07131a, alpha: defeated ? 0.16 : 0.48 });
	actor.shadow.zIndex = placement.zIndex;

	actor.selection.visible = selected;
	actor.selection.clear();
	if (selected) {
		actor.selection
			.ellipse(worldX, placement.worldY, worldStageSize * 0.4, worldStageSize * 0.105)
			.fill({ color: 0xffffff, alpha: 0.11 })
			.stroke({ width: Math.max(1, worldStageSize * 0.018), color: 0xffffff, alpha: 0.72 });
	}
	actor.selection.zIndex = placement.zIndex + 1;
}

function createBattlePixiScene(props: BattlePixiSceneProps, assets: BattlePixiAssets, stage: Container): BattlePixiRuntime {
	const root = new Container();
	root.sortableChildren = true;
	const world = new Container();
	world.sortableChildren = true;
	const terrain = new Sprite(assets.terrain);
	terrain.width = assets.terrain.width;
	terrain.height = assets.terrain.height;
	terrain.zIndex = 0;
	const effects = new Container();
	effects.sortableChildren = true;
	drawTerrainEffects(effects, props.battleTerrain, assets.terrain.width, assets.terrain.height);
	const actors = new Container();
	actors.sortableChildren = true;
	world.addChild(terrain, effects, actors);
	root.addChild(world);
	stage.addChild(root);

	let destroyed = false;
	const scene: BattlePixiRuntime = {
		root,
		world,
		actors,
		actorSprites: new Map(),
		assets,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			for (const actor of scene.actorSprites.values()) disposeActor(actors, actor);
			scene.actorSprites.clear();
			root.destroy({ children: true });
		},
		update(nextProps) {
			syncActors(scene, nextProps);
			world.position.set(-nextProps.camera.originX * nextProps.camera.scale, -nextProps.camera.originY * nextProps.camera.scale);
			world.scale.set(nextProps.camera.scale);

			for (const [index, enemy] of nextProps.encounter.enemies.entries()) {
				const actor = scene.actorSprites.get(actorId('enemy', enemy.id));
				if (actor) updateActor(actor, nextProps, index, enemy);
			}
			for (const [index, member] of nextProps.encounter.members.entries()) {
				const actor = scene.actorSprites.get(actorId('party', member.userId));
				if (actor) updateActor(actor, nextProps, index, member);
			}
			actors.sortChildren();
		},
	};
	return scene;
}

function BattlePixiRuntime({ props, battleTerrain, onReady }: BattlePixiRuntimeComponentProps) {
	const { app } = useApplication();
	const sceneRef = useRef<BattlePixiRuntime | null>(null);
	const propsRef = useRef(props);

	useLayoutEffect(() => {
		propsRef.current = props;
	}, [props]);

	useEffect(() => {
		let active = true;
		let created: BattlePixiRuntime | null = null;
		onReady(false);
		void loadBattleAssets(battleTerrain)
			.then((assets) => {
				if (!active) return;
				try {
					created = createBattlePixiScene(propsRef.current, assets, app.stage);
					sceneRef.current = created;
					created.update(propsRef.current);
					if (!renderBattleApp(app)) throw new Error('Battle renderer is not ready.');
					onReady(true);
				} catch (error) {
					created?.destroy();
					throw error;
				}
			})
			.catch((error: unknown) => {
				if (!active) return;
				propsRef.current.onError(error instanceof Error ? error.message : 'Unable to load battle graphics.');
			});

		return () => {
			active = false;
			if (sceneRef.current === created) sceneRef.current = null;
			created?.destroy();
		};
	}, [app, battleTerrain, onReady]);

	useEffect(() => {
		const scene = sceneRef.current;
		if (!scene) return;
		scene.update(props);
		renderBattleApp(app);
	}, [app, props]);
	return null;
}

export function BattlePixiScene(props: BattlePixiSceneProps) {
	const applicationRef = useRef<ApplicationRef>(null);
	const [ready, setReady] = useState(false);
	const resolution = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1);

	useLayoutEffect(() => {
		const canvas = applicationRef.current?.getCanvas();
		if (!canvas) return;
		canvas.dataset.testid = 'battle-arena-canvas';
		canvas.dataset.renderer = 'pixi';
		canvas.setAttribute('aria-hidden', 'true');
	}, []);

	return (
		<div className="battle-pixi-scene" data-battle-pixi-ready={ready ? 'true' : 'false'} data-testid="battle-pixi-scene" aria-hidden="true">
			<Application
				ref={applicationRef}
				className="battle-pixi-application"
				resizeTo={props.viewportRef}
				preference="webgl"
				preferWebGLVersion={2}
				antialias={false}
				autoDensity
				resolution={resolution}
				backgroundAlpha={0}
				autoStart={false}
			>
				<BattlePixiRuntime props={props} battleTerrain={props.battleTerrain} onReady={setReady} />
			</Application>
		</div>
	);
}
