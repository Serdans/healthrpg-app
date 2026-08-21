import { describe, expect, it } from 'vitest';

import type { PartyMap } from '#/lib/api';
import { landmarkArtForNode } from '#/lib/game-art';
import { createWorldMapLayout, createWorldMapTravel, getWorldMapTravelDirection } from '#/lib/world-map';

function node(id: string, regionNo: number, name = id): PartyMap['nodes'][number] {
	return {
		id,
		chapterNo: 1,
		regionNo,
		name,
		nodeType: 'travel',
		templateKey: 'travel-v1',
		config: null,
	};
}

describe('world map layout', () => {
	it('creates deterministic layers and marks the current branch as next', () => {
		const map: PartyMap = {
			currentChapter: 1,
			currentNodeId: 'current',
			nodes: [node('current', 1), node('north', 2), node('south', 2), node('ruins', 3)],
			edges: [
				{ id: 'edge-north', fromNodeId: 'current', toNodeId: 'north', optionKey: 'north', sortOrder: 0 },
				{ id: 'edge-south', fromNodeId: 'current', toNodeId: 'south', optionKey: 'south', sortOrder: 1 },
				{ id: 'edge-ruins', fromNodeId: 'north', toNodeId: 'ruins', optionKey: 'ruins', sortOrder: 2 },
			],
		};

		const first = createWorldMapLayout(map);
		const second = createWorldMapLayout(map);

		expect(first.layers.map((layer) => layer.regionNo)).toEqual([1, 2, 3]);
		expect(first.nodes.find((item) => item.node.id === 'current')?.state).toBe('current');
		expect(first.nodes.filter((item) => item.state === 'next').map((item) => item.node.id)).toEqual(['north', 'south']);
		expect(first.edges.filter((item) => item.state === 'active')).toHaveLength(2);
		expect(first.nodes.map(({ node: item, x, y }) => [item.id, x, y])).toEqual(second.nodes.map(({ node: item, x, y }) => [item.id, x, y]));
	});

	it('handles a current node in the middle and ignores edges to hidden nodes', () => {
		const map: PartyMap = {
			currentChapter: 1,
			currentNodeId: 'current',
			nodes: [node('past', 1), node('current', 2), node('future', 3)],
			edges: [
				{ id: 'edge-past', fromNodeId: 'past', toNodeId: 'current', optionKey: 'past', sortOrder: 0 },
				{ id: 'edge-future', fromNodeId: 'current', toNodeId: 'future', optionKey: 'future', sortOrder: 1 },
				{ id: 'edge-hidden', fromNodeId: 'current', toNodeId: 'missing', optionKey: 'missing', sortOrder: 2 },
			],
		};

		const layout = createWorldMapLayout(map);

		expect(layout.nodes.find((item) => item.node.id === 'current')?.layerIndex).toBe(1);
		expect(layout.nodes.find((item) => item.node.id === 'future')?.state).toBe('next');
		expect(layout.edges.map((item) => item.edge.id)).toEqual(['edge-past', 'edge-future']);
		expect(layout.edges.every((item) => item.path.startsWith('M '))).toBe(true);
	});

	it('uses vertical space for branches while preserving horizontal chapter progression', () => {
		const map: PartyMap = {
			currentChapter: 1,
			currentNodeId: 'camp',
			nodes: [node('camp', 1), node('high-road', 2), node('low-road', 2), node('grove', 3), node('cavern', 3), node('gate', 4)],
			edges: [
				{ id: 'edge-high', fromNodeId: 'camp', toNodeId: 'high-road', optionKey: 'high-road', sortOrder: 0 },
				{ id: 'edge-low', fromNodeId: 'camp', toNodeId: 'low-road', optionKey: 'low-road', sortOrder: 1 },
				{ id: 'edge-grove', fromNodeId: 'high-road', toNodeId: 'grove', optionKey: 'grove', sortOrder: 0 },
				{ id: 'edge-cavern-high', fromNodeId: 'high-road', toNodeId: 'cavern', optionKey: 'cavern', sortOrder: 1 },
				{ id: 'edge-cavern-low', fromNodeId: 'low-road', toNodeId: 'cavern', optionKey: 'cavern', sortOrder: 0 },
				{ id: 'edge-gate-low', fromNodeId: 'low-road', toNodeId: 'gate', optionKey: 'gate', sortOrder: 1 },
				{ id: 'edge-gate-grove', fromNodeId: 'grove', toNodeId: 'gate', optionKey: 'gate', sortOrder: 2 },
				{ id: 'edge-gate-cavern', fromNodeId: 'cavern', toNodeId: 'gate', optionKey: 'gate', sortOrder: 3 },
			],
		};

		const layout = createWorldMapLayout(map);
		const byId = new Map(layout.nodes.map((item) => [item.node.id, item]));

		expect(layout.layers.map((layer) => layer.regionNo)).toEqual([1, 2, 3, 4]);
		expect(layout.layers.map((layer) => layer.x)).toStrictEqual([86, 306, 526, 746]);
		expect(byId.get('high-road')?.y).toBeLessThan(byId.get('low-road')?.y ?? 0);
		expect(byId.get('grove')?.y).not.toBe(byId.get('cavern')?.y);
		expect(byId.get('camp')?.y).not.toBe(byId.get('gate')?.y);
		expect(new Set(layout.nodes.map((item) => item.y)).size).toBeGreaterThan(3);
		expect(layout.height).toBeGreaterThanOrEqual(440);
		expect(layout.nodes.every((item) => item.x >= 86 && item.x <= layout.width - 86 && item.y >= 96 && item.y <= layout.height - 96)).toBe(
			true,
		);
	});

	it('provides a distinct landmark sprite position for every gameplay node type', () => {
		const nodeTypes: Array<PartyMap['nodes'][number]['nodeType']> = [
			'travel',
			'dungeon',
			'gate',
			'rest',
			'combat',
			'treasure',
			'narrative',
			'village',
		];
		const art = nodeTypes.map((nodeType) => landmarkArtForNode(nodeType));

		expect(new Set(art.map((item) => item.position)).size).toBe(nodeTypes.length);
		expect(art.every((item) => item.fallbackLabel.endsWith('landmark'))).toBe(true);
	});

	it('resolves traveler direction and uses a safe route fallback', () => {
		expect(getWorldMapTravelDirection({ x: 0, y: 0 }, { x: 10, y: 2 })).toBe('east');
		expect(getWorldMapTravelDirection({ x: 10, y: 0 }, { x: 0, y: 2 })).toBe('west');
		expect(getWorldMapTravelDirection({ x: 0, y: 10 }, { x: 2, y: 0 })).toBe('north');
		expect(getWorldMapTravelDirection({ x: 0, y: 0 }, { x: 2, y: 10 })).toBe('south');

		const map: PartyMap = {
			currentChapter: 1,
			currentNodeId: 'from',
			nodes: [node('from', 1), node('to', 2)],
			edges: [{ id: 'route', fromNodeId: 'from', toNodeId: 'to', optionKey: 'to', sortOrder: 0 }],
		};
		const previousLayout = createWorldMapLayout(map);
		const nextLayout = createWorldMapLayout({ ...map, currentNodeId: 'to' });
		const routeTravel = createWorldMapTravel(previousLayout, nextLayout, 'from', 'to');

		expect(routeTravel?.path).toBe(previousLayout.edges[0]?.path);
		expect(routeTravel?.direction).toBe('east');

		const fallbackMap = { ...map, edges: [] };
		const fallbackTravel = createWorldMapTravel(
			createWorldMapLayout(fallbackMap),
			createWorldMapLayout({ ...fallbackMap, currentNodeId: 'to' }),
			'from',
			'to',
		);

		expect(fallbackTravel?.path).toMatch(/^M /);
		expect(createWorldMapTravel(previousLayout, nextLayout, 'missing', 'to')).toBeNull();
	});
});
