import type { DungeonGridTileKind } from './dungeon-grid';
import type { DungeonPropTextureName } from './dungeon-props';

export type DungeonMarkerRole = 'navigation' | 'objective' | 'resource' | 'recovery' | 'encounter' | 'entrance' | 'passage';

export interface DungeonMarkerPresentation {
	label: string;
	description: string;
	role: DungeonMarkerRole;
	propName: DungeonPropTextureName | null;
	/** Legacy exit nodes remain valid data, but are deliberately rendered as ordinary floor. */
	visible: boolean;
}

const PRESENTATION: Record<DungeonGridTileKind, DungeonMarkerPresentation> = {
	entry: {
		label: 'Dungeon entrance',
		description: 'The route back to the overworld when the party is ready to leave.',
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
		label: 'Mission objective',
		description: 'Reach this landmark to resolve the current dungeon mission.',
		role: 'objective',
		propName: 'objective-beacon',
		visible: true,
	},
	boss: {
		label: 'Boss encounter',
		description: 'A powerful optional enemy guards this tile.',
		role: 'encounter',
		propName: 'boss-rune',
		visible: true,
	},
	exit: {
		label: 'Passage',
		description: 'A legacy exit marker. New dungeons use the stairs and mission objective flow.',
		role: 'passage',
		propName: null,
		visible: false,
	},
};

export function dungeonMarkerPresentation(kind: DungeonGridTileKind): DungeonMarkerPresentation {
	return PRESENTATION[kind];
}

export const DUNGEON_LEGEND_KINDS: readonly DungeonGridTileKind[] = ['goal', 'stairs-down', 'stairs-up', 'rest', 'treasure', 'spawn'];
