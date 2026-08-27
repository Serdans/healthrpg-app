import battlefieldRuinsUrl from '#/assets/game/backgrounds/battlefield-ruins.webp';
import battlefieldWildsUrl from '#/assets/game/backgrounds/battlefield-wilds.webp';
import interiorDungeonUrl from '#/assets/game/backgrounds/interior-dungeon.webp';
import interiorVillageUrl from '#/assets/game/backgrounds/interior-village.webp';
import overworldAtlasUrl from '#/assets/game/backgrounds/overworld-atlas.webp';
import partyClassSpritesUrl from '#/assets/game/characters/party-class-sprites.webp';
import dungeonMapPartyUrl from '#/assets/game/characters/dungeon-map-party.png';
import partyTravelerSpriteUrl from '#/assets/game/characters/party-traveler-sprite.png';
import landmarkSpritesUrl from '#/assets/game/landmarks/landmark-sprites.webp';
import monsterSpritesUrl from '#/assets/game/monsters/monster-sprites.webp';
import dungeonMapMonsterUrl from '#/assets/game/monsters/dungeon-map-monsters.png';
import itemSpritesUrl from '#/assets/game/items/item-sprites.webp';
import weaponSpritesUrl from '#/assets/game/weapons/weapon-sprites.webp';
import armorSpritesUrl from '#/assets/game/armor/armor-sprites.webp';
import accessorySpritesUrl from '#/assets/game/accessories/accessory-sprites.webp';
import dungeonTilesetUrl from '#/assets/game/tiles/dungeon-tileset.png';
import dungeonPropsUrl from '#/assets/game/tiles/dungeon-props.png';

import type { Inventory, PartyMap } from '#/lib/api';
import type { BattleArtSource, BattleSpriteGrounding } from '#/lib/battle-art';
import type { BattleTerrain } from '#/lib/battle-terrain';
import { DUNGEON_PROP_TEXTURE_COUNT, DUNGEON_PROP_ART_SIZE, DUNGEON_PROP_TEXTURE_NAMES } from '#/lib/dungeon-props';
import { TEXTURE_COUNT } from '#/lib/dungeon-tiles';
import type { GroundedAnchor } from '#/lib/sprite-grounding';

export type GamePanelTone = 'atlas' | 'combat' | 'village' | 'arcane' | 'history';

export type LandmarkSpriteKey = PartyMap['nodes'][number]['nodeType'];
export type PartyTravelerDirection = 'north' | 'east' | 'south' | 'west';

export interface LandmarkArt {
	key: LandmarkSpriteKey;
	position: string;
	fallbackLabel: string;
}

const landmarkArt: Record<LandmarkSpriteKey, LandmarkArt> = {
	village: { key: 'village', position: '0% 0%', fallbackLabel: 'Village landmark' },
	dungeon: { key: 'dungeon', position: '33.3333% 0%', fallbackLabel: 'Dungeon landmark' },
	combat: { key: 'combat', position: '66.6667% 0%', fallbackLabel: 'Combat landmark' },
	treasure: { key: 'treasure', position: '100% 0%', fallbackLabel: 'Treasure landmark' },
	narrative: { key: 'narrative', position: '0% 100%', fallbackLabel: 'Story landmark' },
	rest: { key: 'rest', position: '33.3333% 100%', fallbackLabel: 'Rest landmark' },
	challenge: { key: 'challenge', position: '66.6667% 100%', fallbackLabel: 'Challenge landmark' },
	travel: { key: 'travel', position: '100% 100%', fallbackLabel: 'Trail landmark' },
};

export function landmarkArtForNode(nodeType: LandmarkSpriteKey) {
	return landmarkArt[nodeType];
}

export const landmarkSpriteArt = {
	src: landmarkSpritesUrl,
	backgroundSize: '400% 200%',
} as const;

export type InventoryItemKind = Inventory['items'][number]['kind'];

export interface InventoryItemSpriteArt {
	position: string;
	fallbackLabel: string;
}

