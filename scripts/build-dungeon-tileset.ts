/**
 * Bakes the code-authored dungeon pixel maps into a single sprite strip.
 *
 * Source of truth: the deterministic 24×24 maps in `src/lib/dungeon-tiles.ts`.
 * Output: `src/assets/game/tiles/dungeon-tileset.png` (one 24px chunk per
 * manifest entry,
 * appended left-to-right), consumed by the PixiJS dungeon renderer.
 *
 * ImageMagick assembles the strip and encodes the PNG; this script only writes
 * raw PPM bytes for each tile (ImageMagick reads PPM natively).
 *
 * Usage: pnpm tsx scripts/build-dungeon-tileset.ts
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { TILE_ART_SIZE, pixelTileNames, pixelTile } from '../src/lib/dungeon-tiles';
import type { DungeonTileTextureName } from '../src/lib/dungeon-tiles';

const exec = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE = resolve(__dirname, '..');
const OUTPUT = join(ROUTE, 'src', 'assets', 'game', 'tiles', 'dungeon-tileset.png');
const TMP_DIR = join(ROUTE, 'node_modules', '.cache', 'dungeon-tiles');

const HEX = '0123456789abcdef';

function renderPpm(name: DungeonTileTextureName): string {
	const tile = pixelTile(name);
	const size = TILE_ART_SIZE;
	const header = `P6\n${String(size)} ${String(size)}\n255\n`;
	const bytes: number[] = [];
	for (const row of tile.rows) {
		for (const ch of row) {
			if (ch === '.') {
				bytes.push(0, 0, 0, 0);
			} else {
				const index = HEX.indexOf(ch);
				const hexColor = index >= 0 ? tile.palette[index] : undefined;
				if (!hexColor || hexColor === 'transparent') {
					bytes.push(0, 0, 0);
				} else {
					bytes.push(
						Number.parseInt(hexColor.slice(1, 3), 16),
						Number.parseInt(hexColor.slice(3, 5), 16),
						Number.parseInt(hexColor.slice(5, 7), 16),
					);
				}
			}
		}
	}
	return header + Buffer.from(bytes.map((byte) => byte & 0xff)).toString('binary');
}

async function main(): Promise<void> {
	const names = pixelTileNames();
	if (names.length === 0) throw new Error('No tiles exported');

	await mkdir(TMP_DIR, { recursive: true });

	// Write one PPM per tile for ImageMagick to append.
	const ppmPaths: string[] = [];
	for (const name of names) {
		const path = join(TMP_DIR, `${name}.ppm`);
		await writeFile(path, renderPpm(name), 'binary');
		ppmPaths.push(path);
	}

	// Append left-to-right into a single strip and encode as PNG.
	await exec('magick', [...ppmPaths, '+append', OUTPUT]);
	await exec('magick', ['identify', OUTPUT]);

	// Sanity: report the output size so a regression is loud.
	const image = await readFile(OUTPUT);
	console.log(`Built dungeon tileset: ${names.length} tiles @ ${String(TILE_ART_SIZE)}px → ${OUTPUT} (${image.length} bytes)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
