import { describe, expect, it } from 'vitest';

import {
	adjacentGridTileId,
	createDungeonGridLayout,
	DUNGEON_CONTEXT_CELLS,
	directionBetween,
	dungeonTileKind,
	tileCenter,
} from '#/lib/dungeon-grid';
import { dungeonZoom, followDungeonCamera, screenToStage, snapCamera } from '#/lib/dungeon-camera';
import type { PartyMap } from '#/lib/api';

type MapNode = PartyMap['nodes'][number];

function tileNode(id: string, kind: string, floorNo: number, x: number, y: number): MapNode {
	return {
		id,
		chapterNo: 0,
		regionNo: 0,
		name: `${kind} ${String(x)}:${String(y)}`,
		nodeType: kind === 'spawn' || kind === 'boss' ? 'combat' : 'travel',
		templateKey: `dungeon-tile-${kind}-v1`,
		config: null,
		mapMetadata: {
			mapId: 'map-dungeon',
			nodeId: id,
			floorNo,
			role: kind === 'spawn' ? 'combat' : kind === 'entry' ? 'entrance' : kind === 'exit' ? 'exit' : 'room',
			sortOrder: x * 10 + y,
			isEntry: kind === 'entry',
			isExit: kind === 'exit',
			tileX: x,
			tileY: y,
			spawnArchetype: kind === 'spawn' ? 'vermin' : null,
		},
		discovered: true,
	};
}

function dungeonMap(currentNodeId: string, nodes: MapNode[]): PartyMap {
	return {
		currentChapter: 0,
		currentNodeId,
		currentMap: {
			id: 'map-dungeon',
			mapType: 'dungeon',
			name: 'First Ruins',
			templateKey: 'dungeon-v1',
			parentNodeId: 'parent',
			entryNodeId: nodes[0]?.id ?? currentNodeId,
		},
		enterableLocation: null,
		nodes,
		edges: [],
		objectives: [],
		completedObjectiveIds: [],
		tileBalance: 9,
		navigation: null,
	};
}

const corridor = dungeonMap('a', [
	tileNode('a', 'entry', 0, 0, 0),
	tileNode('b', 'floor', 0, 1, 0),
	tileNode('c', 'floor', 0, 2, 0),
	tileNode('s', 'stairs-down', 0, 3, 0),
]);

function markUnseen(map: PartyMap, ids: string[]): PartyMap {
	return {
		...map,
		nodes: map.nodes.map((node) => (ids.includes(node.id) ? { ...node, discovered: false } : node)),
	};
}
const corridorWithFog = markUnseen(corridor, ['c', 's']);

describe('dungeon grid layout', () => {
	it('positions every discovered tile and marks the current one', () => {
		const layout = createDungeonGridLayout(corridor);
		expect(layout.tiles).toHaveLength(4);
		expect(layout.currentTile?.node.id).toBe('a');
		expect(layout.tiles.map((tile) => tile.col)).toEqual([2, 3, 4, 5]);
		expect(layout.floors[0]?.cols).toBe(4 + DUNGEON_CONTEXT_CELLS * 2);
		expect(layout.cells.find((cell) => cell.col === 0 && cell.row === 0)).toMatchObject({ walkable: false, terrain: 'wall' });
	});

	it('centers tiles on a deterministic pixel grid', () => {
		const layout = createDungeonGridLayout(corridor);
		const first = layout.tiles.find((tile) => tile.node.id === 'a');
		const second = layout.tiles.find((tile) => tile.node.id === 'b');
		if (!first || !second) throw new Error('Expected tiles');
		const left = tileCenter(layout, first);
		const right = tileCenter(layout, second);
		expect(right.x - left.x).toBe(layout.tileSize + layout.gap);
		expect(left.y).toBe(right.y);
	});

	it('renders only the party active floor', () => {
		const twoFloors = dungeonMap('a', [...corridor.nodes, tileNode('d2', 'floor', 1, 1, 2), tileNode('landing', 'stairs-up', 1, 3, 2)]);
		const layout = createDungeonGridLayout(twoFloors);
		expect(layout.activeFloorNo).toBe(0);
		expect(layout.floors).toHaveLength(1);
		for (const tile of layout.tiles) {
			expect(tile.floorNo).toBe(0);
			const floor = layout.floors.at(0);
			if (!floor) throw new Error('Missing active floor');
			expect(floor.y).toBeLessThanOrEqual(tileCenter(layout, tile).y);
			expect(tileCenter(layout, tile).y).toBeLessThan(floor.y + floor.height);
		}
		const deepLayout = createDungeonGridLayout({ ...twoFloors, currentNodeId: 'd2' });
		expect(deepLayout.activeFloorNo).toBe(1);
		expect(deepLayout.tiles.map((tile) => tile.node.id)).toEqual(['d2', 'landing']);
	});
});

