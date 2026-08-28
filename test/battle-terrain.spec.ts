import { describe, expect, it } from 'vitest';

import { battleTerrainForMap } from '#/lib/battle-terrain';

describe('battleTerrainForMap', () => {
	it('uses the ruins arena for dungeon maps', () => {
		expect(battleTerrainForMap('dungeon')).toBe('ruins');
	});

	it('uses the wilds arena for overworld maps', () => {
		expect(battleTerrainForMap('overworld')).toBe('wilds');
	});

	it('keeps the unsupported village combat context on the explicit wilds fallback', () => {
		expect(battleTerrainForMap('village')).toBe('wilds');
	});
});
