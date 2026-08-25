import { DUNGEON_TILE_KINDS } from './dungeon-grid';
import type { DungeonGridTile, DungeonGridTileKind } from './dungeon-grid';
import type { DungeonPropTextureName } from './dungeon-props';

export type DungeonMarkerRole = 'navigation' | 'objective' | 'resource' | 'recovery' | 'encounter' | 'entrance' | 'passage';

export interface DungeonMarkerPresentation {
	label: string;
	description: string;
	role: DungeonMarkerRole;
	propName: DungeonPropTextureName | null;
	visible: boolean;
}

const PRESENTATION: Record<DungeonGridTileKind, DungeonMarkerPresentation> = {
	entry: {
		label: 'Dungeon entrance',
		description: 'The expedition’s starting landmark and route back to the overworld.',
		role: 'entrance',
		propName: 'entry-gate',
		visible: true,
	},
	floor: {
		label: 'Passage',
		description: 'A walkable dungeon tile.',
		role: 'passage',
		propName: null,
		visible: false,
	},
	'stairs-up': {
		label: 'Stairs up',
		description: 'Return to the previous dungeon floor.',
		role: 'navigation',
		propName: 'stairs-up',
		visible: true,
	},
	'stairs-down': {
		label: 'Stairs down',
		description: 'Descend to the next dungeon floor.',
		role: 'navigation',
		propName: 'stairs-down',
		visible: true,
	},
	treasure: {
		label: 'Hidden cache',
		description: 'A reward event waits here. The party pauses until it is resolved.',
		role: 'resource',
		propName: 'treasure-chest',
		visible: true,
	},
	rest: {
		label: 'Campsite',
		description: 'A recovery event where the party can decide how to spend the day.',
		role: 'recovery',
		propName: 'rest-camp',
		visible: true,
	},
	spawn: {
		label: 'Monster encounter',
		description: 'A hostile creature occupies this tile.',
		role: 'encounter',
		propName: 'combat-rune',
		visible: true,
	},
	goal: {
		label: 'Mission exit',
		description: 'Reach this landmark to complete the mission and return to the overworld after resolution.',
		role: 'objective',
		propName: 'objective-beacon',
		visible: true,
	},
	boss: {
		label: 'Optional boss',
		description: 'A powerful optional enemy waits here. Save a card plan to engage it.',
		role: 'encounter',
		propName: 'boss-rune',
		visible: true,
	},
};

export function dungeonMarkerPresentation(kind: DungeonGridTileKind): DungeonMarkerPresentation {
	return PRESENTATION[kind];
}

export function dungeonMarkerPresentationForTile(tile: Pick<DungeonGridTile, 'kind' | 'node'>): DungeonMarkerPresentation {
	const presentation = dungeonMarkerPresentation(tile.kind);
	if (!tile.node.encounterCleared || (tile.kind !== 'spawn' && tile.kind !== 'boss')) return presentation;
	return {
		...presentation,
		label: 'Cleared encounter',
		description: 'The party has already cleared this encounter. The passage is safe to cross.',
		propName: null,
		visible: false,
	};
}

export const DUNGEON_LEGEND_KINDS: readonly DungeonGridTileKind[] = DUNGEON_TILE_KINDS.filter((kind) => PRESENTATION[kind].visible);