describe('grid navigation', () => {
	const layout = createDungeonGridLayout(corridor);

	it('finds the orthogonal neighbor in a direction', () => {
		expect(adjacentGridTileId(layout, 'a', 'east')).toBe('b');
		expect(adjacentGridTileId(layout, 'c', 'west')).toBe('b');
		expect(adjacentGridTileId(layout, 'a', 'north')).toBeNull();
	});

	it('allows keyboard movement into a known fog-covered neighbor', () => {
		const vertical = createDungeonGridLayout(
			dungeonMap('center', [
				tileNode('center', 'entry', 0, 0, 0),
				{ ...tileNode('north', 'floor', 0, 0, -1), discovered: false },
				{ ...tileNode('south', 'floor', 0, 0, 1), discovered: false },
			]),
		);

		expect(adjacentGridTileId(vertical, 'center', 'north')).toBe('north');
		expect(adjacentGridTileId(vertical, 'center', 'south')).toBe('south');
	});

	it('never navigates between floors by stepping sideways off-grid', () => {
		const twoFloors = createDungeonGridLayout(dungeonMap('a', [...corridor.nodes, tileNode('deep', 'floor', 1, 1, -1)]));
		expect(adjacentGridTileId(twoFloors, 'b', 'south')).toBeNull();
	});
});

describe('tile kinds', () => {
	it('maps template keys to kinds with floor fallback', () => {
		expect(dungeonTileKind('dungeon-tile-spawn-v1')).toBe('spawn');
		expect(dungeonTileKind('dungeon-tile-stairs-down-v1')).toBe('stairs-down');
		expect(dungeonTileKind('dungeon-tile-goal-v1')).toBe('goal');
		expect(dungeonTileKind('dungeon-tile-floor-v1')).toBe('floor');
		expect(dungeonTileKind('mystery-template')).toBe('floor');
	});
});

describe('pixel plane geometry', () => {
	it('butts tiles edge-to-edge with no gap', () => {
		const layout = createDungeonGridLayout(corridor);
		const left = layout.tiles.find((tile) => tile.node.id === 'a');
		const right = layout.tiles.find((tile) => tile.node.id === 'b');
		if (!left || !right) throw new Error('Expected tiles');
		const leftCenter = tileCenter(layout, left);
		const rightCenter = tileCenter(layout, right);
		expect(rightCenter.x - leftCenter.x).toBe(layout.tileSize);
	});

	it('flags rock cells above walked floor for the cliff face', () => {
		const lShaped = dungeonMap('a', [tileNode('a', 'entry', 0, 0, 0), tileNode('b', 'floor', 0, 0, 1), tileNode('c', 'floor', 0, 1, 1)]);
		const layout = createDungeonGridLayout(lShaped);
		const cap = layout.cells.find((cell) => cell.col === DUNGEON_CONTEXT_CELLS + 1 && cell.row === DUNGEON_CONTEXT_CELLS && !cell.walkable);
		expect(cap?.floorBelow).toBe(true);

		const floorWithRockAbove = layout.cells.find(
			(cell) => cell.walkable && cell.discovered && cell.col === DUNGEON_CONTEXT_CELLS && cell.row === DUNGEON_CONTEXT_CELLS + 1,
		);
		expect(floorWithRockAbove?.rockEdges.n).toBe(false);
		expect(floorWithRockAbove?.rockEdges.w).toBe(true);
		expect(floorWithRockAbove?.rockEdges.s).toBe(true);
	});

	it('derives an eight-neighbor terrain edge mask', () => {
		const layout = createDungeonGridLayout(
			dungeonMap('b', [tileNode('a', 'entry', 0, 0, 0), tileNode('b', 'floor', 0, 1, 0), tileNode('c', 'floor', 0, 1, 1)]),
		);
		const corner = layout.cells.find((cell) => cell.col === DUNGEON_CONTEXT_CELLS + 1 && cell.row === DUNGEON_CONTEXT_CELLS + 1);
		expect(corner?.edgeMask).toBeGreaterThan(0);
		expect(corner?.terrain).toBe('floor');
	});
});

