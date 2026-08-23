/**
 * Code-authored 24×24 pixel-art dungeon chunks and their asset manifest.
 *
 * The floor atlas is intentionally indexed by the four-way boundary mask so
 * neighboring cells produce authored edges instead of a procedural rectangle
 * drawn over the actor's tile. The build script bakes these deterministic
 * source pixels into the strip consumed by PixiJS.
 */

/** Art resolution of one dungeon chunk. */
export const TILE_ART_SIZE = 24;

/** Four-way boundary bits used by the floor texture lookup. */
export const FLOOR_BOUNDARY_MASK = {
	north: 1,
	east: 2,
	south: 4,
	west: 8,
} as const;

const FLOOR_VARIANT_COUNT = 3;
const FLOOR_MASK_COUNT = 16;

export type DungeonTileTextureName =
	`floor-mask-${number}-${number}` | 'wall-top' | 'wall-top-alt' | 'wall-face' | 'wall-face-alt' | 'wall-deep' | 'fog';

const floorTextureNames = Array.from({ length: FLOOR_MASK_COUNT }, (_unused, mask) =>
	Array.from({ length: FLOOR_VARIANT_COUNT }, (_variantUnused, variant) => `floor-mask-${String(mask)}-${String(variant)}` as const),
).flat();

/** Tile order in the baked strip; index doubles as the source-rect offset. */
export const TEXTURE_INDEX: Readonly<Record<DungeonTileTextureName, number>> = {
	...Object.fromEntries(floorTextureNames.map((name, index) => [name, index])),
	'wall-top': floorTextureNames.length,
	'wall-top-alt': floorTextureNames.length + 1,
	'wall-face': floorTextureNames.length + 2,
	'wall-face-alt': floorTextureNames.length + 3,
	'wall-deep': floorTextureNames.length + 4,
	fog: floorTextureNames.length + 5,
};

/** Number of chunks in the strip. */
export const TEXTURE_COUNT = Object.keys(TEXTURE_INDEX).length;

export interface PixelTile {
	readonly palette: readonly string[];
	/** 24 rows of independently authored source pixels. */
	readonly rows: readonly string[];
}

const HEX = '0123456789abcdef';

const FLOOR_PALETTE = [
	'#0a1114',
	'#152329',
	'#22363c',
	'#304743',
	'#40564b',
	'#526653',
	'#657256',
	'#787b58',
	'#93855b',
	'#b09a63',
	'#5c5139',
	'#876442',
] as const;

const WALL_PALETTE = ['#04090d', '#0c171d', '#182a31', '#29423f', '#3d5b4c', '#5b744f', '#87643e', '#b1834a'] as const;

const FOG_PALETTE = ['#030811', '#07121d', '#0d1f2b', '#153044', '#1f4253', '#2e5a63', '#44736e'] as const;

type PixelGrid = string[][];

function createGrid(fill: string): PixelGrid {
	return Array.from({ length: TILE_ART_SIZE }, () => Array.from({ length: TILE_ART_SIZE }, () => fill));
}

function hashPixel(x: number, y: number, seed: number): number {
	let value = Math.imul(x + seed * 31 + 17, 374761393) ^ Math.imul(y + seed * 47 + 29, 668265263);
	value = Math.imul(value ^ (value >>> 13), 1274126177);
	return (value ^ (value >>> 16)) >>> 0;
}

function rowText(row: readonly string[]): string {
	const text = row.join('');
	if (text.length !== TILE_ART_SIZE) throw new Error(`Dungeon pixel row must contain ${String(TILE_ART_SIZE)} pixels`);
	return text;
}

function setPixel(grid: PixelGrid, x: number, y: number, value: number): void {
	if (x < 0 || y < 0 || x >= TILE_ART_SIZE || y >= TILE_ART_SIZE) return;
	grid[y][x] = HEX[value];
}

function setCluster(grid: PixelGrid, x: number, y: number, value: number, pattern: readonly string[]): void {
	for (const [rowIndex, row] of pattern.entries()) {
		for (const [columnIndex, character] of [...row].entries()) {
			if (character !== '.') setPixel(grid, x + columnIndex, y + rowIndex, value + Number(character));
		}
	}
}

function createFloorRows(variant: number, boundaryMask: number): readonly string[] {
	const grid = createGrid('3');
	for (let y = 0; y < TILE_ART_SIZE; y += 1) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			let value = 3 + ((Math.floor(x / 3) + Math.floor(y / 3) + variant) % 2);
			if ((x * 7 + y * 11 + variant * 13) % 53 === 0) value = 5;
			if ((x * 5 + y * 3 + variant * 17) % 79 === 0) value = 6;
			if ((x * 13 + y * 19 + variant * 5) % 113 === 0) value = 7;
			grid[y][x] = HEX[value];
		}
	}

	const motifs = [
		{ x: 4 + ((variant * 7) % 13), y: 5 + ((variant * 5) % 12), value: 5 },
		{ x: 15 - ((variant * 3) % 8), y: 16 - ((variant * 7) % 9), value: 6 },
	];
	for (const motif of motifs) setCluster(grid, motif.x, motif.y, motif.value, ['.1.', '121', '.1.']);
	if (variant === 1) setCluster(grid, 3, 17, 6, ['.11.', '1221', '.11.']);
	if (variant === 2) setCluster(grid, 17, 4, 7, ['..1.', '.121', '121.', '.1..']);

	if (boundaryMask & FLOOR_BOUNDARY_MASK.north) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			setPixel(grid, x, 0, x % 3 === 0 ? 1 : 2);
			setPixel(grid, x, 1, x % 4 === 0 ? 2 : 3);
			if ((x + variant) % 5 === 0) setPixel(grid, x, 2, 5);
		}
	}
	if (boundaryMask & FLOOR_BOUNDARY_MASK.east) {
		for (let y = 0; y < TILE_ART_SIZE; y += 1) {
			setPixel(grid, 23, y, y % 3 === 0 ? 1 : 2);
			setPixel(grid, 22, y, y % 4 === 0 ? 2 : 3);
			if ((y + variant) % 5 === 0) setPixel(grid, 21, y, 5);
		}
	}
	if (boundaryMask & FLOOR_BOUNDARY_MASK.south) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			setPixel(grid, x, 23, x % 3 === 0 ? 1 : 2);
			setPixel(grid, x, 22, x % 4 === 0 ? 2 : 3);
			if ((x + variant) % 5 === 0) setPixel(grid, x, 21, 5);
		}
	}
	if (boundaryMask & FLOOR_BOUNDARY_MASK.west) {
		for (let y = 0; y < TILE_ART_SIZE; y += 1) {
			setPixel(grid, 0, y, y % 3 === 0 ? 1 : 2);
			setPixel(grid, 1, y, y % 4 === 0 ? 2 : 3);
			if ((y + variant) % 5 === 0) setPixel(grid, 2, y, 5);
		}
	}

	return grid.map((row) => rowText(row));
}

