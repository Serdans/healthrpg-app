import { describe, expect, it } from 'vitest';

import {
	floorTextureName,
	TEXTURE_COUNT,
	TEXTURE_INDEX,
	pixelTile,
	pixelTileNames,
	validatePixelTiles,
	TILE_ART_SIZE,
} from '#/lib/dungeon-tiles';
import { dungeonTilesetArt } from '#/lib/game-art';

describe('pixel dungeon tileset', () => {
	it('authors structurally valid maps', () => {
		expect(validatePixelTiles()).toEqual([]);
	});

	it('exposes the full texture set in manifest order', () => {
		const names = pixelTileNames();
		expect(names).toHaveLength(TEXTURE_COUNT);
		expect(names.slice(0, 3)).toEqual(['floor-mask-0-0', 'floor-mask-0-1', 'floor-mask-0-2']);
		expect(names.at(-1)).toBe('fog');
		expect(names.filter((name) => name.startsWith('floor-mask-'))).toHaveLength(48);
		expect(pixelTile('floor-mask-0-0').rows).toHaveLength(TILE_ART_SIZE);
	});

	it('keeps every row within the palette', () => {
		for (const name of pixelTileNames()) {
			const tile = pixelTile(name);
			for (const row of tile.rows) {
				expect(row).toHaveLength(TILE_ART_SIZE);
			}
		}
	});

	it('keeps small native pixel details instead of expanded macro-pixels', () => {
		const floorNames = pixelTileNames().filter((name) => name.startsWith('floor-mask-'));
		for (const name of floorNames.slice(0, 12)) {
			const rows = pixelTile(name).rows;
			const colors = new Set(rows.join(''));
			const longestRun = rows.reduce((longest, row) => {
				let current = 1;
				let rowLongest = 1;
				for (let index = 1; index < row.length; index += 1) {
					current = row[index] === row[index - 1] ? current + 1 : 1;
					rowLongest = Math.max(rowLongest, current);
				}
				return Math.max(longest, rowLongest);
			}, 1);

			expect(colors.size).toBeGreaterThanOrEqual(5);
			expect(longestRun).toBeLessThanOrEqual(8);
		}
	});

	it('maps boundary masks and decor seeds to stable floor variants', () => {
		expect(floorTextureName(0, 0)).toBe('floor-mask-0-0');
		expect(floorTextureName(1, 1)).toBe('floor-mask-1-1');
		expect(floorTextureName(0x10, 2)).toBe('floor-mask-0-2');
		expect(floorTextureName(15, 3)).toBe('floor-mask-15-0');
	});

	it('maps every texture to a unique strip index under the strip width', () => {
		const indexes = Object.values(TEXTURE_INDEX);
		expect(new Set(indexes).size).toBe(TEXTURE_COUNT);
		expect(Math.max(...indexes)).toBeLessThan(TEXTURE_COUNT);
	});

	it('declares a baked asset in game-art matching the strip', () => {
		expect(dungeonTilesetArt.tileSize).toBe(TILE_ART_SIZE);
		expect(dungeonTilesetArt.totalWidth).toBe(TEXTURE_COUNT * TILE_ART_SIZE);
		expect(dungeonTilesetArt.src).toMatch(/dungeon-tileset/);
	});
});