const inventoryItemArt = new Map<string, InventoryItemSpriteArt>([
	['gold', { position: '0% 0%', fallbackLabel: 'Gold' }],
	['herb', { position: '33.3333% 0%', fallbackLabel: 'Herb' }],
	['nut', { position: '66.6667% 0%', fallbackLabel: 'Nut' }],
	['potion', { position: '100% 0%', fallbackLabel: 'Potion' }],
	['short-sword', { position: '0% 100%', fallbackLabel: 'Short Sword' }],
]);

const weaponSpriteKeys = [
	'short-sword',
	'hunter-sword',
	'raider-sword',
	'briar-rapier',
	'battle-rapier',
	'master-rapier',
	'corsair-sword',
	'dreamwake-sword',
	'fog-sabre',
	'corsair-sabre',
	'mace',
	'heavy-mace',
	'battle-mace',
	'war-mace',
	'ember-mace',
	'starfall-mace',
	'bone-mace',
	'night-mace',
	'battle-axe',
	'broad-axe',
	'forge-axe',
	'great-axe',
	'ember-axe',
	'dragon-axe',
	'oathbound-axe',
	'crescent-axe',
	'captains-axe',
	'deepforge-axe',
	'long-sword',
	'broad-sword',
	'frost-blade',
	'claymore',
	'great-sword',
	'tempest-brand',
	'crescent-sword',
	'raiders-blade',
	'thunder-sword',
	'spirit-brand',
	'wooden-stick',
	'grove-rod',
	'magic-rod',
	'hexwood-wand',
	'sunward-rod',
	'waystone-rod',
	'frost-wand',
	'dawnlight-wand',
	'gloam-staff',
	'gravekeeper-staff',
	'sky-wand',
	'ember-staff',
] as const;

const weaponItemArt = new Map<string, InventoryItemSpriteArt>(
	weaponSpriteKeys.map((key, index) => [key, { position: spritePosition(index, 10, 5), fallbackLabel: key }]),
);

export const inventoryItemSpriteArt = {
	src: itemSpritesUrl,
	backgroundSize: '400% 200%',
} as const;

export const weaponSpriteArt = {
	src: weaponSpritesUrl,
	backgroundSize: '1000% 500%',
} as const;

const armorSpriteKeys = [
	'leather-armor',
	'padded-vest',
	'scout-leathers',
	'iron-vest',
	'bronze-cuirass',
	'chain-shirt',
	'iron-cuirass',
	'scale-mail',
	'guardian-plate',
	'bastion-mail',
	'linen-cap',
	'trail-hood',
	'bronze-helm',
	'iron-helm',
	'dawn-circlet',
	'leather-armlet',
	'copper-bracer',
	'bronze-bracer',
	'iron-bracer',
	'guardian-gauntlet',
] as const;

const accessorySpriteKeys = [
	'traveler-sandals',
	'trail-boots',
	'windstep-boots',
	'swiftstep-boots',
	'gale-boots',
	'skystride-boots',
	'copper-band',
	'travelers-knot',
	'iron-ring',
	'wind-token',
	'forge-seal',
	'clear-prism',
	'captain-signet',
	'starlight-prism',
	'cotton-shirt',
	'wayfarer-shirt',
	'linen-shirt',
	'rainweave-shirt',
	'sunthread-shirt',
	'starweave-shirt',
] as const;

const armorItemArt = new Map<string, InventoryItemSpriteArt>(
	armorSpriteKeys.map((key, index) => [key, { position: spritePosition(index, 10, 2), fallbackLabel: key }]),
);

const accessoryItemArt = new Map<string, InventoryItemSpriteArt>(
	accessorySpriteKeys.map((key, index) => [key, { position: spritePosition(index, 10, 2), fallbackLabel: key }]),
);

export const armorSpriteArt = {
	src: armorSpritesUrl,
	backgroundSize: '1000% 200%',
} as const;

export const accessorySpriteArt = {
	src: accessorySpritesUrl,
	backgroundSize: '1000% 200%',
} as const;