function createWallRows(variant: number, face: boolean): readonly string[] {
	const grid = createGrid(face ? '3' : '1');
	for (let y = 0; y < TILE_ART_SIZE; y += 1) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			const coarse = hashPixel(Math.floor(x / 4), Math.floor(y / 4), variant + (face ? 41 : 23));
			let value = face ? 2 + (coarse % 2) : 1 + (coarse % 2);
			if (face && (x * 3 + y * 5 + variant * 11) % 53 === 0) value = 4;
			if (face && (x * 7 + y * 2 + variant * 19) % 83 === 0) value = 6;
			if (!face && y % 6 === (variant + 1) % 6 && x % 5 < 3) value = 3;
			grid[y][x] = HEX[value];
		}
	}
	if (face) {
		setCluster(grid, 4 + variant * 4, 2, 4, ['..1.', '.121', '121.', '.1..']);
		setCluster(grid, 15 - variant * 3, 14, 5, ['.1.', '121', '.1.']);
	}
	return grid.map((row) => rowText(row));
}

function createDeepRows(): readonly string[] {
	const grid = createGrid('0');
	for (let y = 0; y < TILE_ART_SIZE; y += 1) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			const value = hashPixel(x, y, 89) % 5 === 0 ? 2 : hashPixel(Math.floor(x / 2), Math.floor(y / 2), 97) % 4 === 0 ? 1 : 0;
			grid[y][x] = HEX[value];
		}
	}
	return grid.map((row) => rowText(row));
}

function createFogRows(): readonly string[] {
	const grid = createGrid('1');
	for (let y = 0; y < TILE_ART_SIZE; y += 1) {
		for (let x = 0; x < TILE_ART_SIZE; x += 1) {
			const value = 1 + ((hashPixel(Math.floor(x / 2), Math.floor(y / 2), 113) + Math.floor(y / 4)) % 5);
			grid[y][x] = HEX[value];
		}
	}
	return grid.map((row) => rowText(row));
}

const TILES = {} as Record<DungeonTileTextureName, PixelTile>;
for (let mask = 0; mask < FLOOR_MASK_COUNT; mask += 1) {
	for (let variant = 0; variant < FLOOR_VARIANT_COUNT; variant += 1) {
		const name = `floor-mask-${String(mask)}-${String(variant)}` as DungeonTileTextureName;
		TILES[name] = { palette: FLOOR_PALETTE, rows: createFloorRows(variant, mask) };
	}
}
TILES['wall-top'] = { palette: WALL_PALETTE, rows: createWallRows(0, false) };
TILES['wall-top-alt'] = { palette: WALL_PALETTE, rows: createWallRows(1, false) };
TILES['wall-face'] = { palette: WALL_PALETTE, rows: createWallRows(0, true) };
TILES['wall-face-alt'] = { palette: WALL_PALETTE, rows: createWallRows(1, true) };
TILES['wall-deep'] = { palette: WALL_PALETTE, rows: createDeepRows() };
TILES.fog = { palette: FOG_PALETTE, rows: createFogRows() };

export function floorTextureName(edgeMask: number, decorSeed: number): DungeonTileTextureName {
	const mask = edgeMask & 0x0f;
	const variant = Math.abs(decorSeed) % FLOOR_VARIANT_COUNT;
	return `floor-mask-${String(mask)}-${String(variant)}` as DungeonTileTextureName;
}

export function pixelTileNames(): DungeonTileTextureName[] {
	return Object.keys(TILES) as DungeonTileTextureName[];
}

export function pixelTile(name: DungeonTileTextureName): PixelTile {
	return TILES[name];
}

/** Validate structural invariants of every authored tile. */
export function validatePixelTiles(): string[] {
	const problems: string[] = [];
	for (const [name, tile] of Object.entries(TILES)) {
		if (tile.rows.length !== TILE_ART_SIZE) {
			problems.push(`${name}: expected ${String(TILE_ART_SIZE)} rows`);
		}
		for (const [rowIndex, row] of tile.rows.entries()) {
			if (row.length !== TILE_ART_SIZE) {
				problems.push(`${name}: row ${String(rowIndex)} has ${String(row.length)} columns`);
			}
			for (const character of row) {
				const index = HEX.indexOf(character);
				if (index < 0 || index >= tile.palette.length) {
					problems.push(`${name}: character '${character}' is outside the palette`);
					break;
				}
			}
		}
	}
	return problems;
}
