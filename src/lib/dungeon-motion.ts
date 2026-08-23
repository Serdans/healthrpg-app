import type { StagePoint } from '#/lib/dungeon-camera';
import { tileCenter } from '#/lib/dungeon-grid';
import type { DungeonGridLayout } from '#/lib/dungeon-grid';
import type { DungeonMovementController, DungeonMotion } from '#/lib/dungeon-movement';

export const DUNGEON_STEP_DURATION_MS = 160;
export const DUNGEON_WALK_FRAME_DURATION_MS = 80;
export const DUNGEON_MANUAL_REPEAT_MS = DUNGEON_STEP_DURATION_MS;
export const DUNGEON_ARRIVAL_BOB_PX = 1.5;

export interface DungeonRecoveryMotion {
	from: StagePoint;
	to: StagePoint;
	toNodeId: string;
	startedAt: number;
	durationMs: number;
}

export interface DungeonMotionSample {
	point: StagePoint;
	progress: number;
	segment: DungeonMotion | null;
	moving: boolean;
}

/** Select a walk frame from the current hop rather than the global clock. */
export function walkFrameForElapsed(now: number, startedAt: number): 0 | 1 {
	return (Math.floor(Math.max(0, now - startedAt) / DUNGEON_WALK_FRAME_DURATION_MS) % 2) as 0 | 1;
}

export function walkFrameForMotion(now: number, segment: DungeonMotion | null): 0 | 1 {
	return segment ? walkFrameForElapsed(now, segment.startedAt) : 0;
}

export function pointForDungeonNode(layout: DungeonGridLayout, nodeId: string, fallback: StagePoint): StagePoint {
	const tile = layout.tiles.find((candidate) => candidate.node.id === nodeId);
	return tile ? tileCenter(layout, tile) : fallback;
}

/** Sample a movement segment with constant tile velocity and no endpoint pause. */
export function sampleDungeonMotion(
	layout: DungeonGridLayout,
	movement: DungeonMovementController,
	recovery: DungeonRecoveryMotion | null,
	now: number,
): DungeonMotionSample {
	const fallback = layout.currentTile ? tileCenter(layout, layout.currentTile) : { x: layout.width / 2, y: layout.height / 2 };
	if (recovery) {
		const progress = clamp((now - recovery.startedAt) / recovery.durationMs);
		return { point: lerpPoint(recovery.from, recovery.to, progress), progress, segment: null, moving: true };
	}

	const segment = movement.snapshot.motion;
	if (!segment) {
		return {
			point: pointForDungeonNode(layout, movement.snapshot.visualNodeId, fallback),
			progress: 1,
			segment: null,
			moving: false,
		};
	}

	const from = pointForDungeonNode(layout, segment.fromNodeId, fallback);
	const to = pointForDungeonNode(layout, segment.toNodeId, from);
	const progress = clamp((now - segment.startedAt) / segment.durationMs);
	return { point: lerpPoint(from, to, progress), progress, segment, moving: true };
}

export function lerpPoint(from: StagePoint, to: StagePoint, progress: number): StagePoint {
	const clamped = clamp(progress);
	return {
		x: from.x + (to.x - from.x) * clamped,
		y: from.y + (to.y - from.y) * clamped,
	};
}

export function clamp(value: number, minimum = 0, maximum = 1): number {
	return Math.min(maximum, Math.max(minimum, value));
}
