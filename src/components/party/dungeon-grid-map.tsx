import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ArrowRightLeft, Check, Crown, Footprints, Gamepad2, LogIn, LogOut, MapPin, Sparkles, Target } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import type { DungeonRoutePolicyInput, DungeonWalk, DungeonWalkInput, Party, PartyMap } from '#/lib/api';
import { cellAtScreen, followCamera, isInteractiveCell } from '#/lib/dungeon-camera';
import type { CameraState, StagePoint } from '#/lib/dungeon-camera';
import { createDungeonGridLayout, directionBetween, tileCenter } from '#/lib/dungeon-grid';
import type { DungeonGridLayout, DungeonGridTileKind } from '#/lib/dungeon-grid';
import { DUNGEON_LEGEND_KINDS, dungeonMarkerPresentation, dungeonMarkerPresentationForTile } from '#/lib/dungeon-markers';
import { DUNGEON_MANUAL_REPEAT_MS, DUNGEON_STEP_DURATION_MS, sampleDungeonMotion } from '#/lib/dungeon-motion';
import type { DungeonRecoveryMotion } from '#/lib/dungeon-motion';
import { DungeonMovementController } from '#/lib/dungeon-movement';
import type { DungeonMoveStep } from '#/lib/dungeon-movement';
import type { PartyTravelerDirection } from '#/lib/game-art';
import { DungeonPixiScene } from './dungeon-pixi-scene';
import { prefersReducedMotion } from '#/lib/gameplay-navigation';

export interface DungeonWalkMutation {
	isPending: boolean;
	error: Error | null;
	mutateAsync: (input: DungeonWalkInput) => Promise<DungeonWalk>;
}

export interface DungeonNavigatorControls {
	userId: string;
	members: Party['members'];
	claimMutation: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: () => Promise<unknown>;
	};
	releaseMutation: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: () => Promise<unknown>;
	};
	transferMutation: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: (input: { targetUserId: string }) => Promise<unknown>;
	};
	voteRouteMutation?: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: (input: DungeonRoutePolicyInput) => Promise<unknown>;
	};
	setRouteIntentMutation?: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: (input: DungeonRoutePolicyInput) => Promise<unknown>;
	};
	clearRouteIntentMutation?: {
		isPending: boolean;
		error: Error | null;
		mutateAsync: () => Promise<unknown>;
	};
}

const KEY_DIRECTIONS: Record<string, { direction: PartyTravelerDirection; step: DungeonMoveStep }> = {
	ArrowUp: { direction: 'north', step: 'up' },
	ArrowDown: { direction: 'south', step: 'down' },
	ArrowLeft: { direction: 'west', step: 'left' },
	ArrowRight: { direction: 'east', step: 'right' },
};

type DungeonRoutePolicy = DungeonRoutePolicyInput['policy'];

const ROUTE_POLICY_LABELS: Record<DungeonRoutePolicy, string> = {
	mission: 'Complete mission',
	explore: 'Explore safely',
	treasure: 'Find treasure',
	rest: 'Recover at camp',
};

const ROUTE_POLICY_DESCRIPTIONS: Record<DungeonRoutePolicy, string> = {
	mission: 'Advance through the dungeon and resolve its final objective.',
	explore: 'Reveal safe ground, then return to the mission.',
	treasure: 'Find the nearest known cache, then return to the mission.',
	rest: 'Recover at the nearest known campsite, then return to the mission.',
};

const ROUTE_POLICY_KEYS = ['mission', 'explore', 'treasure', 'rest'] as const satisfies readonly DungeonRoutePolicy[];

interface DungeonView {
	layout: DungeonGridLayout;
	selectedNodeId: string;
}

function pointForNode(layout: DungeonGridLayout, nodeId: string, fallback: StagePoint): StagePoint {
	const tile = layout.tiles.find((candidate) => candidate.node.id === nodeId);
	return tile ? tileCenter(layout, tile) : fallback;
}

function movementHintForTile(tile: DungeonGridLayout['tiles'][number] | null | undefined): string {
	if (!tile) return 'Arrow keys step one tile at a time · Explore spends Explore energy';
	if (tile.node.encounterCleared && (tile.kind === 'spawn' || tile.kind === 'boss')) {
		return 'Encounter cleared · the passage is safe to cross';
	}
	switch (tile.kind) {
		case 'goal':
			return 'Mission landmark reached · resolve the event above to return to the overworld';
		case 'rest':
		case 'treasure':
			return `${dungeonMarkerPresentation(tile.kind).label} reached · resolve the event above before exploring again`;
		case 'spawn':
			return 'Encounter reached · resolve the battle before exploring again';
		case 'boss':
			return 'Optional boss reached · save a card plan to engage it before exploring again';
		default:
			return 'Arrow keys step one tile at a time · Explore spends Explore energy';
	}
}

