/**
 * Bakes the code-authored transparent dungeon props into a sprite strip.
 *
 * Source of truth: `src/lib/dungeon-props.ts`.
 * Output: `src/assets/game/tiles/dungeon-props.png`.
 *
 * PAM is used for the temporary files because it preserves RGBA pixels before
 * ImageMagick appends the 24px frames into one PNG atlas.
 *
 * Usage: pnpm tsx scripts/build-dungeon-props.ts
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DUNGEON_PROP_ART_SIZE, dungeonPropTextureNames, pixelProp } from '../src/lib/dungeon-props';
import type { DungeonPropTextureName } from '../src/lib/dungeon-props';

const exec = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTE = resolve(__dirname, '..');
const OUTPUT = join(ROUTE, 'src', 'assets', 'game', 'tiles', 'dungeon-props.png');
const TMP_DIR = join(ROUTE, 'node_modules', '.cache', 'dungeon-props');

function renderPam(name: DungeonPropTextureName): Buffer {
	const prop = pixelProp(name);
	const header = [
		'P7',
		`WIDTH ${String(DUNGEON_PROP_ART_SIZE)}`,
		`HEIGHT ${String(DUNGEON_PROP_ART_SIZE)}`,
		'DEPTH 4',
		'MAXVAL 255',
		'TUPLTYPE RGB_ALPHA',
		'ENDHDR',
		'',
	].join('\n');
	const bytes: number[] = [];
	for (const row of prop.rows) {
		for (const character of row) {
			if (character === '.') {
				bytes.push(0, 0, 0, 0);
				continue;
			}
			const color = prop.palette[Number.parseInt(character, 16)];
			if (!color) throw new Error(`${name}: missing palette color for '${character}'`);
			bytes.push(
				Number.parseInt(color.slice(1, 3), 16),
				Number.parseInt(color.slice(3, 5), 16),
				Number.parseInt(color.slice(5, 7), 16),
				255,
			);
		}
	}
	return Buffer.concat([Buffer.from(header, 'ascii'), Buffer.from(bytes)]);
}

async function main(): Promise<void> {
	const names = dungeonPropTextureNames();
	if (names.length === 0) throw new Error('No dungeon props exported');

	await mkdir(TMP_DIR, { recursive: true });
	const pamPaths: string[] = [];
	for (const name of names) {
		const path = join(TMP_DIR, `${name}.pam`);
		await writeFile(path, renderPam(name));
		pamPaths.push(path);
	}

	await exec('magick', [...pamPaths, '+append', OUTPUT]);
	await exec('magick', ['identify', OUTPUT]);

	const image = await readFile(OUTPUT);
	console.log(
		`Built dungeon props: ${String(names.length)} sprites @ ${String(DUNGEON_PROP_ART_SIZE)}px → ${OUTPUT} (${image.length} bytes)`,
	);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
