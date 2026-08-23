import { describe, expect, it } from 'vitest';

import {
	DUNGEON_PROP_ART_SIZE,
	DUNGEON_PROP_TEXTURE_COUNT,
	DUNGEON_PROP_TEXTURE_NAMES,
	dungeonPropTextureNames,
	pixelProp,
	validatePixelProps,
} from '#/lib/dungeon-props';
import { dungeonPropsArt } from '#/lib/game-art';

describe('dungeon prop atlas', () => {
	it('keeps the authored props transparent, visible, and structurally valid', () => {
		expect(validatePixelProps()).toEqual([]);
		expect(dungeonPropTextureNames()).toEqual([...DUNGEON_PROP_TEXTURE_NAMES]);

		for (const name of DUNGEON_PROP_TEXTURE_NAMES) {
			const prop = pixelProp(name);
			expect(prop.rows).toHaveLength(DUNGEON_PROP_ART_SIZE);
			expect(prop.rows.every((row) => row.length === DUNGEON_PROP_ART_SIZE)).toBe(true);
			expect(prop.rows.some((row) => row.includes('.'))).toBe(true);
			expect(prop.rows.some((row) => /[0-9a-f]/.test(row))).toBe(true);
		}
	});

	it('publishes a 24px frame manifest for Pixi texture loading', () => {
		expect(DUNGEON_PROP_TEXTURE_COUNT).toBe(9);
		expect(dungeonPropsArt.tileSize).toBe(DUNGEON_PROP_ART_SIZE);
		expect(dungeonPropsArt.totalWidth).toBe(DUNGEON_PROP_TEXTURE_COUNT * DUNGEON_PROP_ART_SIZE);
		expect(dungeonPropsArt.names).toEqual(DUNGEON_PROP_TEXTURE_NAMES);
	});
});
