import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { BookOpen, Castle, Gem, Home, MapPin, Moon, Route as RouteIcon, Shield, Sparkles, Swords } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import type { PartyMap } from '#/lib/api';
import { gameplayBackgroundArt, partyTravelerArt } from '#/lib/game-art';
import type { PartyTravelerDirection } from '#/lib/game-art';
import { createInteriorMapLayout, createInteriorMapTravel } from '#/lib/interior-map';
import type { InteriorMapLayout, InteriorMapLayoutNode, InteriorMapTravel } from '#/lib/interior-map';
import { getAdjacentMapNodeId, mapDirectionForKey } from '#/lib/map-navigation';

type IconComponent = ComponentType<{ className?: string }>;
const partyTravelDurationMs = 1000;

interface ActiveInteriorMapTravel extends InteriorMapTravel {
	key: number;
	started: boolean;
	supportsMotionPath: boolean;
}

function iconForInteriorNode(node: PartyMap['nodes'][number]): IconComponent {
	switch (node.mapMetadata.role) {
		case 'boss':
		case 'combat':
			return Swords;
		case 'treasure':
			return Gem;
		case 'puzzle':
			return Sparkles;
		case 'story':
			return BookOpen;
		case 'rest':
			return Moon;
		case 'shop':
		case 'hub':
			return Home;
		case 'entrance':
		case 'exit':
			return Castle;
		case 'shortcut':
			return Shield;
		case 'room':
		default:
			return node.nodeType === 'dungeon' ? Castle : RouteIcon;
	}
}

function stateLabel(state: InteriorMapLayoutNode['state']) {
	switch (state) {
		case 'current':
			return 'Current location';
		case 'next':
			return 'Next possible room';
		case 'revealed':
		default:
			return 'Revealed room';
	}
}

function readableRole(role: PartyMap['nodes'][number]['mapMetadata']['role']) {
	return role.replaceAll('-', ' ');
}

function locationLabel(mapType: PartyMap['currentMap']['mapType']) {
	return mapType === 'dungeon' ? 'Dungeon' : 'Village';
}

function eventLabel(eventType: string) {
	return `${eventType.charAt(0).toUpperCase()}${eventType.slice(1)} encounter`;
}

function floorLabel(mapType: PartyMap['currentMap']['mapType'], floorNo: number) {
	return mapType === 'village' ? 'Settlement hub' : `Floor ${floorNo + 1}`;
}

