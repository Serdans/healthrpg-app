/**
 * Deterministic 24×24 transparent pixel-art props for the dungeon floor.
 *
 * These are kept separate from the opaque terrain chunks so object silhouettes
 * can sit over the floor without carrying a rectangular background with them.
 */

export const DUNGEON_PROP_ART_SIZE = 24;

export const DUNGEON_PROP_TEXTURE_NAMES = [
	'treasure-chest',
	'stairs-down',
	'stairs-up',
	'objective-beacon',
	'entry-gate',
	// Kept in the atlas for old cached maps; new dungeon rendering does not use it.
	'exit-gate',
	'rest-camp',
	'combat-rune',
	'boss-rune',
] as const;

export type DungeonPropTextureName = (typeof DUNGEON_PROP_TEXTURE_NAMES)[number];

export interface PixelProp {
	readonly palette: readonly string[];
	readonly rows: readonly string[];
}

type PixelGrid = string[][];

const PROP_PALETTE = [
	'#071017',
	'#10202b',
	'#1b3440',
	'#3d5558',
	'#6e7d73',
	'#8e987b',
	'#6b411f',
	'#a66a2d',
	'#d19b42',
	'#f3c962',
	'#ffe9a0',
	'#164352',
	'#2b7180',
	'#4bb5ad',
	'#8be0c3',
	'#d8fff0',
] as const;

function createGrid(): PixelGrid {
	return Array.from({ length: DUNGEON_PROP_ART_SIZE }, () => Array.from({ length: DUNGEON_PROP_ART_SIZE }, () => '.'));
}

function setPixel(grid: PixelGrid, x: number, y: number, value: string): void {
	if (x < 0 || y < 0 || x >= DUNGEON_PROP_ART_SIZE || y >= DUNGEON_PROP_ART_SIZE) return;
	grid[y][x] = value;
}

function fillRect(grid: PixelGrid, x: number, y: number, width: number, height: number, value: string): void {
	for (let row = y; row < y + height; row += 1) {
		for (let column = x; column < x + width; column += 1) setPixel(grid, column, row, value);
	}
}

function rows(grid: PixelGrid): readonly string[] {
	return grid.map((row) => row.join(''));
}