function dungeonLegendGlyph(kind: DungeonGridTileKind): string {
	switch (kind) {
		case 'entry':
			return '↩';
		case 'goal':
			return '◆';
		case 'stairs-down':
			return '↓';
		case 'stairs-up':
			return '↑';
		case 'rest':
			return '⌂';
		case 'treasure':
			return '◇';
		case 'boss':
			return '☠';
		case 'spawn':
			return '!';
		default:
			return '·';
	}
}

function isDungeonRoutePolicy(value: string): value is DungeonRoutePolicy {
	return ROUTE_POLICY_KEYS.some((policy) => policy === value);
}

function navigatorHeading(isNavigator: boolean, canClaim: boolean, leaseExpired: boolean, activeName: string): string {
	if (isNavigator) return 'You are the Navigator';
	if (canClaim) return leaseExpired ? 'Navigator lease expired' : 'No Navigator assigned';
	return `${activeName} is navigating`;
}

function navigatorDescription(isNavigator: boolean, canClaim: boolean): string {
	if (isNavigator) return 'Your movement controls are live for this floor.';
	if (canClaim) return 'Take the lead to move the shared party marker.';
	return 'You can observe the floor while the Navigator moves.';
}

function advanceButtonLabel(canNavigate: boolean, busy: boolean): string {
	if (!canNavigate) return 'Navigator controls movement';
	return busy ? 'Advancing…' : 'Advance once';
}

