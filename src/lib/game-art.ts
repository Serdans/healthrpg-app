import battlefieldMosswayUrl from '#/assets/game/backgrounds/battlefield-mossway.webp';
import interiorDungeonUrl from '#/assets/game/backgrounds/interior-dungeon.webp';
import interiorVillageUrl from '#/assets/game/backgrounds/interior-village.webp';
import overworldAtlasUrl from '#/assets/game/backgrounds/overworld-atlas.webp';
import partyClassSpritesUrl from '#/assets/game/characters/party-class-sprites.webp';
import partyTravelerSpriteUrl from '#/assets/game/characters/party-traveler-sprite.png';
import landmarkSpritesUrl from '#/assets/game/landmarks/landmark-sprites.webp';
import monsterSpritesUrl from '#/assets/game/monsters/monster-sprites.webp';
import itemSpritesUrl from '#/assets/game/items/item-sprites.webp';
import weaponSpritesUrl from '#/assets/game/weapons/weapon-sprites.webp';
import armorSpritesUrl from '#/assets/game/armor/armor-sprites.webp';
import accessorySpritesUrl from '#/assets/game/accessories/accessory-sprites.webp';

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
