import { adjacentGridTileId, directionBetween } from '#/lib/dungeon-grid';
import type { DungeonGridLayout } from '#/lib/dungeon-grid';
import type { PartyTravelerDirection } from '#/lib/game-art';
import { DUNGEON_STEP_DURATION_MS } from '#/lib/dungeon-motion';

export type DungeonMoveStep = 'up' | 'down' | 'left' | 'right';

export interface DungeonMoveIntent {
	fromNodeId: string;
	toNodeId: string;
	direction: PartyTravelerDirection;
	step: DungeonMoveStep;
}

export interface DungeonVisualSegment {
	fromNodeId: string;
	toNodeId: string;
	direction: PartyTravelerDirection | null;
}

export interface DungeonMotion extends DungeonVisualSegment {
	startedAt: number;
	durationMs: number;
}

export interface DungeonMovementAck {
	nodeId: string;
	pathNodeIds: string[];
	haltedReason: string | null;
}

export interface DungeonMovementSnapshot {
	confirmedNodeId: string;
	visualNodeId: string;
	projectedNodeId: string;
	inFlight: DungeonMoveIntent | null;
	motion: DungeonMotion | null;
	queuedRequestCount: number;
	queuedVisualCount: number;
}

// Keep one hop in flight and one hop buffered. A larger queue lets a held key
// outrun the renderer and makes camera follow feel like it is catching up to
// an input queue instead of following the party.
const maxPendingManualMoves = 2;

/**
 * Coordinates local visual movement with the serialized dungeon walk API.
 * Network requests and visual segments intentionally have separate queues:
 * input can remain responsive while the server acknowledges one step at a
 * time, while a rejection can still discard all unconfirmed movement.
 */
export class DungeonMovementController {
	private confirmedNodeId: string;
	private visualNodeId: string;
	private requestQueue: DungeonMoveIntent[] = [];
	private visualQueue: DungeonVisualSegment[] = [];
	private inFlight: DungeonMoveIntent | null = null;
	private motion: DungeonMotion | null = null;
	private manualInputActive = false;

	public constructor(
		initialNodeId: string,
		private durationMs = DUNGEON_STEP_DURATION_MS,
	) {
		this.confirmedNodeId = initialNodeId;
		this.visualNodeId = initialNodeId;
	}

	public setDuration(durationMs: number): void {
		this.durationMs = Math.max(0, durationMs);
		if (this.durationMs === 0 && this.motion) {
			this.visualNodeId = this.motion.toNodeId;
			this.motion = null;
			this.startVisualIfIdle(performance.now());
		}
	}

	public get snapshot(): DungeonMovementSnapshot {
		return {
			confirmedNodeId: this.confirmedNodeId,
			visualNodeId: this.visualNodeId,
			projectedNodeId: this.projectedNodeId,
			inFlight: this.inFlight,
			motion: this.motion,
			queuedRequestCount: this.requestQueue.length,
			queuedVisualCount: this.visualQueue.length,
		};
	}

	public get projectedNodeId(): string {
		return this.requestQueue.at(-1)?.toNodeId ?? this.visualQueue.at(-1)?.toNodeId ?? this.motion?.toNodeId ?? this.visualNodeId;
	}

	public get currentVisualTargetId(): string {
		return this.motion?.toNodeId ?? this.visualNodeId;
	}

	public get isBusy(): boolean {
		return Boolean(this.inFlight || this.requestQueue.length || this.visualQueue.length || this.motion);
	}

	public enqueueManual(
		layout: DungeonGridLayout,
		direction: PartyTravelerDirection,
		step: DungeonMoveStep,
		now: number,
	): DungeonMoveIntent | null {
		if (this.requestQueue.length >= maxPendingManualMoves) return null;
		const fromNodeId = this.projectedNodeId;
		const toNodeId = adjacentGridTileId(layout, fromNodeId, direction);
		if (!toNodeId) return null;
		const intent: DungeonMoveIntent = { fromNodeId, toNodeId, direction, step };
		this.manualInputActive = true;
		this.requestQueue.push(intent);
		this.visualQueue.push({ fromNodeId, toNodeId, direction });
		this.startVisualIfIdle(now);
		return intent;
	}

	public takeNextRequest(): DungeonMoveIntent | null {
		if (!this.manualInputActive || this.inFlight || !this.requestQueue[0]) return null;
		this.inFlight = this.requestQueue[0];
		return this.inFlight;
	}

	/**
	 * Stop manual input without interrupting a hop that is already confirmed or
	 * sent to the server. Unsent buffered hops are discarded, while a sent hop
	 * remains queued behind the active animation so the server and renderer do
	 * not diverge when a direction changes mid-step.
	 */
	public stopManualInput(): void {
		if (!this.manualInputActive) return;
		const inFlight = this.inFlight;
		const sentVisualHop = Boolean(this.motion && inFlight && this.motion.toNodeId === inFlight.toNodeId);
		const confirmedVisualHop = Boolean(this.motion && this.motion.toNodeId === this.confirmedNodeId);
		const visualTargetId = inFlight?.toNodeId ?? this.confirmedNodeId;
		// An acknowledged hop may still be rendering after its response arrives.
		// Only discard visual motion that is still ahead of the server-confirmed
		// position and is not the request currently sent to the server.
		const hasUnacknowledgedMovement = Boolean(this.inFlight || this.requestQueue.length);
		const staleVisualMotion = Boolean(this.motion && hasUnacknowledgedMovement && !sentVisualHop && !confirmedVisualHop);
		const sentVisualQueue = inFlight
			? this.visualQueue.filter((segment) => segment.fromNodeId === inFlight.fromNodeId && segment.toNodeId === inFlight.toNodeId)
			: [];
		const hasUnsentRequests = this.requestQueue.length > 0 && !inFlight;
		const staleVisualPosition = !this.motion && this.visualNodeId !== visualTargetId;
		this.manualInputActive = false;
		this.requestQueue = inFlight ? [inFlight] : [];
		this.visualQueue = inFlight ? sentVisualQueue : hasUnsentRequests ? [] : this.visualQueue;
		if (staleVisualMotion || staleVisualPosition) {
			this.visualNodeId = visualTargetId;
			this.motion = null;
		}
	}

