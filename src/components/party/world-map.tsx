import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType, CSSProperties } from 'react';
import { BookOpen, Castle, Gem, Home, MapPin, Moon, Route as RouteIcon, Shield, Sparkles, Swords } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import type { PartyMap } from '#/lib/api';
import { landmarkArtForNode, partyTravelerArt } from '#/lib/game-art';
import type { PartyTravelerDirection } from '#/lib/game-art';
import { createWorldMapLayout, createWorldMapTravel } from '#/lib/world-map';
import type { WorldMapLayout, WorldMapLayoutNode, WorldMapTravel } from '#/lib/world-map';

type IconComponent = ComponentType<{ className?: string }>;
const partyTravelDurationMs = 1000;

interface ActiveWorldMapTravel extends WorldMapTravel {
	key: number;
	started: boolean;
	supportsMotionPath: boolean;
}

function iconForNode(nodeType: PartyMap['nodes'][number]['nodeType']): IconComponent {
	switch (nodeType) {
		case 'dungeon':
			return Castle;
		case 'gate':
			return Shield;
		case 'combat':
			return Swords;
		case 'treasure':
			return Gem;
		case 'narrative':
			return BookOpen;
		case 'rest':
			return Moon;
		case 'village':
			return Home;
		case 'travel':
		default:
			return RouteIcon;
	}
}

function stateLabel(state: WorldMapLayoutNode['state']) {
	switch (state) {
		case 'current':
			return 'Current location';
		case 'next':
			return 'Next possible route';
		case 'revealed':
		default:
			return 'Revealed landmark';
	}
}

function readableType(nodeType: PartyMap['nodes'][number]['nodeType']) {
	return nodeType.replace('-', ' ');
}

function eventLabel(eventType: NonNullable<NonNullable<PartyMap['nodes'][number]['config']>['event']>['eventType']) {
	return `${eventType.charAt(0).toUpperCase()}${eventType.slice(1)} encounter`;
}