export function inventoryItemArtForKey(itemKey: string) {
	return inventoryItemArt.get(itemKey);
}

export function weaponItemArtForKey(itemKey: string) {
	return weaponItemArt.get(itemKey);
}

export function armorItemArtForKey(itemKey: string) {
	return armorItemArt.get(itemKey);
}

export function accessoryItemArtForKey(itemKey: string) {
	return accessoryItemArt.get(itemKey);
}

function spritePosition(index: number, columns: number, rows: number): string {
	const column = index % columns;
	const row = Math.floor(index / columns);
	const x = columns === 1 ? 0 : (column / (columns - 1)) * 100;
	const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
	return `${x}% ${y}%`;
}

export const partyTravelerArt = {
	src: partyTravelerSpriteUrl,
	backgroundSize: '200% 400%',
} as const;

/** Dedicated low-density actor sheet for the 24px dungeon plane. */
export const dungeonMapPartyArt = {
	src: dungeonMapPartyUrl,
	columns: 2,
	rows: 4,
	backgroundSize: '200% 400%',
} as const;

export const gameplayBackgroundArt = {
	overworld: overworldAtlasUrl,
	dungeon: interiorDungeonUrl,
	village: interiorVillageUrl,
} as const;

export const battleTerrainArt = {
	ruins: battlefieldRuinsUrl,
	wilds: battlefieldWildsUrl,
} satisfies Record<BattleTerrain, string>;

/** Native dimensions of the two terrain plates used by the battle camera. */
export const battleTerrainWorldSize = {
	width: 1672,
	height: 941,
} as const;

export type BattleClassKey = 'warrior' | 'rogue' | 'ranger' | 'cleric' | 'mage' | 'bard';

function battleSpriteGrounding(sourceAnchor: GroundedAnchor, shadowWidth: number, scale = 1, lift = 0): BattleSpriteGrounding {
	return { sourceAnchor, scale, lift, shadowWidth };
}

/**
 * Contact points measured from the visible atlas artwork. The second party
 * row has a shorter transparent tail, so it needs a lower source anchor to
 * share the same battle floor as the first row.
 */
const battlePartyGrounding = {
	warrior: battleSpriteGrounding({ x: 0.504, y: 1 }, 0.62),
	rogue: battleSpriteGrounding({ x: 0.517, y: 1 }, 0.62),
	ranger: battleSpriteGrounding({ x: 0.468, y: 1 }, 0.62),
	cleric: battleSpriteGrounding({ x: 0.52, y: 0.936 }, 0.62),
	mage: battleSpriteGrounding({ x: 0.521, y: 0.936 }, 0.62),
	bard: battleSpriteGrounding({ x: 0.535, y: 0.936 }, 0.62),
} satisfies Record<BattleClassKey, BattleSpriteGrounding>;

export const battlePartyArt = {
	src: partyClassSpritesUrl,
	groundings: battlePartyGrounding,
	atlas: {
		columns: 3,
		rows: 2,
		frames: {
			warrior: { column: 0, row: 0 },
			rogue: { column: 1, row: 0 },
			ranger: { column: 2, row: 0 },
			cleric: { column: 0, row: 1 },
			mage: { column: 1, row: 1 },
			bard: { column: 2, row: 1 },
		} satisfies Record<BattleClassKey, { column: number; row: number }>,
	},
} as const;

export type BattleEnemyArchetype =
	'vermin' | 'bat' | 'wild-mushroom' | 'slime' | 'wolf' | 'grotto-mite' | 'thorn-wolf' | 'ruin-sentinel' | 'unknown';

