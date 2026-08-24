import { describe, expect, it } from 'vitest';

import type { PartyMap } from '#/lib/api';
import { landmarkArtForNode } from '#/lib/game-art';
import { createInteriorMapLayout, createInteriorMapTravel } from '#/lib/interior-map';
import type { InteriorMapLayout } from '#/lib/interior-map';
import { createWorldMapLayout, createWorldMapTravel, getWorldMapTravelDirection } from '#/lib/world-map';

type TestNode = Omit<PartyMap['nodes'][number], 'mapMetadata'>;
type TestMap = Omit<
	PartyMap,
	'currentMap' | 'enterableLocation' | 'nodes' | 'objectives' | 'completedObjectiveIds' | 'tileBalance' | 'navigation'
> & {
	nodes: TestNode[];
};

function withMapDefaults(value: TestMap): PartyMap {
	return {
		...value,
		currentMap: {
			id: 'overworld',
			mapType: 'overworld',
			name: 'The Atlas',
			templateKey: 'overworld-v1',
			parentNodeId: null,
			entryNodeId: value.nodes[0]?.id ?? value.currentNodeId,
		},
		enterableLocation: null,
		objectives: [],
		completedObjectiveIds: [],
		tileBalance: 12,
		navigation: null,
		nodes: value.nodes.map((item, index) => ({
			...item,
			discovered: true,
			mapMetadata: {
				mapId: 'overworld',
				nodeId: item.id,
				floorNo: 0,
				role: 'overworld',
				sortOrder: index,
				isEntry: index === 0,
				isExit: false,
				tileX: null,
				tileY: null,
				spawnArchetype: null,
			},
		})),
	};
}

function node(id: string, regionNo: number, name = id): TestNode {
	return {
		discovered: true,
		id,
		chapterNo: 1,
		regionNo,
		name,
		nodeType: 'travel',
		templateKey: 'travel-v1',
		config: null,
	};
}

function interiorNode(
	id: string,
	name: string,
	role: PartyMap['nodes'][number]['mapMetadata']['role'],
	floorNo: number,
	sortOrder: number,
	nodeType: PartyMap['nodes'][number]['nodeType'] = 'travel',
): PartyMap['nodes'][number] {
	return {
		id,
		chapterNo: 1,
		regionNo: 1,
		name,
		nodeType,
		templateKey: `${role}-v1`,
		config: null,
		mapMetadata: {
			mapId: 'interior',
			nodeId: id,
			floorNo,
			role,
			sortOrder,
			isEntry: role === 'entrance',
			isExit: role === 'exit',
			tileX: null,
			tileY: null,
			spawnArchetype: null,
		},
		discovered: true,
	};
}

function interiorMap(mapType: 'village' | 'dungeon', currentNodeId: string, nodes: PartyMap['nodes'], edges: PartyMap['edges']): PartyMap {
	return {
		currentChapter: 1,
		currentNodeId,
		currentMap: {
			id: `map-${mapType}`,
			mapType,
			name: mapType === 'dungeon' ? 'First Ruins' : "Wayfarer's Rest",
			templateKey: `${mapType}-v1`,
			parentNodeId: 'overworld-landmark',
			entryNodeId: nodes[0]?.id ?? currentNodeId,
		},
		enterableLocation: null,
		nodes,
		edges,
		objectives: [],
		completedObjectiveIds: [],
		tileBalance: 12,
		navigation: null,
	};
}

function expectNodesInsideFloors(layout: InteriorMapLayout) {
	const nodeHalfWidth = 78;
	const nodeHalfHeight = 48;
	const visualInset = 18;

	for (const item of layout.nodes) {
		const floor = layout.floors.find((candidate) => candidate.floorNo === item.floorNo);
		if (!floor) throw new Error(`Missing floor ${item.floorNo} for ${item.node.id}`);

		expect(item.x - nodeHalfWidth).toBeGreaterThanOrEqual(floor.x + visualInset);
		expect(item.x + nodeHalfWidth).toBeLessThanOrEqual(floor.x + floor.width - visualInset);
		expect(item.y - nodeHalfHeight).toBeGreaterThanOrEqual(floor.y + visualInset);
		expect(item.y + nodeHalfHeight).toBeLessThanOrEqual(floor.y + floor.height - visualInset);
	}
}