export function WorldMap({ map }: { map: PartyMap }) {
	const layout = useMemo(() => createWorldMapLayout(map), [map]);
	const [selectedNodeId, setSelectedNodeId] = useState(map.currentNodeId);
	const viewportRef = useRef<HTMLDivElement>(null);
	const currentNodeRef = useRef<HTMLButtonElement>(null);
	const previousMapRef = useRef<{ currentNodeId: string; layout: WorldMapLayout } | null>(null);
	const travelAnimationFrameRef = useRef<number | null>(null);
	const travelTimeoutRef = useRef<number | null>(null);
	const travelSequenceRef = useRef(0);
	const lastDirectionRef = useRef<PartyTravelerDirection>('south');
	const [travel, setTravel] = useState<ActiveWorldMapTravel>();

	useEffect(() => {
		const previousMap = previousMapRef.current;
		previousMapRef.current = { currentNodeId: map.currentNodeId, layout };
		setSelectedNodeId(map.currentNodeId);
		currentNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

		if (!previousMap || previousMap.currentNodeId === map.currentNodeId) return;

		if (travelAnimationFrameRef.current !== null) window.cancelAnimationFrame(travelAnimationFrameRef.current);
		if (travelTimeoutRef.current !== null) window.clearTimeout(travelTimeoutRef.current);

		const nextTravel = createWorldMapTravel(previousMap.layout, layout, previousMap.currentNodeId, map.currentNodeId);
		if (!nextTravel) {
			setTravel(undefined);
			return;
		}

		const supportsMotionPath = typeof window !== 'undefined' && window.CSS.supports('offset-path', 'path("M 0 0 L 1 1")');
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
	const selectedEdge = selectedNode
		? map.edges.find((edge) => edge.fromNodeId === map.currentNodeId && edge.toNodeId === selectedNode.node.id)
		: undefined;
	const currentNode = layout.nodes.find((item) => item.node.id === map.currentNodeId);
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
		'world-map-party-marker',
		travel ? 'world-map-party-marker-traveling' : '',
		travel?.supportsMotionPath ? 'world-map-party-marker-motion-path' : '',
		travel && !travel.supportsMotionPath ? 'world-map-party-marker-fallback' : '',
	]
		.filter(Boolean)
		.join(' ');

	if (!selectedNode) {
		return (
			<div className="world-map-empty" role="status">
				<MapPin className="size-5" />
				<span>The atlas has not revealed a trail yet.</span>
			</div>
		);
	}

	return (
		<div className="world-map" data-testid="world-map">
			<div
				ref={viewportRef}
				className="world-map-viewport"
				tabIndex={0}
				aria-label="World map. Scroll horizontally and vertically to explore the visible trail."
			>
				<div className="world-map-canvas" style={{ width: `${layout.width + 250}px`, minHeight: `${layout.height}px` }}>
					<div className="world-map-terrain" aria-hidden="true" />
					<svg
						className="world-map-paths"
						style={{ width: `${layout.width}px`, height: `${layout.height}px` }}
						viewBox={`0 0 ${layout.width} ${layout.height}`}
						aria-hidden="true"
						focusable="false"
					>
						<defs>
							<linearGradient id="world-map-route" x1="0" x2="1">
								<stop offset="0" stopColor="var(--gold-deep)" />
								<stop offset="1" stopColor="var(--amethyst)" />
							</linearGradient>
							<filter id="world-map-glow" x="-50%" y="-50%" width="200%" height="200%">
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
								className={`world-map-edge world-map-edge-${state}`}
								stroke={state === 'active' ? 'url(#world-map-route)' : 'var(--map-line-muted)'}
								filter={state === 'active' ? 'url(#world-map-glow)' : undefined}
							/>
						))}
					</svg>

					{layout.layers.map((layer) => (
						<div key={layer.key} className="world-map-layer-label" style={{ left: `${layer.x}px` }} aria-hidden="true">
							<span>{layer.label}</span>
						</div>
					))}

					{layout.nodes.map((item) => {
						const Icon = iconForNode(item.node.nodeType);
						const selected = selectedNode.node.id === item.node.id;
						return (
							<button
								key={item.node.id}
								ref={item.node.id === map.currentNodeId ? currentNodeRef : undefined}
								type="button"
								className={`world-map-node world-map-node-${item.state}`}
								style={{ left: `${item.x}px`, top: `${item.y}px` }}
								aria-label={`${item.node.name}, ${stateLabel(item.state)}, ${readableType(item.node.nodeType)}`}
								aria-pressed={selected}
								data-node-id={item.node.id}
								data-node-state={item.state}
								onClick={() => setSelectedNodeId(item.node.id)}
							>
								<span className="world-map-node-orb">
									<span
										className="world-map-node-art"
										aria-hidden="true"
										style={{ backgroundPosition: landmarkArtForNode(item.node.nodeType).position }}
									/>
									<Icon className="world-map-node-fallback size-5" aria-hidden="true" />
								</span>
								<span className="world-map-node-name">{item.node.name}</span>
							</button>
						);
					})}

					{currentNode && (
						<div
							className={markerClassName}
							style={markerStyle}
							aria-hidden="true"
							data-testid="world-map-party-marker"
							data-marker-direction={travelerDirection}
							data-marker-state={travel ? 'traveling' : 'idle'}
						>
							<span
								className="world-map-party-marker-sprite"
								data-direction={travelerDirection}
								style={{
									backgroundImage: `url('${partyTravelerArt.src}')`,
									backgroundSize: partyTravelerArt.backgroundSize,
								}}
							/>
						</div>
					)}

					<div className="world-map-mist" aria-hidden="true">
						<Sparkles className="size-5" />
						<span>Beyond the mist</span>
					</div>
				</div>
			</div>

			<div className="world-map-meta">
				<div className="world-map-legend" aria-label="Map legend">
					<span>
						<i className="world-map-legend-dot world-map-legend-current" /> Current
					</span>
					<span>
						<i className="world-map-legend-dot world-map-legend-next" /> Next route
					</span>
					<span>
						<i className="world-map-legend-dot world-map-legend-revealed" /> Revealed
					</span>
				</div>
				<span className="world-map-scroll-hint">Scroll to explore the atlas</span>
			</div>

			<div className="world-map-inspector" aria-live="polite" data-testid="world-map-inspector">
				<div className="world-map-inspector-heading">
					<div>
						<p className="eyebrow">Atlas entry</p>
						<h3>{selectedNode.node.name}</h3>
						<p>
							{readableType(selectedNode.node.nodeType)} · region {selectedNode.node.regionNo}
						</p>
					</div>
					<Badge>{stateLabel(selectedNode.state)}</Badge>
				</div>
				<div className="world-map-inspector-copy">
					{selectedNode.state === 'current' && <p>The party is here. The next choice will shape the road ahead.</p>}
					{selectedNode.state === 'next' && (
						<p>
							{selectedEdge
								? `Route option ${selectedEdge.sortOrder + 1}: ${selectedEdge.optionKey.replaceAll('-', ' ')}.`
								: 'A route the party can reach from here.'}
						</p>
					)}
					{selectedNode.state === 'revealed' && <p>This landmark has been revealed on the party atlas.</p>}
					{selectedNode.node.config?.event && <span>{eventLabel(selectedNode.node.config.event.eventType)}</span>}
					{selectedNode.node.config?.landmark && <span>Landmark: {selectedNode.node.config.landmark.key.replaceAll('-', ' ')}</span>}
				</div>
			</div>
		</div>
	);
}
