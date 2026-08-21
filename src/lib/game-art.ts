import type { PartyMap } from '#/lib/api';

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
	gate: { key: 'gate', position: '66.6667% 100%', fallbackLabel: 'Gate landmark' },
	travel: { key: 'travel', position: '100% 100%', fallbackLabel: 'Trail landmark' },
};

export function landmarkArtForNode(nodeType: LandmarkSpriteKey) {
	return landmarkArt[nodeType];
}

export const partyTravelerArt = {
	src: '/game-art/party-traveler-sprite.png',
	backgroundSize: '200% 400%',
} as const;

export const gameplayBackgroundArt = {
	overworld: '/game-art/atlas-terrain-v2.webp',
	dungeon: '/game-art/interior-dungeon-v2.webp',
	village: '/game-art/interior-village-v2.webp',
	battlefield: '/game-art/battlefield-mossway-v2.webp',
} as const;

export type BattleClassKey = 'warrior' | 'rogue' | 'ranger' | 'cleric' | 'mage' | 'bard';

export const battlePartyArt = {
	src: '/game-art/battle-party-classes.webp',
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

export const battleEnemyArt = {
	mossWolf: {
		src: '/game-art/battle-enemy-moss-wolf.webp',
		backgroundSize: 'contain',
	},
	default: {
		src: '/game-art/battle-enemy-moss-wolf.webp',
		backgroundSize: 'contain',
	},
} as const;

function isBattleClassKey(value: string): value is BattleClassKey {
	return value in battlePartyArt.positions;
}

export function battlePartyArtForClass(classKey: string) {
	return {
		...battlePartyArt,
		position: isBattleClassKey(classKey) ? battlePartyArt.positions[classKey] : battlePartyArt.positions.warrior,
	};
}

export function battleEnemyArtForArchetype(archetypeKey: string) {
	return archetypeKey === 'moss-wolf' ? battleEnemyArt.mossWolf : battleEnemyArt.default;
}
