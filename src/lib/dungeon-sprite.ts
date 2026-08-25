import { Rectangle, Texture } from 'pixi.js';
import type { Texture as PixiTexture } from 'pixi.js';

export interface AlphaBounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export interface SpriteFrameRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GroundedAnchor {
	x: number;
	y: number;
}

export type DungeonMonsterRole = 'regular' | 'boss';

/** Target visible silhouette footprint for the party leader on the dungeon plane. */
export const DUNGEON_PARTY_VISIBLE_FOOTPRINT = 0.84;

/** Target visible silhouette footprint for monsters in the dungeon plane. */
export const DUNGEON_MONSTER_VISIBLE_FOOTPRINT = {
	regular: 0.86,
	boss: 1,
} as const satisfies Record<DungeonMonsterRole, number>;

/** Finds the visible bounds of a packed frame from RGBA pixel data. */
export function alphaBoundsFromPixels(pixels: Uint8ClampedArray, width: number, height: number): AlphaBounds | null {
	let left = width;
	let top = height;
	let right = -1;
	let bottom = -1;

	for (let row = 0; row < height; row += 1) {
		for (let col = 0; col < width; col += 1) {
			if (pixels[(row * width + col) * 4 + 3] === 0) continue;
			left = Math.min(left, col);
			top = Math.min(top, row);
			right = Math.max(right, col);
			bottom = Math.max(bottom, row);
		}
	}

	return right < 0 ? null : { left, top, right, bottom };
}

export function groundedAnchor(bounds: AlphaBounds | null, frame: SpriteFrameRect): GroundedAnchor {
	if (!bounds) return { x: 0.5, y: 1 };
	return {
		x: 0.5,
		y: Math.min(1, Math.max(0, (bounds.bottom + 1) / frame.height)),
	};
}

export function alphaBoundsSize(bounds: AlphaBounds | null): { width: number; height: number } | null {
	if (!bounds) return null;
	return {
		width: bounds.right - bounds.left + 1,
		height: bounds.bottom - bounds.top + 1,
	};
}

/**
 * Scales a transparent atlas frame by its visible artwork rather than by its
 * source rectangle. Battle sprites use deliberately varied transparent
 * padding, while dungeon actors need a comparable visual footprint.
 */
export function dungeonMonsterScale(
	bounds: AlphaBounds | null,
	frame: SpriteFrameRect,
	tileSize: number,
	role: DungeonMonsterRole = 'regular',
): number {
	const visible = alphaBoundsSize(bounds);
	if (!visible) return (tileSize * 1.18) / frame.width;
	const target = tileSize * DUNGEON_MONSTER_VISIBLE_FOOTPRINT[role];
	return target / Math.max(visible.width, visible.height);
}

/** Scales the dedicated map leader by visible artwork, keeping the feet tile-grounded. */
export function dungeonPartyScale(bounds: AlphaBounds | null, frame: SpriteFrameRect, tileSize: number): number {
	const visible = alphaBoundsSize(bounds);
	if (!visible) return (tileSize * DUNGEON_PARTY_VISIBLE_FOOTPRINT) / frame.width;
	return (tileSize * DUNGEON_PARTY_VISIBLE_FOOTPRINT) / Math.max(visible.width, visible.height);
}

export function dungeonMonsterVisibleSize(
	bounds: AlphaBounds | null,
	scale: number,
	frame: SpriteFrameRect,
): { width: number; height: number } {
	const visible = alphaBoundsSize(bounds);
	if (!visible) return { width: frame.width * scale, height: frame.height * scale };
	return { width: visible.width * scale, height: visible.height * scale };
}

export function dungeonMonsterShadowWidth(visibleWidth: number, tileSize: number): number {
	return Math.min(tileSize * 0.48, Math.max(tileSize * 0.22, visibleWidth * 0.52));
}

/**
 * Creates a frame view over a loaded sheet and anchors it to the bottom of
 * the visible artwork rather than the transparent source rectangle.
 */
export function createGroundedFrameTexture(sheet: PixiTexture, frame: SpriteFrameRect, label: string, alpha: AlphaBounds | null): Texture {
	return new Texture({
		source: sheet.source,
		frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
		orig: new Rectangle(0, 0, frame.width, frame.height),
		defaultAnchor: groundedAnchor(alpha, frame),
		label,
	});
}

/** Reads one frame's alpha channel once during asset preparation. */
export function readFrameAlphaBounds(sheet: PixiTexture, frame: SpriteFrameRect): AlphaBounds | null {
	if (typeof document === 'undefined') return null;
	const canvas = document.createElement('canvas');
	canvas.width = frame.width;
	canvas.height = frame.height;
	const context = canvas.getContext('2d', { willReadFrequently: true });
	const resource = sheet.source.resource as unknown as CanvasImageSource;
	if (!context) return null;
	context.drawImage(resource, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
	return alphaBoundsFromPixels(context.getImageData(0, 0, frame.width, frame.height).data, frame.width, frame.height);
}