	public acknowledge(result: DungeonMovementAck): {
		accepted: boolean;
		halted: boolean;
		expectedNodeId: string | null;
		confirmedNodeId: string;
	} {
		const request = this.inFlight;
		if (!request) {
			this.confirmedNodeId = result.nodeId;
			return { accepted: false, halted: Boolean(result.haltedReason), expectedNodeId: null, confirmedNodeId: result.nodeId };
		}
		this.inFlight = null;
		if (this.requestQueue[0] === request) this.requestQueue.shift();
		else this.requestQueue = this.requestQueue.filter((candidate) => candidate !== request);

		this.confirmedNodeId = result.nodeId;
		const accepted = result.nodeId === request.toNodeId;
		const halted = Boolean(result.haltedReason);
		if (!accepted || halted) {
			this.requestQueue = [];
			this.visualQueue = [];
		}
		return { accepted, halted, expectedNodeId: request.toNodeId, confirmedNodeId: result.nodeId };
	}

	public reject(): string {
		this.manualInputActive = false;
		this.requestQueue = [];
		this.visualQueue = [];
		this.inFlight = null;
		return this.confirmedNodeId;
	}

	/** Drop local input/animation state when another client reports a new
	 * authoritative party position. The next response from an already-sent
	 * request is still reconciled by the view, but it cannot leave a stale
	 * buffered path behind. */
	public reconcileServerNode(nodeId: string): void {
		this.confirmedNodeId = nodeId;
		this.visualNodeId = nodeId;
		this.requestQueue = [];
		this.visualQueue = [];
		this.inFlight = null;
		this.motion = null;
		this.manualInputActive = false;
	}

	public resetVisualNode(nodeId: string): void {
		this.visualNodeId = nodeId;
		this.visualQueue = [];
		this.motion = null;
	}

	public setConfirmedNode(nodeId: string): void {
		this.confirmedNodeId = nodeId;
	}

	public queueServerPath(layout: DungeonGridLayout, pathNodeIds: readonly string[], targetNodeId: string, now: number): void {
		this.confirmedNodeId = targetNodeId;
		this.visualQueue = [];
		if (!layout.tiles.some((tile) => tile.node.id === targetNodeId) || !layout.tiles.some((tile) => tile.node.id === this.visualNodeId)) {
			// A floor transition changes the layout before the old floor can be
			// animated further. The new active-floor renderer will place the party
			// at the confirmed target on its first frame.
			this.visualNodeId = targetNodeId;
			this.motion = null;
			return;
		}
		let fromNodeId = this.projectedNodeId;
		const path = pathNodeIds.filter((nodeId, index, ids) => nodeId !== fromNodeId && ids.indexOf(nodeId) === index);
		for (const toNodeId of path) {
			if (!layout.tiles.some((tile) => tile.node.id === toNodeId)) continue;
			this.visualQueue.push({ fromNodeId, toNodeId, direction: directionBetween(layout, fromNodeId, toNodeId) });
			fromNodeId = toNodeId;
		}
		if (fromNodeId !== targetNodeId && layout.tiles.some((tile) => tile.node.id === targetNodeId)) {
			this.visualQueue.push({ fromNodeId, toNodeId: targetNodeId, direction: directionBetween(layout, fromNodeId, targetNodeId) });
		}
		this.startVisualIfIdle(now);
	}

	public advanceVisual(now: number): boolean {
		if (!this.motion || now - this.motion.startedAt < this.motion.durationMs) return false;
		this.visualNodeId = this.motion.toNodeId;
		this.motion = null;
		// A delayed render frame must not fast-forward through the entire queued
		// path. Start only the next hop now so every tile remains visible for a
		// complete animation interval.
		this.startVisualIfIdle(now);
		return true;
	}

	private startVisualIfIdle(now: number): void {
		if (this.motion || !this.visualQueue[0]) return;
		let segment = this.visualQueue.shift();
		if (!segment) return;
		if (segment.fromNodeId !== this.visualNodeId) segment = { ...segment, fromNodeId: this.visualNodeId };
		if (segment.fromNodeId === segment.toNodeId) {
			this.visualNodeId = segment.toNodeId;
			this.startVisualIfIdle(now);
			return;
		}
		if (this.durationMs === 0) {
			this.visualNodeId = segment.toNodeId;
			this.startVisualIfIdle(now);
			return;
		}
		this.motion = { ...segment, startedAt: now, durationMs: this.durationMs };
	}
}
