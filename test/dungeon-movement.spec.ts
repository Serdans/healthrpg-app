import { describe, expect, it } from 'vitest';

import type { PartyMap } from '#/lib/api';
import { createDungeonGridLayout } from '#/lib/dungeon-grid';
import { DungeonMovementController } from '#/lib/dungeon-movement';

function node(id: string, x: number, y = 0, discovered = true): PartyMap['nodes'][number] {
	return {
		id,
		chapterNo: 0,
		regionNo: 0,
		name: id,
		nodeType: 'travel',
		templateKey: 'dungeon-tile-floor-v1',
		config: null,
		mapMetadata: {
			mapId: 'map-dungeon',
			nodeId: id,
			floorNo: 0,
			role: 'room',
			sortOrder: x * 10 + y,
			isEntry: x === 0,
			isExit: false,
			tileX: x,
			tileY: y,
			spawnArchetype: null,
		},
		discovered,
		encounterCleared: false,
	};
}

function layoutFor(...nodes: PartyMap['nodes']): ReturnType<typeof createDungeonGridLayout> {
	return createDungeonGridLayout({
		currentChapter: 0,
		currentNodeId: nodes[0]?.id ?? 'a',
		currentMap: {
			id: 'map-dungeon',
			mapType: 'dungeon',
			name: 'Dungeon',
			templateKey: 'dungeon-v1',
			parentNodeId: 'parent',
			entryNodeId: nodes[0]?.id ?? 'a',
		},
		enterableLocation: null,
		nodes,
		edges: [],
		objectives: [],
		completedObjectiveIds: [],
		tileBalance: 9,
		monsters: [],
		navigation: null,
	});
}

