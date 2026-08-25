import { describe, expect, it } from 'vitest';

import type { PartyMap } from '#/lib/api';
import { createDungeonGridLayout, tileCenter } from '#/lib/dungeon-grid';
import { DUNGEON_STEP_DURATION_MS, lerpPoint, sampleDungeonMotion, walkFrameForMotion } from '#/lib/dungeon-motion';
import { DungeonMovementController } from '#/lib/dungeon-movement';

function node(id: string, x: number): PartyMap['nodes'][number] {
	return {
		id,
		chapterNo: 0,
		regionNo: 0,
		name: id,
		nodeType: 'travel',
		templateKey: 'dungeon-tile-floor-v1',
		config: null,
		mapMetadata: {
			mapId: 'motion-map',
			nodeId: id,
			floorNo: 0,
			role: 'room',
			sortOrder: x,
			isEntry: x === 0,
			isExit: false,
			tileX: x,
			tileY: 0,
			spawnArchetype: null,
		},
		discovered: true,
		encounterCleared: false,
	};
}

function motionLayout() {
	return createDungeonGridLayout({
		currentChapter: 0,
		currentNodeId: 'a',
		currentMap: {
			id: 'motion-map',
			mapType: 'dungeon',
			name: 'Motion map',
			templateKey: 'dungeon-v1',
			parentNodeId: 'parent',
			entryNodeId: 'a',
		},
		enterableLocation: null,
		nodes: [node('a', 0), node('b', 1), node('c', 2)],
		edges: [],
		objectives: [],
		completedObjectiveIds: [],
		tileBalance: 0,
		navigation: null,
	});
}

describe('dungeon motion sampling', () => {
	it('moves at a constant tile velocity and reaches the endpoint exactly', () => {
		const layout = motionLayout();
		const controller = new DungeonMovementController('a', DUNGEON_STEP_DURATION_MS);
		const intent = controller.enqueueManual(layout, 'east', 'right', 0);
		if (!intent) throw new Error('Expected an eastward intent');

		const from = tileCenter(
			layout,
			layout.tiles.find((tile) => tile.node.id === 'a')!,
		);
		const to = tileCenter(
			layout,
			layout.tiles.find((tile) => tile.node.id === 'b')!,
		);
		const halfway = sampleDungeonMotion(layout, controller, null, DUNGEON_STEP_DURATION_MS / 2);

		expect(halfway.moving).toBe(true);
		expect(halfway.progress).toBe(0.5);
		expect(halfway.point).toEqual(lerpPoint(from, to, 0.5));
		expect(sampleDungeonMotion(layout, controller, null, DUNGEON_STEP_DURATION_MS).point).toEqual(to);
	});

	it('starts only one queued segment after a frame skips ahead', () => {
		const layout = motionLayout();
		const controller = new DungeonMovementController('a', DUNGEON_STEP_DURATION_MS);
		controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 0);

		controller.advanceVisual(DUNGEON_STEP_DURATION_MS * 2);

		expect(controller.snapshot).toMatchObject({
			visualNodeId: 'b',
			motion: { fromNodeId: 'b', toNodeId: 'c', startedAt: DUNGEON_STEP_DURATION_MS * 2 },
		});
		expect(sampleDungeonMotion(layout, controller, null, DUNGEON_STEP_DURATION_MS * 2)).toMatchObject({
			progress: 0,
			moving: true,
		});

		controller.advanceVisual(DUNGEON_STEP_DURATION_MS * 3);
		expect(controller.snapshot).toMatchObject({ visualNodeId: 'c', motion: null });
	});

	it('starts every hop on the same walking frame and advances locally', () => {
		const layout = motionLayout();
		const controller = new DungeonMovementController('a', DUNGEON_STEP_DURATION_MS);
		controller.enqueueManual(layout, 'east', 'right', 37);

		const segment = controller.snapshot.motion;
		if (!segment) throw new Error('Expected an active motion segment');
		expect(walkFrameForMotion(37, segment)).toBe(0);
		expect(walkFrameForMotion(116, segment)).toBe(0);
		expect(walkFrameForMotion(117, segment)).toBe(1);
		expect(walkFrameForMotion(196, segment)).toBe(1);
		expect(walkFrameForMotion(197, segment)).toBe(0);
	});

	it('samples rejection recovery independently from the movement queue', () => {
		const layout = motionLayout();
		const controller = new DungeonMovementController('a', DUNGEON_STEP_DURATION_MS);
		const recovery = {
			from: { x: 10, y: 20 },
			to: { x: 90, y: 20 },
			toNodeId: 'a',
			startedAt: 100,
			durationMs: DUNGEON_STEP_DURATION_MS,
		};

		expect(sampleDungeonMotion(layout, controller, recovery, 180).point).toEqual({ x: 50, y: 20 });
		expect(sampleDungeonMotion(layout, controller, recovery, 400).progress).toBe(1);
	});
});