export function InteriorMap({ map }: { map: PartyMap }) {
	const layout = useMemo(() => createInteriorMapLayout(map), [map]);
	const [selectedNodeId, setSelectedNodeId] = useState(map.currentNodeId);
	const currentNodeRef = useRef<HTMLButtonElement>(null);
	const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
	const inspectorRef = useRef<HTMLDivElement>(null);
	const previousMapRef = useRef<{ currentNodeId: string; layout: InteriorMapLayout } | null>(null);
	const travelAnimationFrameRef = useRef<number | null>(null);
	const travelTimeoutRef = useRef<number | null>(null);
	const travelSequenceRef = useRef(0);
	const lastDirectionRef = useRef<PartyTravelerDirection>('south');
	const [travel, setTravel] = useState<ActiveInteriorMapTravel>();

	useEffect(() => {
		const previousMap = previousMapRef.current;
		previousMapRef.current = { currentNodeId: map.currentNodeId, layout };
		setSelectedNodeId(map.currentNodeId);
		currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

		if (!previousMap || previousMap.currentNodeId === map.currentNodeId) return;

		if (travelAnimationFrameRef.current !== null) window.cancelAnimationFrame(travelAnimationFrameRef.current);
		if (travelTimeoutRef.current !== null) window.clearTimeout(travelTimeoutRef.current);

		const nextTravel = createInteriorMapTravel(previousMap.layout, layout, previousMap.currentNodeId, map.currentNodeId);
		if (!nextTravel) {
			setTravel(undefined);
			return;
		}

		const supportsMotionPath =
			typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && window.CSS.supports('offset-path', 'path("M 0 0 L 1 1")');
		const key = ++travelSequenceRef.current;
		lastDirectionRef.current = nextTravel.direction;
		setTravel({ ...nextTravel, key, started: false, supportsMotionPath });

		travelAnimationFrameRef.current = window.requestAnimationFrame(() => {
			setTravel((current) => (current?.key === key ? { ...current, started: true } : current));
		});
		travelTimeoutRef.current = window.setTimeout(() => {
			setTravel((current) => (current?.key === key ? undefined : current));
			travelAnimationFrameRef.current = null;
			travelTimeoutRef.current = null;
		}, partyTravelDurationMs);
	}, [layout, map.currentNodeId]);

	useEffect(() => {
		return () => {
			if (travelAnimationFrameRef.current !== null) window.cancelAnimationFrame(travelAnimationFrameRef.current);
			if (travelTimeoutRef.current !== null) window.clearTimeout(travelTimeoutRef.current);
		};
	}, []);

	const selectedNode =
		layout.nodes.find((item) => item.node.id === selectedNodeId) ?? layout.nodes.find((item) => item.state === 'current');
	const currentNode = layout.nodes.find((item) => item.node.id === map.currentNodeId);
	const selectedEdge = selectedNode
		? map.edges.find((edge) => edge.fromNodeId === map.currentNodeId && edge.toNodeId === selectedNode.node.id)
		: undefined;
	const travelerDirection = travel?.direction ?? lastDirectionRef.current;
	const markerStyle: CSSProperties = travel
		? travel.supportsMotionPath
			? {
					left: 0,
					top: 0,
					offsetPath: `path('${travel.path}')`,
					offsetDistance: travel.started ? '100%' : '0%',
				}
			: {
					left: `${travel.started ? travel.to.x : travel.from.x}px`,
					top: `${travel.started ? travel.to.y : travel.from.y}px`,
				}
		: currentNode
			? { left: `${currentNode.x}px`, top: `${currentNode.y}px` }
			: {};
	const markerClassName = [
		'interior-map-party-marker',
		travel ? 'interior-map-party-marker-traveling' : '',
		travel?.supportsMotionPath ? 'interior-map-party-marker-motion-path' : '',
		travel && !travel.supportsMotionPath ? 'interior-map-party-marker-fallback' : '',
	]
		.filter(Boolean)
		.join(' ');
	const selectNode = (nodeId: string, focusInspector = false) => {
		setSelectedNodeId(nodeId);
		if (focusInspector) window.requestAnimationFrame(() => inspectorRef.current?.focus());
	};

	if (!selectedNode) {
		return (
			<div className="world-map-empty" role="status">
				<MapPin className="size-5" />
				<span>The interior map has not revealed a room yet.</span>
			</div>
		);
	}

	const interiorBackground = map.currentMap.mapType === 'village' ? gameplayBackgroundArt.village : gameplayBackgroundArt.dungeon;

	return (
		<div
			className={`interior-map interior-map-${map.currentMap.mapType}`}
			data-testid="interior-map"
			style={{ '--interior-map-backdrop': `url('${interiorBackground}')` } as CSSProperties}
		>
			<div
				className="interior-map-viewport"
				tabIndex={0}
				aria-label={`${map.currentMap.name}. Scroll to explore the ${locationLabel(map.currentMap.mapType).toLowerCase()} map.`}
			>
				<div className="interior-map-stage" style={{ width: `${layout.width}px`, minHeight: `${layout.height}px` }}>
					<div className="interior-map-backdrop" aria-hidden="true" />

					{layout.floors.map((floor) => (
						<div
							key={floor.floorNo}
							className="interior-map-floor"
							style={{ left: `${floor.x}px`, top: `${floor.y}px`, width: `${floor.width}px`, height: `${floor.height}px` }}
							aria-hidden="true"
						>
							<span className="interior-map-floor-label">{floorLabel(map.currentMap.mapType, floor.floorNo)}</span>
						</div>
					))}

					<svg
						className="interior-map-paths"
						style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
						viewBox={`0 0 ${layout.width} ${layout.height}`}
						aria-hidden="true"
						focusable="false"
					>
						<defs>
							<linearGradient id="interior-map-route" x1="0" x2="1">
								<stop offset="0" stopColor="var(--game-gold)" />
								<stop offset="1" stopColor="var(--game-verdigris)" />
							</linearGradient>
							<filter id="interior-map-glow" x="-50%" y="-50%" width="200%" height="200%">
								<feGaussianBlur stdDeviation="3" result="blur" />
								<feMerge>
									<feMergeNode in="blur" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>
						{layout.edges.map(({ edge, path, state }) => (
							<path
								key={edge.id}
								d={path}
								className={`interior-map-edge interior-map-edge-${state}`}
								stroke={state === 'active' ? 'url(#interior-map-route)' : 'var(--map-line-muted)'}
								filter={state === 'active' ? 'url(#interior-map-glow)' : undefined}
							/>
						))}
					</svg>

					{layout.nodes.map((item) => {
						const Icon = iconForInteriorNode(item.node);
						const selected = selectedNode.node.id === item.node.id;
						return (
							<button
								key={item.node.id}
								ref={(node) => {
									if (node) nodeRefs.current.set(item.node.id, node);
									else nodeRefs.current.delete(item.node.id);
									if (item.node.id === map.currentNodeId) currentNodeRef.current = node;
								}}
								type="button"
								className={`interior-map-room interior-map-room-${item.state}`}
								style={{ left: `${item.x}px`, top: `${item.y}px` }}
								aria-label={`${item.node.name}, ${stateLabel(item.state)}, ${readableRole(item.node.mapMetadata.role)}, ${floorLabel(map.currentMap.mapType, item.floorNo)}`}
								aria-pressed={selected}
								data-node-id={item.node.id}
								data-node-state={item.state}
								onClick={(event) => selectNode(item.node.id, event.detail > 0)}
								onKeyDown={(event) => {
									const direction = mapDirectionForKey(event.key);
									if (!direction) return;
									const nextNodeId = getAdjacentMapNodeId(layout.nodes, item.node.id, direction);
									if (!nextNodeId) return;
									event.preventDefault();
									selectNode(nextNodeId);
									nodeRefs.current.get(nextNodeId)?.focus();
								}}
							>
								<span className="interior-map-room-frame">
									<Icon className="interior-map-room-icon" aria-hidden="true" />
								</span>
								<span className="interior-map-room-role">{readableRole(item.node.mapMetadata.role)}</span>
								<span className="interior-map-room-name">{item.node.name}</span>
							</button>
						);
					})}

					{currentNode && (
						<div
							className={markerClassName}
							style={markerStyle}
							aria-hidden="true"
							data-testid="interior-map-party-marker"
							data-marker-direction={travelerDirection}
							data-marker-state={travel ? 'traveling' : 'idle'}
						>
							<span
								className="interior-map-party-marker-sprite"
								data-direction={travelerDirection}
								style={{
									backgroundImage: `url('${partyTravelerArt.src}')`,
									backgroundSize: partyTravelerArt.backgroundSize,
								}}
							/>
						</div>
					)}
				</div>
			</div>

			<div className="interior-map-meta">
				<div className="interior-map-legend" aria-label="Interior map legend">
					<span>
						<i className="interior-map-legend-dot interior-map-legend-current" /> Current
					</span>
					<span>
						<i className="interior-map-legend-dot interior-map-legend-next" /> Next room
					</span>
					<span>
						<i className="interior-map-legend-dot interior-map-legend-revealed" /> Revealed
					</span>
					<span>
						<i className="interior-map-legend-dot interior-map-legend-party" /> Party
					</span>
				</div>
				<span className="interior-map-scroll-hint">Choose a room when the daily route resolves</span>
			</div>

			<div
				ref={inspectorRef}
				className="world-map-inspector interior-map-inspector"
				tabIndex={-1}
				aria-live="polite"
				aria-atomic="true"
				data-testid="interior-map-inspector"
			>
				<div className="world-map-inspector-heading">
					<div>
						<p className="eyebrow">{locationLabel(map.currentMap.mapType)} interior</p>
						<h3>{selectedNode.node.name}</h3>
						<p>
							{readableRole(selectedNode.node.mapMetadata.role)} · {floorLabel(map.currentMap.mapType, selectedNode.floorNo)}
						</p>
					</div>
					<Badge>{stateLabel(selectedNode.state)}</Badge>
				</div>
				<div className="world-map-inspector-copy">
					{selectedNode.state === 'current' && <p>The party is here. The next daily resolution decides which room opens next.</p>}
					{selectedNode.state === 'next' && (
						<p>
							{selectedEdge
								? `Route option ${selectedEdge.sortOrder + 1}: ${selectedEdge.optionKey.replaceAll('-', ' ')}.`
								: 'A room the party can reach from the current position.'}
						</p>
					)}
					{selectedNode.state === 'revealed' && (
						<p>This room is charted, but the party must resolve a connected route before entering it.</p>
					)}
					{selectedNode.node.config?.event && <span>{eventLabel(selectedNode.node.config.event.eventType)}</span>}
					{selectedNode.node.config?.landmark && <span>Landmark: {selectedNode.node.config.landmark.key.replaceAll('-', ' ')}</span>}
					<span>
						{map.currentMap.name} · {readableRole(selectedNode.node.mapMetadata.role)}
					</span>
				</div>
			</div>
		</div>
	);
}