/** Contact points and shadow footprints measured from the 3×3 monster atlas. */
const battleEnemyGrounding = {
	vermin: battleSpriteGrounding({ x: 0.5, y: 0.998 }, 0.5),
	bat: battleSpriteGrounding({ x: 0.5, y: 0.998 }, 0.54),
	'wild-mushroom': battleSpriteGrounding({ x: 0.5, y: 0.996 }, 0.5),
	slime: battleSpriteGrounding({ x: 0.501, y: 0.998 }, 0.56),
	wolf: battleSpriteGrounding({ x: 0.499, y: 0.998 }, 0.54),
	'grotto-mite': battleSpriteGrounding({ x: 0.498, y: 1 }, 0.52),
	'thorn-wolf': battleSpriteGrounding({ x: 0.501, y: 1 }, 0.58),
	'ruin-sentinel': battleSpriteGrounding({ x: 0.499, y: 1 }, 0.62),
	unknown: battleSpriteGrounding({ x: 0.5, y: 1 }, 0.52),
} satisfies Record<BattleEnemyArchetype, BattleSpriteGrounding>;

export const battleEnemySpriteArt = {
	src: monsterSpritesUrl,
	groundings: battleEnemyGrounding,
	atlas: {
		columns: 3,
		rows: 3,
	} as const,
} as const;

export const dungeonMapMonsterArt = {
	src: dungeonMapMonsterUrl,
	columns: 3,
	rows: 3,
	positions: {
		vermin: [0, 0],
		bat: [1, 0],
		'wild-mushroom': [2, 0],
		slime: [0, 1],
		wolf: [1, 1],
		'grotto-mite': [2, 1],
		'thorn-wolf': [0, 2],
		'ruin-sentinel': [1, 2],
		unknown: [2, 2],
	} satisfies Record<BattleEnemyArchetype, readonly [number, number]>,
} as const;

/** Baked 24px dungeon chunk strip, consumed by the canvas world renderer. */
export const dungeonTilesetArt = {
	src: dungeonTilesetUrl,
	tileSize: 24,
	totalWidth: TEXTURE_COUNT * 24,
} as const;

/** Transparent 24px dungeon-object sprites, consumed by the Pixi world renderer. */
export const dungeonPropsArt = {
	src: dungeonPropsUrl,
	tileSize: DUNGEON_PROP_ART_SIZE,
	names: DUNGEON_PROP_TEXTURE_NAMES,
	totalWidth: DUNGEON_PROP_TEXTURE_COUNT * DUNGEON_PROP_ART_SIZE,
} as const;

const battleEnemyFrames = {
	vermin: { column: 0, row: 0 },
	bat: { column: 1, row: 0 },
	'wild-mushroom': { column: 2, row: 0 },
	slime: { column: 0, row: 1 },
	wolf: { column: 1, row: 1 },
	'grotto-mite': { column: 2, row: 1 },
	'thorn-wolf': { column: 0, row: 2 },
	'ruin-sentinel': { column: 1, row: 2 },
	unknown: { column: 2, row: 2 },
} satisfies Record<BattleEnemyArchetype, { column: number; row: number }>;

function isBattleClassKey(value: string): value is BattleClassKey {
	return value in battlePartyArt.atlas.frames;
}

function isBattleEnemyArchetype(value: string): value is BattleEnemyArchetype {
	return value in battleEnemyFrames;
}

export function battlePartyArtForClass(classKey: string): BattleArtSource {
	const key = isBattleClassKey(classKey) ? classKey : 'warrior';
	return {
		src: battlePartyArt.src,
		atlasFrame: { ...battlePartyArt.atlas, ...battlePartyArt.atlas.frames[key] },
		grounding: battlePartyArt.groundings[key],
	};
}

export function battleEnemyArtForArchetype(archetypeKey: string): BattleArtSource {
	const key = isBattleEnemyArchetype(archetypeKey) ? archetypeKey : 'unknown';
	return {
		src: battleEnemySpriteArt.src,
		atlasFrame: { ...battleEnemySpriteArt.atlas, ...battleEnemyFrames[key] },
		grounding: battleEnemySpriteArt.groundings[key],
	};
}

export function dungeonMapMonsterArtForArchetype(archetypeKey: string) {
	const key = isBattleEnemyArchetype(archetypeKey) ? archetypeKey : 'unknown';
	return {
		...dungeonMapMonsterArt,
		position: dungeonMapMonsterArt.positions[key],
	};
}
