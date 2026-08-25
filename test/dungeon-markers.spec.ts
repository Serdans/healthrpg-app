import { describe, expect, it } from 'vitest';

import { DUNGEON_LEGEND_KINDS, dungeonMarkerPresentation, dungeonMarkerPresentationForTile } from '#/lib/dungeon-markers';

describe('dungeon marker semantics', () => {
	it('gives every primary marker an explicit text meaning', () => {
		for (const kind of DUNGEON_LEGEND_KINDS) {
			const marker = dungeonMarkerPresentation(kind);
			expect(marker.label.length).toBeGreaterThan(0);
			expect(marker.description.length).toBeGreaterThan(0);
			expect(marker.visible).toBe(true);
			expect(marker.propName).not.toBeNull();
		}
	});

	it('makes the goal an objective rather than an unexplained crystal', () => {
		expect(dungeonMarkerPresentation('goal')).toMatchObject({
			label: 'Mission exit',
			role: 'objective',
			propName: 'objective-beacon',
		});
	});

	it('explains the entry and optional boss in the legend', () => {
		expect(DUNGEON_LEGEND_KINDS).toEqual(expect.arrayContaining(['entry', 'boss']));
		expect(dungeonMarkerPresentation('boss').description).toContain('card plan');
	});

	it('removes cleared encounter markers while keeping their status inspectable', () => {
		const marker = dungeonMarkerPresentationForTile({
			kind: 'spawn',
			node: { encounterCleared: true } as Parameters<typeof dungeonMarkerPresentationForTile>[0]['node'],
		});

		expect(marker).toMatchObject({ label: 'Cleared encounter', visible: false, propName: null });
	});
});