describe('dungeon movement controller', () => {
	it('projects manual input from the local endpoint and serializes requests', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a');

		const first = controller.enqueueManual(layout, 'east', 'right', 0);
		const second = controller.enqueueManual(layout, 'east', 'right', 40);
		const third = controller.enqueueManual(layout, 'east', 'right', 80);

		expect(first).toMatchObject({ fromNodeId: 'a', toNodeId: 'b' });
		expect(second).toMatchObject({ fromNodeId: 'b', toNodeId: 'c' });
		expect(third).toBeNull();
		expect(controller.takeNextRequest()).toBe(first);
		expect(controller.takeNextRequest()).toBeNull();

		const acknowledgement = controller.acknowledge({
			nodeId: 'b',
			pathNodeIds: ['b'],
			haltedReason: null,
		});
		expect(acknowledgement).toMatchObject({ accepted: true, confirmedNodeId: 'b' });
		expect(controller.takeNextRequest()).toBe(second);
	});

	it('advances queued visual hops without waiting for the network response', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a', 200);
		controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);

		expect(controller.snapshot.motion).toMatchObject({ fromNodeId: 'a', toNodeId: 'b' });
		expect(controller.advanceVisual(199)).toBe(false);
		expect(controller.advanceVisual(200)).toBe(true);
		expect(controller.snapshot).toMatchObject({ visualNodeId: 'b', motion: { fromNodeId: 'b', toNodeId: 'c' } });
	});

	it('clears all optimistic movement when a request rejects', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a');
		controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);
		controller.takeNextRequest();

		expect(controller.reject()).toBe('a');
		controller.resetVisualNode('a');
		expect(controller.snapshot).toMatchObject({
			confirmedNodeId: 'a',
			visualNodeId: 'a',
			projectedNodeId: 'a',
			inFlight: null,
			motion: null,
			queuedRequestCount: 0,
			queuedVisualCount: 0,
		});
	});

	it('drops stale local input when another client reports a new position', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a');
		controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);

		controller.reconcileServerNode('c');

		expect(controller.snapshot).toMatchObject({
			confirmedNodeId: 'c',
			visualNodeId: 'c',
			projectedNodeId: 'c',
			inFlight: null,
			queuedRequestCount: 0,
			queuedVisualCount: 0,
		});
	});

	it('finishes the active hop but drops buffered input when manual movement stops', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a');
		const first = controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);
		if (!first) throw new Error('Expected an active manual hop');
		controller.takeNextRequest();

		controller.stopManualInput();

		expect(controller.snapshot).toMatchObject({
			inFlight: first,
			motion: { fromNodeId: 'a', toNodeId: 'b' },
			queuedRequestCount: 1,
			queuedVisualCount: 0,
		});

		controller.acknowledge({ nodeId: 'b', pathNodeIds: ['b'], haltedReason: null });
		expect(controller.takeNextRequest()).toBeNull();
		expect(controller.snapshot).toMatchObject({ confirmedNodeId: 'b', queuedRequestCount: 0, queuedVisualCount: 0 });

		expect(controller.enqueueManual(layout, 'east', 'right', 200)).toMatchObject({ fromNodeId: 'b', toNodeId: 'c' });
	});

	it('lets an acknowledged hop finish before reversing direction', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a', 200);
		const first = controller.enqueueManual(layout, 'east', 'right', 0);
		if (!first) throw new Error('Expected an eastward intent');
		controller.takeNextRequest();

		controller.acknowledge({ nodeId: 'b', pathNodeIds: ['b'], haltedReason: null });
		controller.stopManualInput();

		expect(controller.snapshot).toMatchObject({
			confirmedNodeId: 'b',
			visualNodeId: 'a',
			inFlight: null,
			motion: { fromNodeId: 'a', toNodeId: 'b' },
		});

		const reverse = controller.enqueueManual(layout, 'west', 'left', 100);
		controller.takeNextRequest();
		controller.acknowledge({ nodeId: 'a', pathNodeIds: ['a'], haltedReason: null });
		controller.stopManualInput();

		expect(reverse).toMatchObject({ fromNodeId: 'b', toNodeId: 'a' });
		expect(controller.snapshot).toMatchObject({
			motion: { fromNodeId: 'a', toNodeId: 'b' },
			queuedVisualCount: 1,
		});

		controller.advanceVisual(200);
		expect(controller.snapshot).toMatchObject({
			visualNodeId: 'b',
			motion: { fromNodeId: 'b', toNodeId: 'a' },
		});
	});

	it('cancels a buffered visual hop when it has already started', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a', 200);
		const first = controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);
		if (!first) throw new Error('Expected an active manual hop');
		controller.takeNextRequest();

		controller.advanceVisual(200);
		expect(controller.snapshot.motion).toMatchObject({ fromNodeId: 'b', toNodeId: 'c' });

		controller.stopManualInput();

		expect(controller.snapshot).toMatchObject({
			confirmedNodeId: 'a',
			visualNodeId: 'b',
			projectedNodeId: 'b',
			inFlight: first,
			motion: null,
			queuedRequestCount: 1,
			queuedVisualCount: 0,
		});
	});

	it('rewinds completed buffered visuals to the sent hop when input stops', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a', 200);
		const first = controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);
		if (!first) throw new Error('Expected an active manual hop');
		controller.takeNextRequest();

		controller.advanceVisual(200);
		controller.advanceVisual(400);
		expect(controller.snapshot).toMatchObject({ visualNodeId: 'c', motion: null });

		controller.stopManualInput();

		expect(controller.snapshot).toMatchObject({ visualNodeId: 'b', projectedNodeId: 'b', inFlight: first, motion: null });
	});

	it('stops a queued chain when the server reports a halt or a different node', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a');
		controller.enqueueManual(layout, 'east', 'right', 0);
		controller.enqueueManual(layout, 'east', 'right', 40);
		controller.takeNextRequest();

		const acknowledgement = controller.acknowledge({
			nodeId: 'b',
			pathNodeIds: ['b'],
			haltedReason: 'encounter',
		});

		expect(acknowledgement).toMatchObject({ accepted: true, halted: true, confirmedNodeId: 'b' });
		expect(controller.snapshot.queuedRequestCount).toBe(0);
		expect(controller.snapshot.queuedVisualCount).toBe(0);
	});

	it('queues an auto-explore response path without creating manual requests', () => {
		const layout = layoutFor(node('a', 0), node('b', 1), node('c', 2));
		const controller = new DungeonMovementController('a', 200);

		controller.queueServerPath(layout, ['b', 'c'], 'c', 0);

		expect(controller.snapshot).toMatchObject({ confirmedNodeId: 'c', motion: { fromNodeId: 'a', toNodeId: 'b' }, queuedRequestCount: 0 });
		controller.advanceVisual(200);
		expect(controller.snapshot.motion).toMatchObject({ fromNodeId: 'b', toNodeId: 'c' });
	});

	it('snaps to a confirmed target when the response changes floors', () => {
		const layout = layoutFor(node('a', 0));
		const controller = new DungeonMovementController('a', 200);

		controller.queueServerPath(layout, ['deep'], 'deep', 0);

		expect(controller.snapshot).toMatchObject({ confirmedNodeId: 'deep', visualNodeId: 'deep', motion: null });
	});

	it('navigates into an undiscovered cell when its coordinates are known', () => {
		const layout = layoutFor(node('a', 0), node('hidden', 1, 0, false));
		const controller = new DungeonMovementController('a');

		expect(controller.enqueueManual(layout, 'east', 'right', 0)).toMatchObject({ toNodeId: 'hidden' });
	});

	it('projects north and south movement through fog-covered tiles', () => {
		const layout = layoutFor(node('center', 0, 0), node('north', 0, -1, false), node('south', 0, 1, false));
		const controller = new DungeonMovementController('center');
		const southController = new DungeonMovementController('center');

		expect(controller.enqueueManual(layout, 'north', 'up', 0)).toMatchObject({ fromNodeId: 'center', toNodeId: 'north' });
		expect(southController.enqueueManual(layout, 'south', 'down', 0)).toMatchObject({ fromNodeId: 'center', toNodeId: 'south' });
	});
});
