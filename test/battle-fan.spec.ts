import { describe, expect, it } from 'vitest';

import { centeredFanPosition } from '#/lib/battle-fan';

describe('centeredFanPosition', () => {
	it('keeps a multi-card fan centered and symmetrical', () => {
		const positions = Array.from({ length: 5 }, (_, index) => centeredFanPosition(index, 5, 10, 1.2, 0.8));

		expect(positions[2]).toMatchObject({ centeredIndex: 0, rotation: 0, offset: 0, drop: 0 });
		expect(positions[0]?.offset).toBe(-positions[4]?.offset);
		expect(positions[0]?.rotation).toBe(-positions[4]?.rotation);
		expect(positions[0]?.drop).toBe(positions[4]?.drop);
		expect(positions[1]?.drop).toBe(positions[3]?.drop);
		expect(positions[0]?.drop).toBeGreaterThan(positions[2]?.drop ?? 0);
	});

	it('does not rotate or drop a single card', () => {
		expect(centeredFanPosition(0, 1, 10, 1.2, 0.8)).toEqual({
			centeredIndex: 0,
			rotation: 0,
			offset: 0,
			drop: 0,
		});
	});
});
