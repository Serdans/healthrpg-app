import { describe, expect, it } from 'vitest';

import { getAdjacentMapNodeId, mapDirectionForKey } from '#/lib/map-navigation';

const nodes = [
	{ node: { id: 'current' }, x: 100, y: 100 },
	{ node: { id: 'near-right' }, x: 220, y: 100 },
	{ node: { id: 'far-right' }, x: 420, y: 100 },
	{ node: { id: 'above' }, x: 100, y: 0 },
	{ node: { id: 'below' }, x: 100, y: 220 },
];

describe('map navigation', () => {
	it('maps arrow keys to cardinal directions', () => {
		expect(mapDirectionForKey('ArrowLeft')).toBe('left');
		expect(mapDirectionForKey('ArrowRight')).toBe('right');
		expect(mapDirectionForKey('ArrowUp')).toBe('up');
		expect(mapDirectionForKey('ArrowDown')).toBe('down');
		expect(mapDirectionForKey('Enter')).toBeNull();
	});

	it('chooses the nearest node in the requested direction without wrapping', () => {
		expect(getAdjacentMapNodeId(nodes, 'current', 'right')).toBe('near-right');
		expect(getAdjacentMapNodeId(nodes, 'current', 'up')).toBe('above');
		expect(getAdjacentMapNodeId(nodes, 'current', 'down')).toBe('below');
		expect(getAdjacentMapNodeId(nodes, 'above', 'up')).toBeNull();
		expect(getAdjacentMapNodeId(nodes, 'missing', 'right')).toBeNull();
	});
});