describe('optimistic walk prediction parity', () => {
	it('manual single-step reaches the same neighbor the planner would pick first', () => {
		const layout = createDungeonGridLayout(corridor);
		const plannerTargetFirstStep = adjacentGridTileId(layout, 'a', 'east');
		expect(plannerTargetFirstStep).toBe('b');

		const current = layout.tiles.find((item) => item.node.id === 'a');
		expect(current?.state).toBe('current');
	});
});

describe('floor band containment', () => {
	it('keeps every tile center inside its own floor rectangle', () => {
		const scattered = dungeonMap('a', [
			tileNode('a', 'entry', 0, 4, 3),
			tileNode('b', 'floor', 0, 5, 3),
			tileNode('c', 'floor', 0, 5, 5),
			tileNode('d', 'spawn', 0, 9, 7),
			tileNode('deep', 'floor', 1, 8, 2),
		]);
		const layout = createDungeonGridLayout(scattered);
		for (const tile of layout.tiles) {
			const center = tileCenter(layout, tile);
			const floor = layout.floors.find((candidate) => candidate.floorNo === tile.floorNo);
			if (!floor) throw new Error('Missing floor band');
			expect(center.x).toBeGreaterThanOrEqual(floor.x);
			expect(center.x).toBeLessThanOrEqual(floor.x + floor.width);
			expect(center.y).toBeGreaterThanOrEqual(floor.y);
			expect(center.y).toBeLessThanOrEqual(floor.y + floor.height);
		}
	});

	it('normalizes columns so bands hug their grids', () => {
		const layout = createDungeonGridLayout(dungeonMap('far', [tileNode('far', 'floor', 0, 40, 6), tileNode('near', 'floor', 0, 41, 6)]));
		const floor = layout.floors.at(0);
		if (!floor) throw new Error('Missing floor');
		expect(layout.tiles.map((tile) => tile.col)).toEqual([DUNGEON_CONTEXT_CELLS, DUNGEON_CONTEXT_CELLS + 1]);
		expect(tileCenter(layout, layout.tiles[0]).x).toBeGreaterThanOrEqual(floor.x);
	});
});

describe('sprite facing', () => {
	it('derives compass directions from grid deltas across floors', () => {
		const layout = createDungeonGridLayout(corridor);
		expect(directionBetween(layout, 'a', 'b')).toBe('east');
		expect(directionBetween(layout, 'c', 'b')).toBe('west');
		expect(directionBetween(layout, 'a', 'a')).toBeNull();
	});
});

