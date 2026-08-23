import { describe, expect, it } from 'vitest';

import { DUNGEON_LEGEND_KINDS, dungeonMarkerPresentation } from '#/lib/dungeon-markers';

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

	it('keeps legacy exits as non-semantic passage data', () => {
		expect(dungeonMarkerPresentation('exit')).toMatchObject({
			label: 'Passage',
			visible: false,
			propName: null,
		});
	});

	it('makes the goal an objective rather than an unexplained crystal', () => {
		expect(dungeonMarkerPresentation('goal')).toMatchObject({
			label: 'Mission objective',
			role: 'objective',
			propName: 'objective-beacon',
		});
	});
});
