import { describe, expect, it } from 'vitest';

import { dungeonPartyScale, dungeonMonsterScale, dungeonMonsterShadowWidth, dungeonMonsterVisibleSize } from '#/lib/dungeon-sprite';
import { alphaBoundsFromPixels, groundedAnchor } from '#/lib/sprite-grounding';

function pixels(width: number, opaque: Array<[number, number]>): Uint8ClampedArray {
	const result = new Uint8ClampedArray(width * 4 * 4);
	for (const [x, y] of opaque) result[(y * width + x) * 4 + 3] = 255;
	return result;
}

describe('grounded dungeon sprites', () => {
	it('finds the visible alpha bounds inside a transparent frame', () => {
		expect(
			alphaBoundsFromPixels(
				pixels(4, [
					[1, 1],
					[2, 3],
				]),
				4,
				4,
			),
		).toEqual({ left: 1, top: 1, right: 2, bottom: 3 });
	});

	it('anchors the sprite feet to the actor ground point', () => {
		expect(groundedAnchor({ left: 1, top: 1, right: 2, bottom: 2 }, { x: 0, y: 0, width: 4, height: 4 })).toEqual({ x: 0.5, y: 0.75 });
		expect(groundedAnchor(null, { x: 0, y: 0, width: 4, height: 4 })).toEqual({ x: 0.5, y: 1 });
	});

	it('normalizes visible monster art instead of transparent atlas padding', () => {
		const frame = { x: 0, y: 0, width: 512, height: 512 };
		const slime = { left: 80, top: 160, right: 217, bottom: 256 };
		const sentinel = { left: 120, top: 40, right: 396, bottom: 443 };
		const slimeScale = dungeonMonsterScale(slime, frame, 48);
		const sentinelScale = dungeonMonsterScale(sentinel, frame, 48, 'boss');

		expect(dungeonMonsterVisibleSize(slime, slimeScale, frame).width).toBeCloseTo(41.28);
		expect(dungeonMonsterVisibleSize(sentinel, sentinelScale, frame).height).toBe(48);
		expect(slimeScale).toBeGreaterThan(sentinelScale);
		expect(dungeonMonsterShadowWidth(41.28, 48)).toBeCloseTo(21.4656);
	});

	it('keeps the dedicated map leader below one tile while preserving the visible footprint', () => {
		const frame = { x: 0, y: 0, width: 512, height: 384 };
		const bounds = { left: 70, top: 40, right: 430, bottom: 350 };

		expect(dungeonPartyScale(bounds, frame, 48) * (bounds.right - bounds.left + 1)).toBeCloseTo(40.32);
	});
});