describe('world map layout', () => {
	it('creates deterministic layers and marks the current branch as next', () => {
		const map = withMapDefaults({
			currentChapter: 1,
			currentNodeId: 'current',
			nodes: [node('current', 1), node('north', 2), node('south', 2), node('ruins', 3)],
			edges: [
				{ id: 'edge-north', fromNodeId: 'current', toNodeId: 'north', optionKey: 'north', sortOrder: 0 },
				{ id: 'edge-south', fromNodeId: 'current', toNodeId: 'south', optionKey: 'south', sortOrder: 1 },
				{ id: 'edge-ruins', fromNodeId: 'north', toNodeId: 'ruins', optionKey: 'ruins', sortOrder: 2 },
			],
		});

		const first = createWorldMapLayout(map);
		const second = createWorldMapLayout(map);

		expect(first.layers.map((layer) => layer.regionNo)).toEqual([1, 2, 3]);
		expect(first.nodes.find((item) => item.node.id === 'current')?.state).toBe('current');
		expect(first.nodes.filter((item) => item.state === 'next').map((item) => item.node.id)).toEqual(['north', 'south']);
		expect(first.edges.filter((item) => item.state === 'active')).toHaveLength(2);
		expect(first.nodes.map(({ node: item, x, y }) => [item.id, x, y])).toEqual(second.nodes.map(({ node: item, x, y }) => [item.id, x, y]));
	});

	it('handles a current node in the middle and ignores edges to hidden nodes', () => {
		const map = withMapDefaults({
			currentChapter: 1,
			currentNodeId: 'current',
			nodes: [node('past', 1), node('current', 2), node('future', 3)],
			edges: [
				{ id: 'edge-past', fromNodeId: 'past', toNodeId: 'current', optionKey: 'past', sortOrder: 0 },
				{ id: 'edge-future', fromNodeId: 'current', toNodeId: 'future', optionKey: 'future', sortOrder: 1 },
				{ id: 'edge-hidden', fromNodeId: 'current', toNodeId: 'missing', optionKey: 'missing', sortOrder: 2 },
			],
		});

		const layout = createWorldMapLayout(map);

		expect(layout.nodes.find((item) => item.node.id === 'current')?.layerIndex).toBe(1);
		expect(layout.nodes.find((item) => item.node.id === 'future')?.state).toBe('next');
		expect(layout.edges.map((item) => item.edge.id)).toEqual(['edge-past', 'edge-future']);
		expect(layout.edges.every((item) => item.path.startsWith('M '))).toBe(true);
	});

	it('uses vertical space for branches while preserving horizontal chapter progression', () => {
		const map = withMapDefaults({
			currentChapter: 1,
			currentNodeId: 'camp',
			nodes: [node('camp', 1), node('high-road', 2), node('low-road', 2), node('grove', 3), node('cavern', 3), node('challenge', 4)],
			edges: [
				{ id: 'edge-high', fromNodeId: 'camp', toNodeId: 'high-road', optionKey: 'high-road', sortOrder: 0 },
				{ id: 'edge-low', fromNodeId: 'camp', toNodeId: 'low-road', optionKey: 'low-road', sortOrder: 1 },
				{ id: 'edge-grove', fromNodeId: 'high-road', toNodeId: 'grove', optionKey: 'grove', sortOrder: 0 },
				{ id: 'edge-cavern-high', fromNodeId: 'high-road', toNodeId: 'cavern', optionKey: 'cavern', sortOrder: 1 },
				{ id: 'edge-cavern-low', fromNodeId: 'low-road', toNodeId: 'cavern', optionKey: 'cavern', sortOrder: 0 },
				{ id: 'edge-challenge-low', fromNodeId: 'low-road', toNodeId: 'challenge', optionKey: 'challenge', sortOrder: 1 },
				{ id: 'edge-challenge-grove', fromNodeId: 'grove', toNodeId: 'challenge', optionKey: 'challenge', sortOrder: 2 },
				{ id: 'edge-challenge-cavern', fromNodeId: 'cavern', toNodeId: 'challenge', optionKey: 'challenge', sortOrder: 3 },
			],
		});

		const layout = createWorldMapLayout(map);
		const byId = new Map(layout.nodes.map((item) => [item.node.id, item]));

		expect(layout.layers.map((layer) => layer.regionNo)).toEqual([1, 2, 3, 4]);
		expect(layout.layers.map((layer) => layer.x)).toStrictEqual([86, 306, 526, 746]);
		expect(byId.get('high-road')?.y).toBeLessThan(byId.get('low-road')?.y ?? 0);
		expect(byId.get('grove')?.y).not.toBe(byId.get('cavern')?.y);
		expect(byId.get('camp')?.y).not.toBe(byId.get('challenge')?.y);
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
			'challenge',
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

		const map = withMapDefaults({
			currentChapter: 1,
			currentNodeId: 'from',
			nodes: [node('from', 1), node('to', 2)],
			edges: [{ id: 'route', fromNodeId: 'from', toNodeId: 'to', optionKey: 'to', sortOrder: 0 }],
		});
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

describe('interior map layout', () => {
	it('stacks dungeon floors and keeps branch positions deterministic', () => {
		const map = interiorMap(
			'dungeon',
			'dungeon-puzzle',
			[
				interiorNode('dungeon-entry', 'Fallen Gate', 'entrance', 0, 0),
				interiorNode('dungeon-puzzle', 'Turning Stones', 'puzzle', 1, 0, 'narrative'),
				interiorNode('dungeon-treasure', 'Sealed Reliquary', 'treasure', 1, 1, 'treasure'),
				interiorNode('dungeon-combat', 'Mossbound Guard', 'combat', 2, 0, 'combat'),
			],
			[
				{ id: 'edge-puzzle', fromNodeId: 'dungeon-entry', toNodeId: 'dungeon-puzzle', optionKey: 'turning-stones', sortOrder: 0 },
				{ id: 'edge-treasure', fromNodeId: 'dungeon-puzzle', toNodeId: 'dungeon-treasure', optionKey: 'reliquary', sortOrder: 1 },
				{ id: 'edge-combat', fromNodeId: 'dungeon-puzzle', toNodeId: 'dungeon-combat', optionKey: 'mossbound-guard', sortOrder: 2 },
			],
		);

		const first = createInteriorMapLayout(map);
		const second = createInteriorMapLayout(map);
		const byId = new Map(first.nodes.map((item) => [item.node.id, item]));

		expect(first.floors.map((floor) => floor.floorNo)).toEqual([0, 1, 2]);
		expect(byId.get('dungeon-entry')?.y).toBeLessThan(byId.get('dungeon-puzzle')?.y ?? 0);
		expect(byId.get('dungeon-puzzle')?.x).not.toBe(byId.get('dungeon-treasure')?.x);
		expect(byId.get('dungeon-puzzle')?.state).toBe('current');
		expect(byId.get('dungeon-treasure')?.state).toBe('next');
		expect(byId.get('dungeon-combat')?.state).toBe('next');
		expect(first.edges.filter((edge) => edge.state === 'active')).toHaveLength(2);
		expect(first.nodes.map(({ node: item, x, y }) => [item.id, x, y])).toEqual(second.nodes.map(({ node: item, x, y }) => [item.id, x, y]));
		expectNodesInsideFloors(first);

		const nextLayout = createInteriorMapLayout({ ...map, currentNodeId: 'dungeon-combat' });
		const travel = createInteriorMapTravel(first, nextLayout, 'dungeon-puzzle', 'dungeon-combat');
		expect(travel?.direction).toBe('south');
		expect(travel?.path).toBe(first.edges.find((edge) => edge.edge.id === 'edge-combat')?.path);

		const wideLayout = createInteriorMapLayout(
			interiorMap(
				'dungeon',
				'wide-0',
				Array.from({ length: 7 }, (_, index) =>
					interiorNode(`wide-${index}`, `Room ${index + 1}`, index === 0 ? 'entrance' : 'room', 0, index),
				),
				[],
			),
		);
		expect(wideLayout.width).toBeGreaterThan(1160);
		expectNodesInsideFloors(wideLayout);
	});

	it('places village rooms around a central hub', () => {
		const map = interiorMap(
			'village',
			'village-hub',
			[
				interiorNode('village-hub', 'Lantern Square', 'hub', 0, 0, 'village'),
				interiorNode('village-shop', 'Copperleaf Shop', 'shop', 0, 1),
				interiorNode('village-rest', 'Wayfarer Lodge', 'rest', 0, 2, 'rest'),
				interiorNode('village-exit', 'Mossway Road', 'exit', 0, 3),
			],
			[
				{ id: 'edge-shop', fromNodeId: 'village-hub', toNodeId: 'village-shop', optionKey: 'shop', sortOrder: 0 },
				{ id: 'edge-rest', fromNodeId: 'village-hub', toNodeId: 'village-rest', optionKey: 'rest', sortOrder: 1 },
				{ id: 'edge-exit', fromNodeId: 'village-hub', toNodeId: 'village-exit', optionKey: 'exit', sortOrder: 2 },
			],
		);

		const layout = createInteriorMapLayout(map);
		const hub = layout.nodes.find((item) => item.node.id === 'village-hub');
		const satellitePositions = layout.nodes.filter((item) => item.node.id !== 'village-hub').map((item) => `${item.x}:${item.y}`);

		expect(layout.floors).toHaveLength(1);
		expect(hub).toMatchObject({ x: layout.width / 2, y: layout.height / 2, state: 'current' });
		expect(new Set(satellitePositions).size).toBe(3);
		expect(layout.edges.filter((edge) => edge.state === 'active')).toHaveLength(3);
		expectNodesInsideFloors(layout);
	});
});
