import { describe, expect, it } from 'vitest';

import { groundedSpritePlacement } from '#/lib/sprite-grounding';

describe('grounded sprite placement', () => {
	it('places different source frames on the same stage contact point', () => {
		const groundPoint = { x: 0.5, y: 0.9 };
		const tallPlacement = groundedSpritePlacement({
			sourceAnchor: { x: 0.5, y: 1 },
			scale: 1,
			groundPoint,
		});
		const paddedPlacement = groundedSpritePlacement({
			sourceAnchor: { x: 0.52, y: 0.936 },
			scale: 1,
			groundPoint,
		});

		expect(tallPlacement.top + 1).toBeCloseTo(groundPoint.y);
		expect(paddedPlacement.top + 0.936).toBeCloseTo(groundPoint.y);
		expect(tallPlacement.left + 0.5).toBeCloseTo(groundPoint.x);
		expect(paddedPlacement.left + 0.52).toBeCloseTo(groundPoint.x);
	});

	it('keeps a lifted sprite above its grounded shadow', () => {
		const placement = groundedSpritePlacement({
			sourceAnchor: { x: 0.5, y: 1 },
			scale: 1,
			groundPoint: { x: 0.5, y: 0.9 },
			lift: 0.12,
		});

		expect(placement.top + 1).toBeCloseTo(0.78);
	});
});
