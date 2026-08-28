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

/** A normalized point inside a sprite frame or grounded stage. */
export interface GroundedAnchor {
	x: number;
	y: number;
}

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