function treasureChest(): PixelProp {
	const grid = createGrid();
	// Ground shadow.
	fillRect(grid, 5, 19, 14, 1, '0');
	fillRect(grid, 7, 20, 10, 1, '1');

	// Dark silhouette and stepped lid.
	fillRect(grid, 6, 7, 12, 1, '0');
	fillRect(grid, 4, 8, 16, 4, '0');
	fillRect(grid, 3, 10, 18, 3, '0');
	fillRect(grid, 4, 12, 16, 7, '0');
	fillRect(grid, 6, 19, 12, 1, '0');

	// Warm wooden lid and body.
	fillRect(grid, 7, 8, 10, 1, '6');
	fillRect(grid, 5, 9, 14, 2, '7');
	fillRect(grid, 5, 11, 14, 1, '8');
	fillRect(grid, 6, 12, 12, 1, '9');
	fillRect(grid, 5, 13, 14, 5, '7');
	fillRect(grid, 6, 14, 12, 4, '8');
	fillRect(grid, 7, 15, 10, 3, '7');

	// Metal bands, latch, and warm highlights.
	fillRect(grid, 11, 11, 2, 8, '9');
	fillRect(grid, 11, 13, 2, 3, '0');
	fillRect(grid, 11, 14, 2, 1, 'a');
	fillRect(grid, 5, 12, 14, 1, '9');
	setPixel(grid, 7, 9, 'a');
	setPixel(grid, 8, 9, 'b');
	setPixel(grid, 6, 10, '9');
	setPixel(grid, 17, 10, '6');
	setPixel(grid, 7, 16, '9');
	setPixel(grid, 16, 16, '6');
	setPixel(grid, 18, 7, 'b');
	setPixel(grid, 19, 6, '8');
	setPixel(grid, 18, 5, '9');

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

function stairs(direction: 'up' | 'down'): PixelProp {
	const grid = createGrid();
	const edge = direction === 'down' ? '8' : 'c';
	const highlight = direction === 'down' ? 'a' : 'e';
	const shade = direction === 'down' ? '6' : 'b';

	// A deep stone well gives the marker a readable silhouette at a glance.
	fillRect(grid, 4, 20, 16, 1, '0');
	fillRect(grid, 3, 8, 18, 12, '0');
	fillRect(grid, 5, 6, 14, 2, '3');
	fillRect(grid, 4, 8, 16, 2, '4');
	fillRect(grid, 5, 10, 14, 9, '1');
	fillRect(grid, 7, 9, 10, 2, '2');
	fillRect(grid, 6, 18, 12, 2, '3');

	// Down stairs widen toward the viewer; up stairs widen toward the far end.
	const stepRows = direction === 'down' ? [10, 12, 14, 16, 18] : [18, 16, 14, 12, 10];
	const stepWidths = [8, 10, 12, 14, 16];
	for (const [index, row] of stepRows.entries()) {
		const width = stepWidths[index] ?? 8;
		fillRect(grid, 12 - Math.floor(width / 2), row, width, 1, index % 2 === 0 ? shade : edge);
	}
	fillRect(grid, 5, 19, 14, 1, '4');
	// Directional chevron: geometry carries meaning even without the color.
	if (direction === 'down') {
		fillRect(grid, 11, 10, 2, 5, highlight);
		fillRect(grid, 9, 14, 6, 2, highlight);
		setPixel(grid, 10, 11, highlight);
		setPixel(grid, 11, 12, highlight);
		setPixel(grid, 12, 13, highlight);
		setPixel(grid, 13, 12, highlight);
		setPixel(grid, 14, 11, highlight);
	} else {
		fillRect(grid, 11, 13, 2, 5, highlight);
		fillRect(grid, 9, 11, 6, 2, highlight);
		setPixel(grid, 10, 17, highlight);
		setPixel(grid, 11, 16, highlight);
		setPixel(grid, 12, 15, highlight);
		setPixel(grid, 13, 16, highlight);
		setPixel(grid, 14, 17, highlight);
	}

	// Stone edge pixels and a small directional glint.
	setPixel(grid, 5, 7, '5');
	setPixel(grid, 18, 7, '5');
	setPixel(grid, 4, 10, '5');
	setPixel(grid, 19, 10, '5');
	setPixel(grid, 6, 13, highlight);
	setPixel(grid, 17, 15, highlight);
	setPixel(grid, 18, 5, highlight);
	setPixel(grid, 19, 4, edge);

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

function objectiveBeacon(): PixelProp {
	const grid = createGrid();
	// Ground shadow, plinth, and a tall waystone silhouette.
	fillRect(grid, 6, 21, 12, 1, '0');
	fillRect(grid, 7, 19, 10, 2, '1');
	fillRect(grid, 9, 17, 6, 2, '2');
	fillRect(grid, 11, 5, 2, 14, '0');
	fillRect(grid, 8, 5, 6, 2, '0');
	fillRect(grid, 7, 7, 8, 5, '0');
	fillRect(grid, 8, 12, 7, 5, '0');

	// Gold flag and teal beacon: the flag reads as an objective marker rather
	// than an interchangeable decorative crystal.
	fillRect(grid, 12, 6, 1, 12, '8');
	fillRect(grid, 13, 6, 5, 1, '9');
	fillRect(grid, 14, 7, 4, 3, 'a');
	setPixel(grid, 14, 8, 'b');
	setPixel(grid, 17, 7, 'a');
	fillRect(grid, 9, 7, 5, 3, 'c');
	fillRect(grid, 8, 10, 6, 5, 'd');
	fillRect(grid, 9, 15, 5, 2, 'c');
	setPixel(grid, 10, 8, 'f');
	setPixel(grid, 9, 10, 'e');
	setPixel(grid, 10, 11, 'f');
	setPixel(grid, 12, 13, 'e');
	setPixel(grid, 13, 15, 'b');

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

function gate(accent: 'entry' | 'exit'): PixelProp {
	const grid = createGrid();
	const frame = accent === 'entry' ? '3' : '6';
	const edge = accent === 'entry' ? '4' : '8';
	const light = accent === 'entry' ? 'd' : 'a';

	fillRect(grid, 5, 19, 14, 1, '0');
	fillRect(grid, 7, 20, 10, 1, '1');
	fillRect(grid, 5, 8, 14, 11, '0');
	fillRect(grid, 7, 6, 10, 2, '0');
	fillRect(grid, 9, 5, 6, 1, '0');
	fillRect(grid, 6, 8, 3, 11, frame);
	fillRect(grid, 15, 8, 3, 11, frame);
	fillRect(grid, 8, 7, 8, 2, edge);
	fillRect(grid, 9, 6, 6, 1, edge);
	fillRect(grid, 8, 9, 8, 2, '1');
	fillRect(grid, 9, 11, 6, 7, accent === 'entry' ? 'b' : '7');
	fillRect(grid, 10, 12, 4, 6, '0');
	fillRect(grid, 7, 10, 1, 7, light);
	fillRect(grid, 16, 10, 1, 7, accent === 'entry' ? 'c' : '9');
	setPixel(grid, 9, 7, light);
	setPixel(grid, 14, 7, light);
	setPixel(grid, 8, 18, edge);
	setPixel(grid, 15, 18, edge);

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

function restCamp(): PixelProp {
	const grid = createGrid();
	// Bedroll / shelter silhouette on the right.
	fillRect(grid, 12, 15, 7, 5, '0');
	fillRect(grid, 13, 16, 5, 3, '3');
	fillRect(grid, 14, 16, 3, 1, 'b');
	fillRect(grid, 5, 20, 14, 1, '0');
	fillRect(grid, 7, 19, 11, 1, '1');
	// Campfire stones and a three-stage flame.
	setPixel(grid, 6, 18, '4');
	setPixel(grid, 8, 18, '4');
	setPixel(grid, 10, 18, '4');
	fillRect(grid, 7, 17, 3, 2, '0');
	setPixel(grid, 7, 16, '8');
	setPixel(grid, 9, 16, '8');
	fillRect(grid, 8, 12, 2, 4, '8');
	setPixel(grid, 7, 14, 'a');
	setPixel(grid, 9, 14, '9');
	setPixel(grid, 8, 11, 'a');
	setPixel(grid, 8, 13, 'b');
	setPixel(grid, 8, 12, 'f');

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

function rune(role: 'combat' | 'boss'): PixelProp {
	const grid = createGrid();
	const accent = role === 'combat' ? '8' : 'c';
	const highlight = role === 'combat' ? 'a' : 'e';
	const core = role === 'combat' ? '7' : 'b';

	fillRect(grid, 7, 19, 10, 1, '0');
	setPixel(grid, 11, 5, accent);
	setPixel(grid, 12, 5, highlight);
	setPixel(grid, 10, 7, accent);
	setPixel(grid, 13, 7, accent);
	setPixel(grid, 9, 9, accent);
	setPixel(grid, 14, 9, accent);
	setPixel(grid, 8, 11, accent);
	setPixel(grid, 15, 11, accent);
	setPixel(grid, 9, 14, accent);
	setPixel(grid, 14, 14, accent);
	setPixel(grid, 10, 16, accent);
	setPixel(grid, 13, 16, accent);
	setPixel(grid, 11, 18, accent);
	setPixel(grid, 12, 18, accent);
	fillRect(grid, 11, 10, 2, 6, core);
	fillRect(grid, 9, 12, 6, 2, core);
	setPixel(grid, 11, 11, highlight);
	setPixel(grid, 12, 13, highlight);

	return { palette: PROP_PALETTE, rows: rows(grid) };
}

const PROPS: Readonly<Record<DungeonPropTextureName, PixelProp>> = {
	'treasure-chest': treasureChest(),
	'stairs-down': stairs('down'),
	'stairs-up': stairs('up'),
	'objective-beacon': objectiveBeacon(),
	'entry-gate': gate('entry'),
	'exit-gate': gate('exit'),
	'rest-camp': restCamp(),
	'combat-rune': rune('combat'),
	'boss-rune': rune('boss'),
};

export function dungeonPropTextureNames(): DungeonPropTextureName[] {
	return [...DUNGEON_PROP_TEXTURE_NAMES];
}

export function pixelProp(name: DungeonPropTextureName): PixelProp {
	return PROPS[name];
}

export function validatePixelProps(): string[] {
	const problems: string[] = [];
	for (const [name, prop] of Object.entries(PROPS)) {
		if (prop.rows.length !== DUNGEON_PROP_ART_SIZE) problems.push(`${name}: expected ${String(DUNGEON_PROP_ART_SIZE)} rows`);
		for (const [rowIndex, row] of prop.rows.entries()) {
			if (row.length !== DUNGEON_PROP_ART_SIZE) problems.push(`${name}: row ${String(rowIndex)} has ${String(row.length)} columns`);
			for (const character of row) {
				if (character === '.') continue;
				const index = Number.parseInt(character, 16);
				if (!Number.isInteger(index) || index < 0 || index >= prop.palette.length) {
					problems.push(`${name}: character '${character}' is outside the palette`);
					break;
				}
			}
		}
		if (!prop.rows.some((row) => row.includes('.'))) problems.push(`${name}: expected transparent pixels`);
		if (!prop.rows.some((row) => /[0-9a-f]/.test(row))) problems.push(`${name}: expected visible pixels`);
	}
	return problems;
}

export const DUNGEON_PROP_TEXTURE_COUNT = DUNGEON_PROP_TEXTURE_NAMES.length;