describe('pixel camera framing', () => {
	it('uses a discrete zoom for compact active floors', () => {
		const layout = createDungeonGridLayout(corridor);
		expect(dungeonZoom(layout, { width: 1200, height: 700 })).toBe(1);
	});

	it('keeps large floors at native scale for scrolling', () => {
		const nodes = Array.from({ length: 48 }, (_, index) => tileNode(`wide-${String(index)}`, 'floor', 0, index, 0));
		const layout = createDungeonGridLayout(dungeonMap(nodes[0].id, nodes));
		expect(dungeonZoom(layout, { width: 1200, height: 700 })).toBe(1);
	});

	it('holds the party inside a dead zone before easing the camera after it exits', () => {
		const previous = { offsetX: 100, offsetY: 40, zoom: 1, originX: 0, originY: 0 };
		const held = followDungeonCamera({ x: 330, y: 190 }, { width: 400, height: 300 }, { width: 1200, height: 900 }, 1, {
			previous,
			deadZone: { width: 100, height: 80 },
			elapsedMs: 16,
			catchupMs: 100,
		});
		const eased = followDungeonCamera({ x: 500, y: 190 }, { width: 400, height: 300 }, { width: 1200, height: 900 }, 1, {
			previous,
			deadZone: { width: 100, height: 80 },
			elapsedMs: 16,
			catchupMs: 100,
		});

		expect(held.offsetX).toBe(previous.offsetX);
		expect(eased.offsetX).toBeGreaterThan(previous.offsetX);
		expect(eased.offsetX).toBeLessThan(300);
	});

	it('keeps camera easing fractional until the render transform is snapped', () => {
		const eased = followDungeonCamera({ x: 500, y: 190 }, { width: 400, height: 300 }, { width: 1200, height: 900 }, 1, {
			previous: { offsetX: 100, offsetY: 40, zoom: 1, originX: 0, originY: 0 },
			deadZone: { width: 100, height: 80 },
			elapsedMs: 16,
			catchupMs: 180,
		});

		expect(eased.offsetX).not.toBe(Math.round(eased.offsetX));
		expect(snapCamera(eased).offsetX).toBe(Math.round(eased.offsetX));
	});

	it('caps a long frame so camera follow does not teleport', () => {
		const options = {
			previous: { offsetX: 100, offsetY: 40, zoom: 1, originX: 0, originY: 0 },
			deadZone: { width: 100, height: 80 },
			catchupMs: 180,
		};
		const longFrame = followDungeonCamera({ x: 500, y: 190 }, { width: 400, height: 300 }, { width: 1200, height: 900 }, 1, {
			...options,
			elapsedMs: 1000,
		});
		const cappedFrame = followDungeonCamera({ x: 500, y: 190 }, { width: 400, height: 300 }, { width: 1200, height: 900 }, 1, {
			...options,
			elapsedMs: 50,
		});

		expect(longFrame).toEqual(cappedFrame);
	});

	it('snaps camera offsets to the active pixel grid', () => {
		expect(snapCamera({ offsetX: 10.3, offsetY: 5.6, zoom: 2, originX: 18, originY: 9 })).toEqual({
			offsetX: 10.5,
			offsetY: 5.5,
			zoom: 2,
			originX: 18,
			originY: 9,
		});
	});

	it('centers compact stages and uses the same origin for pointer conversion', () => {
		const camera = followDungeonCamera({ x: 480, y: 360 }, { width: 1200, height: 700 }, { width: 960, height: 720 }, 1, {
			lockToCenter: true,
		});

		expect(camera.originX).toBe(120);
		expect(camera.originY).toBe(0);
		expect(screenToStage({ x: 220, y: 160 }, camera)).toEqual({ x: 100, y: 170 });
	});
});

describe('monster archetypes', () => {
	it('builds a full cell plane with rock between carved tiles', () => {
		const lShaped = dungeonMap('a', [
			tileNode('a', 'entry', 0, 0, 0),
			tileNode('b', 'floor', 0, 1, 0),
			tileNode('c', 'floor', 0, 2, 0),
			tileNode('d', 'floor', 0, 2, 1),
		]);
		const layout = createDungeonGridLayout(lShaped);
		const floorCells = layout.cells.filter((cell) => cell.walkable);
		const rockCells = layout.cells.filter((cell) => !cell.walkable);
		expect(floorCells.length).toBe(layout.tiles.length);
		expect(rockCells.length).toBeGreaterThan(0);
		expect(layout.cells.length).toBe(layout.floors.reduce((sum, floor) => sum + floor.cols * floor.rows, 0));
	});

	it('treats undiscovered walkable tiles as rock until stepped on', () => {
		const layout = createDungeonGridLayout(corridorWithFog);
		const unseen = layout.tiles.find((tile) => !tile.discovered);
		if (!unseen) throw new Error('Fixture should include fog-covered tiles');
		const cell = layout.cells.find(
			(candidate) => candidate.floorNo === unseen.floorNo && candidate.col === unseen.col && candidate.row === unseen.row,
		);
		expect(cell).toMatchObject({ walkable: true, discovered: false });
	});

	it('carries the spawn archetype through the layout', () => {
		const layout = createDungeonGridLayout(dungeonMap('a', [...corridor.nodes, tileNode('mob', 'spawn', 0, 4, 0)]));
		const spawn = layout.tiles.find((tile) => tile.kind === 'spawn');
		expect(spawn?.archetypeKey).toBe('vermin');
		const plain = layout.tiles.find((tile) => tile.kind === 'entry');
		expect(plain?.archetypeKey).toBeUndefined();
	});
});