export function DungeonGridMap({
	map,
	walkMutation,
	navigatorControls,
	readOnly = false,
	partyMemberCount,
}: {
	map: PartyMap;
	walkMutation?: DungeonWalkMutation;
	navigatorControls?: DungeonNavigatorControls;
	readOnly?: boolean;
	partyMemberCount?: number;
}) {
	const layout = useMemo(() => createDungeonGridLayout(map), [map]);
	const viewportRef = useRef<HTMLDivElement>(null);
	const cameraRef = useRef<CameraState | null>(null);
	const [movement] = useState(
		() => new DungeonMovementController(map.currentNodeId, prefersReducedMotion() ? 0 : DUNGEON_STEP_DURATION_MS),
	);
	const [selectedNodeId, setSelectedNodeId] = useState(map.currentNodeId);
	const [displayedNodeId, setDisplayedNodeId] = useState(map.currentNodeId);
	const [traveling, setTraveling] = useState(false);
	const [spriteDirection, setSpriteDirection] = useState<PartyTravelerDirection>('south');
	const [autoBusy, setAutoBusy] = useState(false);
	const [recoveryCount, setRecoveryCount] = useState(0);
	const [pixiReady, setPixiReady] = useState(false);
	const [pixiError, setPixiError] = useState<string | null>(null);
	const [now, setNow] = useState(() => Date.now());
	const [transferTargetUserId, setTransferTargetUserId] = useState<string | null>(null);
	const [routePolicy, setRoutePolicy] = useState<DungeonRoutePolicy>('mission');

	const leaseExpired = Boolean(map.navigation?.leaseExpiresAt && Date.parse(map.navigation.leaseExpiresAt) <= now);
	const isNavigator = navigatorControls ? map.navigation?.navigatorUserId === navigatorControls.userId && !leaseExpired : !readOnly;
	const canNavigate = !readOnly && isNavigator;
	const canClaimNavigator = Boolean(navigatorControls && !readOnly && (!map.navigation?.navigatorUserId || leaseExpired));
	const activeNavigatorName = map.navigation?.navigatorDisplayName ?? 'Another party member';

	const viewRef = useRef<DungeonView>({ layout, selectedNodeId });
	const currentMapNodeRef = useRef(map.currentNodeId);
	const directionRef = useRef<PartyTravelerDirection>(spriteDirection);
	const recoveryRef = useRef<DungeonRecoveryMotion | null>(null);
	const mountedRef = useRef(true);
	const walkMutationRef = useRef(walkMutation);
	const autoBusyRef = useRef(false);
	const publishedNodeRef = useRef(map.currentNodeId);
	const publishedTravelingRef = useRef(false);
	const heldRef = useRef<{ mapping: (typeof KEY_DIRECTIONS)[string]; timer: number } | null>(null);
	const heldGenerationRef = useRef(0);
	const pumpRequestsRef = useRef<(() => void) | null>(null);

	const publishVisualState = useCallback(() => {
		const snapshot = movement.snapshot;
		const nextDisplayedNodeId = snapshot.motion?.toNodeId ?? snapshot.visualNodeId;
		const nextTraveling = Boolean(snapshot.motion || recoveryRef.current);
		if (publishedNodeRef.current !== nextDisplayedNodeId) {
			publishedNodeRef.current = nextDisplayedNodeId;
			setDisplayedNodeId(nextDisplayedNodeId);
		}
		if (publishedTravelingRef.current !== nextTraveling) {
			publishedTravelingRef.current = nextTraveling;
			setTraveling(nextTraveling);
		}
		const nextDirection = snapshot.motion?.direction;
		if (nextDirection && directionRef.current !== nextDirection) {
			directionRef.current = nextDirection;
			setSpriteDirection(nextDirection);
		}
	}, [movement]);

	useLayoutEffect(() => {
		viewRef.current = { layout, selectedNodeId };
		currentMapNodeRef.current = map.currentNodeId;
		walkMutationRef.current = walkMutation;
	}, [layout, map.currentNodeId, selectedNodeId, walkMutation]);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (!navigatorControls) return;
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, [navigatorControls?.userId]);

	useEffect(() => {
		const otherMember = navigatorControls?.members.find((member) => member.userId !== navigatorControls.userId);
		setTransferTargetUserId((current) =>
			current && navigatorControls?.members.some((member) => member.userId === current) ? current : (otherMember?.userId ?? null),
		);
	}, [map.navigation?.navigatorUserId, navigatorControls?.members, navigatorControls?.userId]);

	useEffect(() => {
		const intent = map.navigation?.routeIntent;
		setRoutePolicy(intent?.policy ?? 'mission');
	}, [map.navigation?.routeIntent?.policy]);

	const clearHeld = useCallback(() => {
		const held = heldRef.current;
		if (held) window.clearInterval(held.timer);
		heldRef.current = null;
		heldGenerationRef.current += 1;
		movement.stopManualInput();
	}, [movement]);

	const beginRecovery = useCallback(
		(targetNodeId: string, frameNow: number, fromPoint?: StagePoint) => {
			const currentLayout = viewRef.current.layout;
			const fallback = currentLayout.currentTile
				? tileCenter(currentLayout, currentLayout.currentTile)
				: { x: currentLayout.width / 2, y: currentLayout.height / 2 };
			const toPoint = pointForNode(currentLayout, targetNodeId, fallback);
			const startPoint = fromPoint ?? sampleDungeonMotion(currentLayout, movement, recoveryRef.current, frameNow).point;
			const before = movement.snapshot;
			const fromNodeId = before.motion?.fromNodeId ?? before.visualNodeId;
			const nextDirection = directionBetween(currentLayout, fromNodeId, targetNodeId);
			movement.resetVisualNode(targetNodeId);
			setSelectedNodeId(targetNodeId);
			setRecoveryCount((count) => count + 1);
			if (prefersReducedMotion() || Math.hypot(startPoint.x - toPoint.x, startPoint.y - toPoint.y) < 0.5) {
				recoveryRef.current = null;
			} else {
				recoveryRef.current = {
					from: startPoint,
					to: toPoint,
					toNodeId: targetNodeId,
					startedAt: frameNow,
					durationMs: DUNGEON_STEP_DURATION_MS,
				};
			}
			if (nextDirection) {
				directionRef.current = nextDirection;
				setSpriteDirection(nextDirection);
			}
			publishVisualState();
		},
		[movement, publishVisualState],
	);

	const pumpRequests = useCallback(() => {
		const intent = movement.takeNextRequest();
		if (!intent) {
			publishVisualState();
			return;
		}
		const mutation = walkMutationRef.current;
		if (!mutation) return;
		movement.setDuration(prefersReducedMotion() ? 0 : DUNGEON_STEP_DURATION_MS);
		void mutation
			.mutateAsync({ mode: 'manual', steps: [intent.step] })
			.then((result) => {
				if (!mountedRef.current) return;
				const frameNow = performance.now();
				const fromPoint = sampleDungeonMotion(viewRef.current.layout, movement, recoveryRef.current, frameNow).point;
				const acknowledgement = movement.acknowledge(result);
				if (!acknowledgement.accepted || acknowledgement.halted) {
					beginRecovery(acknowledgement.confirmedNodeId, frameNow, fromPoint);
					return;
				}
				publishVisualState();
				pumpRequestsRef.current?.();
			})
			.catch(() => {
				if (!mountedRef.current) return;
				clearHeld();
				const frameNow = performance.now();
				const fromPoint = sampleDungeonMotion(viewRef.current.layout, movement, recoveryRef.current, frameNow).point;
				const targetNodeId = movement.reject();
				beginRecovery(targetNodeId, frameNow, fromPoint);
			});
	}, [beginRecovery, clearHeld, movement, publishVisualState]);
	useLayoutEffect(() => {
		pumpRequestsRef.current = pumpRequests;
	}, [pumpRequests]);

	const advancePolicy = useCallback(() => {
		if (!canNavigate || autoBusyRef.current || movement.isBusy) return;
		const mutation = walkMutationRef.current;
		if (!mutation) return;
		movement.setDuration(prefersReducedMotion() ? 0 : DUNGEON_STEP_DURATION_MS);
		autoBusyRef.current = true;
		setAutoBusy(true);
		void mutation
			.mutateAsync({ mode: 'auto' })
			.then((result) => {
				if (!mountedRef.current) return;
				const frameNow = performance.now();
				movement.queueServerPath(viewRef.current.layout, result.pathNodeIds, result.nodeId, frameNow);
				setSelectedNodeId(result.nodeId);
				publishVisualState();
			})
			.catch(() => clearHeld())
			.finally(() => {
				autoBusyRef.current = false;
				if (mountedRef.current) setAutoBusy(false);
			});
	}, [canNavigate, clearHeld, movement, publishVisualState]);

	const stepOnce = useCallback(
		(mapping: (typeof KEY_DIRECTIONS)[string]) => {
			if (!walkMutationRef.current || !canNavigate || autoBusyRef.current || recoveryRef.current) return;
			movement.setDuration(prefersReducedMotion() ? 0 : DUNGEON_STEP_DURATION_MS);
			const intent = movement.enqueueManual(layout, mapping.direction, mapping.step, performance.now());
			if (!intent) return;
			setSelectedNodeId(intent.toNodeId);
			directionRef.current = intent.direction;
			setSpriteDirection(intent.direction);
			publishVisualState();
			pumpRequestsRef.current?.();
		},
		[canNavigate, layout, movement, publishVisualState],
	);
	const stepOnceRef = useRef(stepOnce);
	useEffect(() => {
		stepOnceRef.current = stepOnce;
	}, [stepOnce]);

	const startHeld = useCallback(
		(mapping: (typeof KEY_DIRECTIONS)[string]) => {
			clearHeld();
			stepOnceRef.current(mapping);
			const generation = heldGenerationRef.current;
			const timer = window.setInterval(() => {
				if (heldGenerationRef.current !== generation) return;
				stepOnceRef.current(mapping);
			}, DUNGEON_MANUAL_REPEAT_MS);
			heldRef.current = { mapping, timer };
		},
		[clearHeld],
	);

	useEffect(() => () => clearHeld(), [clearHeld]);
	useEffect(() => {
		const stopHeldInput = () => clearHeld();
		const stopHeldInputOnKeyUp = (event: globalThis.KeyboardEvent) => {
			if (event.key in KEY_DIRECTIONS) stopHeldInput();
		};
		window.addEventListener('blur', stopHeldInput);
		window.addEventListener('keyup', stopHeldInputOnKeyUp, true);
		return () => {
			window.removeEventListener('blur', stopHeldInput);
			window.removeEventListener('keyup', stopHeldInputOnKeyUp, true);
		};
	}, [clearHeld]);
	useEffect(() => {
		if (walkMutation?.error) clearHeld();
	}, [clearHeld, walkMutation?.error]);

	useEffect(() => {
		if (!navigatorControls || canNavigate) return;
		clearHeld();
		if (autoBusyRef.current) {
			autoBusyRef.current = false;
			setAutoBusy(false);
		}
		publishVisualState();
	}, [canNavigate, clearHeld, navigatorControls?.userId, publishVisualState]);

	useEffect(() => {
		const currentNodeId = map.currentNodeId;
		const snapshot = movement.snapshot;
		if (currentNodeId === snapshot.confirmedNodeId) return;
		if (snapshot.projectedNodeId !== currentNodeId) {
			clearHeld();
			movement.reconcileServerNode(currentNodeId);
			setSelectedNodeId(currentNodeId);
			publishVisualState();
			return;
		}
		if (recoveryRef.current) return;
		if (snapshot.inFlight?.toNodeId === currentNodeId || snapshot.projectedNodeId === currentNodeId) return;
		movement.setDuration(prefersReducedMotion() ? 0 : DUNGEON_STEP_DURATION_MS);
		movement.queueServerPath(layout, [currentNodeId], currentNodeId, performance.now());
		setSelectedNodeId(currentNodeId);
		publishVisualState();
	}, [layout, map.currentNodeId, movement, publishVisualState]);

	useEffect(() => {
		if (!layout.tiles.some((tile) => tile.node.id === selectedNodeId)) setSelectedNodeId(map.currentNodeId);
	}, [layout, map.currentNodeId, selectedNodeId]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (!(event.key in KEY_DIRECTIONS)) return;
		event.preventDefault();
		if (event.repeat) return;
		if (!canNavigate) return;
		startHeld(KEY_DIRECTIONS[event.key]);
	};
	const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
		if (!(event.key in KEY_DIRECTIONS)) return;
		clearHeld();
	};

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		const currentLayout = viewRef.current.layout;
		const rect = event.currentTarget.getBoundingClientRect();
		const point = sampleDungeonMotion(currentLayout, movement, recoveryRef.current, performance.now()).point;
		const camera =
			cameraRef.current ??
			followCamera(
				point,
				{ width: event.currentTarget.clientWidth, height: event.currentTarget.clientHeight },
				{ width: currentLayout.width, height: currentLayout.height },
			);
		const cell = cellAtScreen(currentLayout, camera, { x: event.clientX - rect.left, y: event.clientY - rect.top });
		if (!cell || !isInteractiveCell(cell)) return;
		const tile = currentLayout.tiles.find(
			(candidate) => candidate.floorNo === cell.floorNo && candidate.col === cell.col && candidate.row === cell.row,
		);
		if (tile) setSelectedNodeId(tile.node.id);
	};

	const handlePixiReady = useCallback((ready: boolean) => {
		setPixiReady(ready);
		if (ready) setPixiError(null);
	}, []);
	const handleRecoveryComplete = useCallback(
		(toNodeId: string, frameNow: number) => {
			if (!recoveryRef.current) return;
			recoveryRef.current = null;
			movement.resetVisualNode(toNodeId);
			const externalNodeId = currentMapNodeRef.current;
			if (externalNodeId !== movement.snapshot.confirmedNodeId && movement.snapshot.queuedRequestCount === 0) {
				movement.queueServerPath(viewRef.current.layout, [externalNodeId], externalNodeId, frameNow);
			}
			publishVisualState();
		},
		[movement, publishVisualState],
	);
	const handlePixiError = useCallback((message: string) => {
		setPixiReady(false);
		setPixiError(message);
	}, []);

	const selectedTile = layout.tiles.find((tile) => tile.node.id === selectedNodeId) ?? layout.currentTile;
	const displayedTile = layout.tiles.find((tile) => tile.node.id === displayedNodeId) ?? layout.currentTile;
	const selectedMarker = selectedTile ? dungeonMarkerPresentationForTile(selectedTile) : null;
	const completedObjectiveIds = useMemo(() => new Set(map.completedObjectiveIds), [map.completedObjectiveIds]);
	const activeObjective = map.objectives.find((objective) => objective.required && !completedObjectiveIds.has(objective.id));
	const floorLabel = layout.activeFloorNo === null ? 'Uncharted floor' : `Floor ${layout.activeFloorNo + 1}`;
	const movementHint = movementHintForTile(displayedTile);
	const movementBusy = autoBusy || movement.isBusy || Boolean(walkMutation?.isPending);
	const transferMembers = navigatorControls?.members.filter((member) => member.userId !== navigatorControls.userId) ?? [];
	const navigatorError =
		navigatorControls?.claimMutation.error ?? navigatorControls?.releaseMutation.error ?? navigatorControls?.transferMutation.error ?? null;
	const routeError =
		navigatorControls?.voteRouteMutation?.error ??
		navigatorControls?.setRouteIntentMutation?.error ??
		navigatorControls?.clearRouteIntentMutation?.error ??
		navigatorError;
	const routeIntent = map.navigation?.routeIntent ?? null;
	const routeVotes = map.navigation?.routeVotes ?? [];
	const currentUserRouteVote = routeVotes.find((vote) => vote.userId === navigatorControls?.userId);
	const routeActionsAvailable = Boolean(navigatorControls?.voteRouteMutation && !readOnly);
	const routeIntentLabel = routeIntent ? ROUTE_POLICY_LABELS[routeIntent.policy] : ROUTE_POLICY_LABELS.mission;
	const partySize = Math.max(1, partyMemberCount ?? navigatorControls?.members.length ?? 1);

	if (!layout.currentTile) {
		return (
			<div className="world-map-empty" role="status">
				<MapPin className="size-5" aria-hidden="true" />
				<span>The party has not entered this floor yet.</span>
			</div>
		);
	}

	return (
		<div
			className="dungeon-grid"
			data-testid="dungeon-grid"
			data-party-node-id={displayedNodeId}
			data-party-traveling={traveling ? 'true' : 'false'}
			data-party-size={partySize}
			data-party-recovery-count={recoveryCount}
			data-dungeon-floor={layout.activeFloorNo}
			data-tile-balance={map.tileBalance}
			data-dungeon-theme="atmospheric"
			data-dungeon-renderer="pixi"
			data-dungeon-renderer-ready={pixiReady ? 'true' : 'false'}
		>
			<div
				ref={viewportRef}
				className="dungeon-grid-viewport"
				data-testid="dungeon-grid-viewport"
				tabIndex={0}
				role="application"
				aria-label={`${map.currentMap.name}, ${floorLabel}. ${canNavigate ? 'Use arrow keys to step one tile at a time.' : 'Observe the shared party position while the Navigator moves.'}`}
				onKeyDown={handleKeyDown}
				onKeyUpCapture={handleKeyUp}
				onKeyUp={handleKeyUp}
				onPointerDown={handlePointerDown}
				onBlur={clearHeld}
			>
				<DungeonPixiScene
					layout={layout}
					movement={movement}
					direction={spriteDirection}
					partyMemberCount={partySize}
					recovery={recoveryRef.current}
					viewportRef={viewportRef}
					cameraRef={cameraRef}
					onReady={handlePixiReady}
					onError={handlePixiError}
					onVisualStateChange={publishVisualState}
					onRecoveryComplete={handleRecoveryComplete}
				/>
				{pixiError ? (
					<div className="dungeon-grid-renderer-error" role="alert">
						<strong>Dungeon renderer unavailable</strong>
						<span>This device needs WebGL to display the dungeon.</span>
						<small>{pixiError}</small>
					</div>
				) : null}
				<div className="dungeon-grid-hud" aria-label={`${floorLabel}, ${map.tileBalance} Explore energy available`}>
					<div className="dungeon-grid-hud-title">
						<span className="dungeon-grid-hud-kicker">{map.currentMap.name}</span>
						<strong>{floorLabel}</strong>
					</div>
					<div className="dungeon-grid-hud-balance">
						<Sparkles className="size-4" aria-hidden="true" />
						<span>
							<strong>{map.tileBalance}</strong> Explore energy
						</span>
					</div>
					<div className="dungeon-grid-hud-objective" data-testid="dungeon-objective">
						<span className="dungeon-grid-hud-objective-label">Mission objective</span>
						<strong>{activeObjective?.displayName ?? 'Dungeon mission complete'}</strong>
					</div>
				</div>
				<span className="sr-only" role="status" data-testid="dungeon-live-status">
					Party is at {displayedNodeId} on {floorLabel}
				</span>
			</div>

			{navigatorControls ? (
				<div
					className="dungeon-grid-navigator"
					data-testid="dungeon-navigator"
					data-navigation-mode={isNavigator ? 'active' : canClaimNavigator ? 'available' : 'observing'}
					aria-live="polite"
				>
					<div className="dungeon-grid-navigator-status">
						<Crown className="size-4" aria-hidden="true" />
						<div>
							<span className="dungeon-grid-navigator-kicker">Party navigation</span>
							<strong>{navigatorHeading(isNavigator, canClaimNavigator, leaseExpired, activeNavigatorName)}</strong>
							<small>{navigatorDescription(isNavigator, canClaimNavigator)}</small>
						</div>
					</div>
					<div className="dungeon-grid-navigator-actions">
						{canClaimNavigator ? (
							<button
								type="button"
								className="dungeon-grid-navigator-button"
								disabled={navigatorControls.claimMutation.isPending}
								onClick={() => void navigatorControls.claimMutation.mutateAsync()}
								data-testid="dungeon-navigator-claim"
							>
								<LogIn className="size-4" aria-hidden="true" />
								{navigatorControls.claimMutation.isPending ? 'Taking lead…' : 'Take the lead'}
							</button>
						) : null}
						{isNavigator ? (
							<>
								{transferMembers.length > 0 ? (
									<div className="dungeon-grid-navigator-transfer">
										<label htmlFor="dungeon-navigator-target">Pass lead</label>
										<select
											id="dungeon-navigator-target"
											value={transferTargetUserId ?? undefined}
											onChange={(event) => setTransferTargetUserId(event.target.value)}
										>
											{transferMembers.map((member) => (
												<option key={member.userId} value={member.userId}>
													{member.displayName ?? member.userId}
												</option>
											))}
										</select>
										<button
											type="button"
											className="dungeon-grid-navigator-button"
											disabled={navigatorControls.transferMutation.isPending || transferTargetUserId === null}
											onClick={() => {
												if (transferTargetUserId === null) return;
												void navigatorControls.transferMutation.mutateAsync({ targetUserId: transferTargetUserId });
											}}
											data-testid="dungeon-navigator-transfer"
										>
											<ArrowRightLeft className="size-4" aria-hidden="true" />
											{navigatorControls.transferMutation.isPending ? 'Passing…' : 'Pass'}
										</button>
									</div>
								) : null}
								<button
									type="button"
									className="dungeon-grid-navigator-button dungeon-grid-navigator-button-muted"
									disabled={navigatorControls.releaseMutation.isPending}
									onClick={() => void navigatorControls.releaseMutation.mutateAsync()}
									data-testid="dungeon-navigator-release"
								>
									<LogOut className="size-4" aria-hidden="true" />
									{navigatorControls.releaseMutation.isPending ? 'Releasing…' : 'Release lead'}
								</button>
							</>
						) : null}
					</div>
					{navigatorError ? <small className="dungeon-grid-navigator-error">{navigatorError.message}</small> : null}
				</div>
			) : null}

			{navigatorControls && (routeActionsAvailable || routeIntent) ? (
				<div className="dungeon-grid-route" data-testid="dungeon-route-intent">
					<div className="dungeon-grid-route-heading">
						<Target className="size-4" aria-hidden="true" />
						<div>
							<span className="dungeon-grid-navigator-kicker">Shared route plan</span>
							<strong>{routeIntent ? `Automatic policy: ${routeIntentLabel}` : 'Mission is the default policy'}</strong>
							<small>
								{routeIntent
									? ROUTE_POLICY_DESCRIPTIONS[routeIntent.policy]
									: 'Everyone can suggest a policy. The Navigator decides what the daily expedition follows.'}
							</small>
						</div>
					</div>
					{routeActionsAvailable ? (
						<div className="dungeon-grid-route-controls">
							<label htmlFor="dungeon-route-policy">Route policy</label>
							<select
								id="dungeon-route-policy"
								value={routePolicy}
								onChange={(event) => {
									if (isDungeonRoutePolicy(event.currentTarget.value)) setRoutePolicy(event.currentTarget.value);
								}}
							>
								{ROUTE_POLICY_KEYS.map((policy) => (
									<option key={policy} value={policy}>
										{ROUTE_POLICY_LABELS[policy]}
									</option>
								))}
							</select>
							<div className="dungeon-grid-route-buttons">
								<button
									type="button"
									className="dungeon-grid-navigator-button"
									disabled={Boolean(navigatorControls.voteRouteMutation?.isPending)}
									onClick={() => void navigatorControls.voteRouteMutation?.mutateAsync({ policy: routePolicy })}
									data-testid="dungeon-route-vote"
								>
									<Check className="size-4" aria-hidden="true" />
									{currentUserRouteVote?.policy === routePolicy ? 'Voted' : 'Vote'}
								</button>
								{isNavigator && navigatorControls.setRouteIntentMutation ? (
									<button
										type="button"
										className="dungeon-grid-navigator-button dungeon-grid-route-confirm"
										disabled={navigatorControls.setRouteIntentMutation.isPending}
										onClick={() => void navigatorControls.setRouteIntentMutation?.mutateAsync({ policy: routePolicy })}
										data-testid="dungeon-route-set"
									>
										<Target className="size-4" aria-hidden="true" />
										{navigatorControls.setRouteIntentMutation.isPending ? 'Setting…' : 'Set route'}
									</button>
								) : null}
								{isNavigator && routeIntent && navigatorControls.clearRouteIntentMutation ? (
									<button
										type="button"
										className="dungeon-grid-navigator-button dungeon-grid-navigator-button-muted"
										disabled={navigatorControls.clearRouteIntentMutation.isPending}
										onClick={() => void navigatorControls.clearRouteIntentMutation?.mutateAsync()}
										data-testid="dungeon-route-clear"
									>
										{navigatorControls.clearRouteIntentMutation.isPending ? 'Clearing…' : 'Clear route'}
									</button>
								) : null}
							</div>
						</div>
					) : null}
					<div className="dungeon-grid-route-summary">
						<span>
							{routeVotes.length} suggestion{routeVotes.length === 1 ? '' : 's'} from the party
						</span>
						{routeIntent ? <span>Navigator policy: {routeIntentLabel}</span> : <span>Autoplay advances the mission by default.</span>}
					</div>
					{routeError ? <small className="dungeon-grid-navigator-error">{routeError.message}</small> : null}
				</div>
			) : null}

			{walkMutation && !readOnly ? (
				<div className="dungeon-grid-actions">
					<button
						type="button"
						className="dungeon-grid-explore-button"
						disabled={movementBusy || !canNavigate}
						onClick={advancePolicy}
						data-testid="dungeon-advance"
					>
						<Footprints className="size-4" aria-hidden="true" />
						{advanceButtonLabel(canNavigate, autoBusy || walkMutation.isPending)}
					</button>
					<span className="dungeon-grid-hint">{movementHint}</span>
					<div className="dungeon-grid-dpad" aria-label="Touch movement controls">
						<span className="dungeon-grid-dpad-label">
							<Gamepad2 className="size-3" aria-hidden="true" /> Step controls
						</span>
						<div className="dungeon-grid-dpad-pad">
							<button
								type="button"
								aria-label="Move up"
								disabled={movementBusy || !canNavigate}
								onClick={() => stepOnce(KEY_DIRECTIONS.ArrowUp)}
								data-testid="dungeon-step-up"
							>
								↑
							</button>
							<div>
								<button
									type="button"
									aria-label="Move left"
									disabled={movementBusy || !canNavigate}
									onClick={() => stepOnce(KEY_DIRECTIONS.ArrowLeft)}
									data-testid="dungeon-step-left"
								>
									←
								</button>
								<button
									type="button"
									aria-label="Move down"
									disabled={movementBusy || !canNavigate}
									onClick={() => stepOnce(KEY_DIRECTIONS.ArrowDown)}
									data-testid="dungeon-step-down"
								>
									↓
								</button>
								<button
									type="button"
									aria-label="Move right"
									disabled={movementBusy || !canNavigate}
									onClick={() => stepOnce(KEY_DIRECTIONS.ArrowRight)}
									data-testid="dungeon-step-right"
								>
									→
								</button>
							</div>
						</div>
					</div>
					{walkMutation.error ? <Badge className="border-red-400 bg-red-950/60 text-red-200">{walkMutation.error.message}</Badge> : null}
				</div>
			) : null}

			<details className="dungeon-grid-secondary" open>
				<summary>Map details and marker legend</summary>
				<div className="dungeon-grid-legend" aria-label="Dungeon marker legend">
					<span className="dungeon-grid-legend-title">What the markers mean</span>
					<div className="dungeon-grid-legend-items">
						{DUNGEON_LEGEND_KINDS.map((kind) => {
							const marker = dungeonMarkerPresentation(kind);
							return (
								<div className="dungeon-grid-legend-item" key={kind} data-marker-role={marker.role}>
									<span className="dungeon-grid-legend-swatch" aria-hidden="true">
										{dungeonLegendGlyph(kind)}
									</span>
									<span>
										<strong>{marker.label}</strong>
										<small>{marker.description}</small>
									</span>
								</div>
							);
						})}
					</div>
				</div>

				<div className="dungeon-grid-inspector" data-testid="dungeon-grid-inspector">
					{selectedTile ? (
						<>
							<p className="dungeon-grid-inspector-title">{selectedTile.node.name}</p>
							<Badge data-marker-role={selectedMarker?.role}>{selectedMarker?.label}</Badge>
							<Badge>{selectedTile.node.id === displayedNodeId ? 'Your position' : 'Explored tile'}</Badge>
							<p className="dungeon-grid-inspector-description">{selectedMarker?.description}</p>
						</>
					) : null}
				</div>
			</details>
		</div>
	);
}
