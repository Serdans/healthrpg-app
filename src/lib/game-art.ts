import battlefieldMosswayUrl from '#/assets/game/backgrounds/battlefield-mossway.webp';
import interiorDungeonUrl from '#/assets/game/backgrounds/interior-dungeon.webp';
import interiorVillageUrl from '#/assets/game/backgrounds/interior-village.webp';
import overworldAtlasUrl from '#/assets/game/backgrounds/overworld-atlas.webp';
import partyClassSpritesUrl from '#/assets/game/characters/party-class-sprites.webp';
import partyTravelerSpriteUrl from '#/assets/game/characters/party-traveler-sprite.png';
import landmarkSpritesUrl from '#/assets/game/landmarks/landmark-sprites.webp';
import monsterSpritesUrl from '#/assets/game/monsters/monster-sprites.webp';
import itemSpritesUrl from '#/assets/game/items/item-sprites.webp';

import type { Inventory, PartyMap } from '#/lib/api';

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
	['field-herb', { position: '50% 0%', fallbackLabel: 'Field herb' }],
	['trail-blade', { position: '100% 0%', fallbackLabel: 'Trail Blade' }],
]);

export const inventoryItemSpriteArt = {
	src: itemSpritesUrl,
	backgroundSize: '300% 100%',
} as const;

export function inventoryItemArtForKey(itemKey: string) {
	return inventoryItemArt.get(itemKey);
}

export const partyTravelerArt = {
	src: partyTravelerSpriteUrl,
	backgroundSize: '200% 400%',
} as const;

export const gameplayBackgroundArt = {
	overworld: overworldAtlasUrl,
	dungeon: interiorDungeonUrl,
	village: interiorVillageUrl,
	battlefield: battlefieldMosswayUrl,
} as const;

export type BattleClassKey = 'warrior' | 'rogue' | 'ranger' | 'cleric' | 'mage' | 'bard';

export const battlePartyArt = {
	src: partyClassSpritesUrl,
	backgroundSize: '300% 200%',
	positions: {
		warrior: '0% 0%',
		rogue: '50% 0%',
		ranger: '100% 0%',
		cleric: '0% 100%',
		mage: '50% 100%',
		bard: '100% 100%',
	} satisfies Record<BattleClassKey, string>,
} as const;

export type BattleEnemyArchetype =
	'vermin' | 'bat' | 'wild-mushroom' | 'slime' | 'wolf' | 'grotto-mite' | 'thorn-wolf' | 'ruin-sentinel' | 'unknown';

export const battleEnemySpriteArt = {
	src: monsterSpritesUrl,
	backgroundSize: '300% 300%',
} as const;

const battleEnemyPositions: Record<BattleEnemyArchetype, string> = {
	vermin: '0% 0%',
	bat: '50% 0%',
	'wild-mushroom': '100% 0%',
	slime: '0% 50%',
	wolf: '50% 50%',
	'grotto-mite': '100% 50%',
	'thorn-wolf': '0% 100%',
	'ruin-sentinel': '50% 100%',
	unknown: '100% 100%',
} as const;

function isBattleClassKey(value: string): value is BattleClassKey {
	return value in battlePartyArt.positions;
}

function isBattleEnemyArchetype(value: string): value is BattleEnemyArchetype {
	return value in battleEnemyPositions;
}

export function battlePartyArtForClass(classKey: string) {
	return {
		...battlePartyArt,
		position: isBattleClassKey(classKey) ? battlePartyArt.positions[classKey] : battlePartyArt.positions.warrior,
	};
}

export function battleEnemyArtForArchetype(archetypeKey: string) {
	const key = isBattleEnemyArchetype(archetypeKey) ? archetypeKey : 'unknown';
	return {
		...battleEnemySpriteArt,
		position: battleEnemyPositions[key],
	};
}
