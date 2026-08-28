import type { BattleArenaSide, BattleFloorSlot } from '#/lib/battle-arena';
import type { BattleFloorCalibration, BattleFloorControlPoint } from '#/lib/battle-terrain';

export interface BattleViewportSize {
	width: number;
	height: number;
}

export interface BattleWorldSize {
	width: number;
	height: number;
}

export interface BattleCameraState {
	viewport: BattleViewportSize;
	world: BattleWorldSize;
	/** Cover scale: the reference terrain always fills the viewport. */
	scale: number;
	originX: number;
	originY: number;
	visibleWorld: {
		left: number;
		top: number;
		right: number;
		bottom: number;
		width: number;
		height: number;
	};
}

export interface BattleScreenPlacement {
	/** Contact point in CSS pixels relative to the battlefield. */
	x: number;
	groundY: number;
	/** Contact point in terrain reference pixels for the Pixi world. */
	worldX: number;
	worldY: number;
	depth: number;
	scale: number;
	zIndex: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function interpolate(start: number, end: number, value: number): number {
	return start + (end - start) * value;
}

/**
 * Builds a bottom-anchored cover camera. This is the same transform used by
 * the Pixi background and the actor projections, so a responsive crop cannot
 * make a character detach from the floor artwork.
 */
export function createBattleCamera(viewport: BattleViewportSize, world: BattleWorldSize): BattleCameraState {
	const width = Math.max(1, viewport.width);
	const height = Math.max(1, viewport.height);
	const worldWidth = Math.max(1, world.width);
	const worldHeight = Math.max(1, world.height);
	const scale = Math.max(width / worldWidth, height / worldHeight);
	const visibleWidth = width / scale;
	const visibleHeight = height / scale;
	const originX = clamp((worldWidth - visibleWidth) / 2, 0, Math.max(0, worldWidth - visibleWidth));
	const originY = Math.max(0, worldHeight - visibleHeight);

	return {
		viewport: { width, height },
		world: { width: worldWidth, height: worldHeight },
		scale,
		originX,
		originY,
		visibleWorld: {
			left: originX,
			top: originY,
			right: originX + visibleWidth,
			bottom: originY + visibleHeight,
			width: visibleWidth,
			height: visibleHeight,
		},
	};
}

export function projectWorldPoint(camera: BattleCameraState, point: { x: number; y: number }): { x: number; y: number } {
	return {
		x: (point.x - camera.originX) * camera.scale,
		y: (point.y - camera.originY) * camera.scale,
	};
}

function railPointAtWeight(rail: readonly BattleFloorControlPoint[], weight: number): BattleFloorControlPoint {
	const first = rail.at(0);
	if (!first) throw new Error('Battle floor rails need at least one control point.');
	if (rail.length === 1) return first;

	const segmentCount = rail.length - 1;
	const segmentPosition = clamp(weight, 0, 1) * segmentCount;
	const segmentIndex = Math.min(Math.floor(segmentPosition), segmentCount - 1);
	const start = rail.at(segmentIndex);
	const end = rail.at(segmentIndex + 1);
	if (!start || !end) throw new Error('Battle floor rails must contain contiguous control points.');

	return {
		x: interpolate(start.x, end.x, segmentPosition - segmentIndex),
		y: interpolate(start.y, end.y, segmentPosition - segmentIndex),
	};
}

function floorRailAtDepth(calibration: BattleFloorCalibration, depth: number): BattleFloorControlPoint[] {
	const normalizedDepth = clamp(depth, 0, 1);
	const { farRail, nearRail } = calibration.floorSurface;
	if (farRail.length !== nearRail.length) throw new Error('Battle floor rails must use the same lane positions.');

	return farRail.map((farPoint, index) => {
		const nearPoint = nearRail.at(index);
		if (!nearPoint) throw new Error('Battle floor rails must use matching control points.');
		return {
			x: interpolate(farPoint.x, nearPoint.x, normalizedDepth),
			y: interpolate(farPoint.y, nearPoint.y, normalizedDepth),
		};
	});
}

function railWeightAtX(rail: readonly BattleFloorControlPoint[], x: number): number {
	const first = rail.at(0);
	const last = rail.at(-1);
	if (!first || !last) throw new Error('Battle floor rails need at least one control point.');
	if (rail.length === 1 || last.x === first.x) return 0;

	const normalizedX = clamp(x, first.x, last.x);
	for (let index = 0; index < rail.length - 1; index += 1) {
		const start = rail.at(index);
		const end = rail.at(index + 1);
		if (!start || !end) throw new Error('Battle floor rails must contain contiguous control points.');
		if (normalizedX > end.x && index < rail.length - 2) continue;

		const segmentWidth = end.x - start.x;
		const segmentWeight = segmentWidth === 0 ? 0 : clamp((normalizedX - start.x) / segmentWidth, 0, 1);
		return (index + segmentWeight) / (rail.length - 1);
	}

	return 1;
}

/** Returns a point on the authored terrain surface in normalized world space. */
export function battleFloorSurfacePointAt(calibration: BattleFloorCalibration, laneWeight: number, depth: number): BattleFloorControlPoint {
	return railPointAtWeight(floorRailAtDepth(calibration, depth), laneWeight);
}

/** Returns the authored wall/floor boundary at a normalized world-space x. */
export function battleFloorBoundaryYAtX(calibration: BattleFloorCalibration, x: number): number {
	const { farRail } = calibration.floorSurface;
	return railPointAtWeight(farRail, railWeightAtX(farRail, x)).y;
}

function visibleFloorLaneRange(camera: BattleCameraState, calibration: BattleFloorCalibration, depth: number): readonly [number, number] {
	const floorRail = floorRailAtDepth(calibration, depth);
	const floorLeft = floorRail.at(0);
	const floorRight = floorRail.at(-1);
	if (!floorLeft || !floorRight) throw new Error('Battle floor rails need at least one control point.');

	const visibleLeft = camera.visibleWorld.left / camera.world.width;
	const visibleRight = camera.visibleWorld.right / camera.world.width;
	const left = Math.max(floorLeft.x, visibleLeft);
	const right = Math.min(floorRight.x, visibleRight);

	if (right > left) return [railWeightAtX(floorRail, left), railWeightAtX(floorRail, right)];
	return [0, 1];
}

function laneBand(calibration: BattleFloorCalibration, side: BattleArenaSide, count: number): readonly [number, number] {
	if (side === 'party') return calibration.partyLane;
	return count === 2 ? calibration.enemyPairLane : calibration.enemyLane;
}

/**
 * Projects one logical formation slot into both CSS and Pixi coordinates.
 * When a portrait viewport crops the sides of the reference image, the floor
 * interval is clipped first and the two side bands are remapped inward. This
 * preserves readable formations without zooming the player out to a postage
 * stamp or allowing actors to stand on the walls.
 */
export function projectBattleFloorSlot(
	camera: BattleCameraState,
	calibration: BattleFloorCalibration,
	slot: BattleFloorSlot,
	side: BattleArenaSide,
	count: number,
): BattleScreenPlacement {
	const depth = clamp(slot.depth, 0, 1);
	const visibleLaneRange = visibleFloorLaneRange(camera, calibration, depth);
	const [bandStart, bandEnd] = laneBand(calibration, side, count);
	const floorLane = interpolate(visibleLaneRange[0], visibleLaneRange[1], interpolate(bandStart, bandEnd, clamp(slot.laneWeight, 0, 1)));
	const floorPoint = battleFloorSurfacePointAt(calibration, floorLane, depth);
	const worldPoint = {
		x: floorPoint.x * camera.world.width,
		y: floorPoint.y * camera.world.height,
	};
	const screenPoint = projectWorldPoint(camera, worldPoint);

	return {
		x: screenPoint.x,
		groundY: screenPoint.y,
		worldX: worldPoint.x,
		worldY: worldPoint.y,
		depth,
		scale: interpolate(calibration.farScale, calibration.nearScale, depth),
		zIndex: Math.round(screenPoint.y),
	};
}

/**
 * Returns the square interaction/stage size in screen pixels. It is driven by
 * viewport width and encounter density, then receives the floor depth scale.
 */
export function battleActorStageSize(viewport: BattleViewportSize, side: BattleArenaSide, count: number, depthScale: number): number {
	const densityRatio = side === 'enemy' ? (count >= 5 ? 0.13 : 0.17) : count >= 6 ? 0.105 : count >= 4 ? 0.125 : 0.15;
	const heightRatio = side === 'enemy' ? 0.24 : 0.22;
	const maximum = side === 'enemy' ? 146 : 132;
	const baseSize = clamp(Math.min(viewport.width * densityRatio, viewport.height * heightRatio), 48, maximum);
	return baseSize * depthScale;
}
