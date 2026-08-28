import type { DungeonGridLayout, DungeonGridCell } from '#/lib/dungeon-grid';

/**
 * Pure camera math for the canvas dungeon world.
 *
 * The plane lives in "stage" pixel space (see `tileCenter`); the viewport is a
 * rectangle of CSS pixels. A camera records which stage coordinate sits at the
 * viewport's top-left corner, so converting between the two is a single
 * translate — the same transform drives both `ctx.translate` for drawing and
 * pointer→tile hit-testing, so the two can never drift.
 */

/** CSS-pixel size of the visible viewport. */
export interface CameraViewport {
	width: number;
	height: number;
}

/** Stage-pixel bounds the camera may travel within (the plane's extent). */
export interface CameraBounds {
	width: number;
	height: number;
}

export interface CameraState {
	/** Stage-pixel coordinate displayed at the viewport's top-left. */
	offsetX: number;
	offsetY: number;
	/** Discrete pixel-art zoom shared by rendering and pointer hit-testing. */
	zoom: number;
	/** CSS-pixel origin used to center a compact stage inside the viewport. */
	originX: number;
	originY: number;
}

export interface DungeonCameraFollowOptions {
	/** Stage-pixel radius around the viewport center before the camera moves. */
	deadZone?: { width: number; height: number };
	/** Keep compact floors centered instead of tracking every party pixel. */
	lockToCenter?: boolean;
	/** Camera catch-up time in milliseconds. */
	catchupMs?: number;
	/** Existing camera state used for smoothed follow. */
	previous?: CameraState | null;
	/** Elapsed ticker time used by the smoothing step. */
	elapsedMs?: number;
}

export interface ScreenPoint {
	x: number;
	y: number;
}

export interface StagePoint {
	x: number;
	y: number;
}

/** Center a stage point in the viewport, clamped to the plane's bounds. */
export function followCamera(target: StagePoint, viewport: CameraViewport, bounds: CameraBounds, zoom = 1): CameraState {
	const visibleWidth = viewport.width / zoom;
	const visibleHeight = viewport.height / zoom;
	const maxOffsetX = Math.max(0, bounds.width - visibleWidth);
	const maxOffsetY = Math.max(0, bounds.height - visibleHeight);
	return {
		offsetX: clamp(target.x - visibleWidth / 2, 0, maxOffsetX),
		offsetY: clamp(target.y - visibleHeight / 2, 0, maxOffsetY),
		zoom,
		...centeredOrigin(viewport, bounds, zoom),
	};
}

/** Follow the party without moving the viewport for every sub-tile position. */
export function followDungeonCamera(
	target: StagePoint,
	viewport: CameraViewport,
	bounds: CameraBounds,
	zoom: number,
	options: DungeonCameraFollowOptions = {},
): CameraState {
	const visibleWidth = viewport.width / zoom;
	const visibleHeight = viewport.height / zoom;
	const maxOffsetX = Math.max(0, bounds.width - visibleWidth);
	const maxOffsetY = Math.max(0, bounds.height - visibleHeight);
	const centered: CameraState = {
		offsetX: clamp((bounds.width - visibleWidth) / 2, 0, maxOffsetX),
		offsetY: clamp((bounds.height - visibleHeight) / 2, 0, maxOffsetY),
		zoom,
		...centeredOrigin(viewport, bounds, zoom),
	};
	if (options.lockToCenter) return centered;

	const previous = options.previous ?? followCamera(target, viewport, bounds, zoom);
	const deadZone = options.deadZone ?? { width: 0, height: 0 };
	const previousCenter = {
		x: previous.offsetX + visibleWidth / 2,
		y: previous.offsetY + visibleHeight / 2,
	};
	const outsideX = Math.abs(target.x - previousCenter.x) > deadZone.width / 2;
	const outsideY = Math.abs(target.y - previousCenter.y) > deadZone.height / 2;
	const desired = {
		x: outsideX ? target.x - visibleWidth / 2 : previous.offsetX,
		y: outsideY ? target.y - visibleHeight / 2 : previous.offsetY,
	};
	const catchupMs = Math.max(1, options.catchupMs ?? 100);
	// A stalled tab or a dropped frame should not turn the next camera sample
	// into a teleport. The following frames will naturally catch up.
	const elapsedMs = Math.min(50, Math.max(0, options.elapsedMs ?? catchupMs));
	const amount = 1 - Math.exp(-elapsedMs / catchupMs);
	return {
		offsetX: clamp(previous.offsetX + (desired.x - previous.offsetX) * amount, 0, maxOffsetX),
		offsetY: clamp(previous.offsetY + (desired.y - previous.offsetY) * amount, 0, maxOffsetY),
		zoom,
		...centeredOrigin(viewport, bounds, zoom),
	};
}

export function screenToStage(point: ScreenPoint, camera: CameraState): StagePoint {
	return {
		x: (point.x - camera.originX) / camera.zoom + camera.offsetX,
		y: (point.y - camera.originY) / camera.zoom + camera.offsetY,
	};
}

/**
 * Keep the native 24px art at a stable 2× source-pixel scale. The layout
 * already expresses each cell as 48 reference pixels, so no camera zoom is
 * needed to preserve the intended density.
 *
 * Compact floors used to be enlarged until their bounding box filled the
 * viewport. That made a 48px world cell become a 72px or 96px screen cell,
 * turning every source pixel into a visibly chunky block. The camera now
 * centers compact floors at the same density and scrolls larger floors.
 */
export function dungeonZoom(_layout: DungeonGridLayout, _viewport: CameraViewport): number {
	return 1;
}

/**
 * Resolve which cell sits under a viewport pixel. Returns null when the point
 * is outside the plane.
 */
export function cellAtScreen(layout: DungeonGridLayout, camera: CameraState, point: ScreenPoint): DungeonGridCell | null {
	const stage = screenToStage(point, camera);
	for (const floor of layout.floors) {
		const left = floor.x + layout.padding;
		const top = floor.y + layout.padding;
		const step = layout.tileSize + layout.gap;
		const localX = stage.x - left;
		const localY = stage.y - top;
		if (localX < 0 || localY < 0) continue;
		const col = Math.floor(localX / step);
		const row = Math.floor(localY / step);
		if (col < 0 || col >= floor.cols || row < 0 || row >= floor.rows) continue;
		const cell = layout.cells.find((candidate) => candidate.floorNo === floor.floorNo && candidate.col === col && candidate.row === row);
		if (cell) return cell;
	}
	return null;
}

/** Keep the final world transform on a stable pixel boundary at discrete zoom. */
export function snapCamera(camera: CameraState): CameraState {
	return {
		...camera,
		offsetX: Math.round(camera.offsetX * camera.zoom) / camera.zoom,
		offsetY: Math.round(camera.offsetY * camera.zoom) / camera.zoom,
	};
}

/** True when a viewport pixel lands on a walkable, discovered (interactive) tile. */
export function isInteractiveCell(cell: DungeonGridCell): boolean {
	return cell.walkable && cell.discovered;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.max(minimum, Math.min(maximum, value));
}

function centeredOrigin(viewport: CameraViewport, bounds: CameraBounds, zoom: number): { originX: number; originY: number } {
	return {
		originX: Math.max(0, Math.floor((viewport.width - bounds.width * zoom) / 2)),
		originY: Math.max(0, Math.floor((viewport.height - bounds.height * zoom) / 2)),
	};
}
