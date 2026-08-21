import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { MapPin, Sparkles } from 'lucide-react';

import { WorldMapInspector } from '#/components/party/world-map-inspector';
import type { WorldMapEntryMutation } from '#/components/party/world-map-inspector';
import { WorldMapNode } from '#/components/party/world-map-node';
import type { PartyMap } from '#/lib/api';
import { gameplayBackgroundArt, partyTravelerArt } from '#/lib/game-art';
import type { PartyTravelerDirection } from '#/lib/game-art';
import { getAdjacentMapNodeId, mapDirectionForKey } from '#/lib/map-navigation';
import { createWorldMapLayout, createWorldMapTravel } from '#/lib/world-map';
import type { WorldMapLayout, WorldMapTravel } from '#/lib/world-map';
import { InteriorMap } from './interior-map';

const partyTravelDurationMs = 1000;

interface ActiveWorldMapTravel extends WorldMapTravel {
	key: number;
	started: boolean;
	supportsMotionPath: boolean;
}

function OverworldMap({
	map,
	enterMutation,
	readOnly = false,
	actionHref,
}: {
	map: PartyMap;
	enterMutation?: WorldMapEntryMutation;
	readOnly?: boolean;
	actionHref?: '#party-action';
}) {
	const layout = useMemo(() => createWorldMapLayout(map), [map]);
	const [selectedNodeId, setSelectedNodeId] = useState(map.currentNodeId);
	const viewportRef = useRef<HTMLDivElement>(null);
	const currentNodeRef = useRef<HTMLButtonElement>(null);
	const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
	const inspectorRef = useRef<HTMLDivElement>(null);
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
	const enterableLocation = map.enterableLocation;
	const canEnterSelectedLocation = Boolean(
		selectedNode &&
		enterMutation &&
		enterableLocation &&
		map.currentMap.mapType === 'overworld' &&
		selectedNode.state === 'current' &&
		enterableLocation.parentNodeId === selectedNode.node.id,
	);
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
	const selectNode = (nodeId: string, focusInspector = false) => {
		setSelectedNodeId(nodeId);
		if (focusInspector) window.requestAnimationFrame(() => inspectorRef.current?.focus());
	};
	const registerNode = (nodeId: string, node: HTMLButtonElement | null) => {
		if (node) nodeRefs.current.set(nodeId, node);
		else nodeRefs.current.delete(nodeId);
		if (nodeId === map.currentNodeId) currentNodeRef.current = node;
	};
	const navigateNode = (event: KeyboardEvent<HTMLButtonElement>, nodeId: string) => {
		const direction = mapDirectionForKey(event.key);
		if (!direction) return;
		const nextNodeId = getAdjacentMapNodeId(layout.nodes, nodeId, direction);
		if (!nextNodeId) return;
		event.preventDefault();
		selectNode(nextNodeId);
		nodeRefs.current.get(nextNodeId)?.focus();
	};

	if (!selectedNode) {
		return (
			<div className="world-map-empty" role="status">
				<MapPin className="size-5" aria-hidden="true" />
				<span>The atlas has not revealed a trail yet.</span>
			</div>
		);
	}

	return (
		<div
			className="world-map"
			data-testid="world-map"
			style={{ '--world-map-terrain': `url('${gameplayBackgroundArt.overworld}')` } as CSSProperties}
		>
			<div
				ref={viewportRef}
				className="world-map-viewport"
				tabIndex={0}
				aria-label={`${map.currentMap.name}. Scroll horizontally and vertically to explore the visible map.`}
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

					{layout.nodes.map((item) => (
						<WorldMapNode
							key={item.node.id}
							item={item}
							selected={selectedNode.node.id === item.node.id}
							registerNode={(node) => registerNode(item.node.id, node)}
							onSelect={selectNode}
							onNavigate={navigateNode}
						/>
					))}

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
						<Sparkles className="size-5" aria-hidden="true" />
						<span>Beyond the mist</span>
					</div>
				</div>
			</div>

			<div className="world-map-meta">
				<div className="world-map-legend" aria-label="Map legend">
					<span>
						<i className="world-map-legend-dot world-map-legend-current" aria-hidden="true" /> Current
					</span>
					<span>
						<i className="world-map-legend-dot world-map-legend-next" aria-hidden="true" /> Next route
					</span>
					<span>
						<i className="world-map-legend-dot world-map-legend-revealed" aria-hidden="true" /> Revealed
					</span>
					<span>
						<i className="world-map-legend-dot world-map-legend-party" aria-hidden="true" /> Party
					</span>
				</div>
				<span className="world-map-scroll-hint">Scroll to explore the atlas</span>
			</div>

			<WorldMapInspector
				map={map}
				selectedNode={selectedNode}
				selectedEdge={selectedEdge}
				canEnterSelectedLocation={canEnterSelectedLocation}
				enterableLocation={enterableLocation}
				enterMutation={enterMutation}
				readOnly={readOnly}
				actionHref={actionHref}
				inspectorRef={inspectorRef}
			/>
		</div>
	);
}

export function WorldMap(props: {
	map: PartyMap;
	enterMutation?: WorldMapEntryMutation;
	readOnly?: boolean;
	actionHref?: '#party-action';
}) {
	return (
		<div
			key={props.map.currentMap.id}
			className="map-scene-transition"
			data-testid="map-scene"
			data-map-id={props.map.currentMap.id}
			data-map-type={props.map.currentMap.mapType}
		>
			{props.map.currentMap.mapType !== 'overworld' ? <InteriorMap map={props.map} /> : <OverworldMap {...props} />}
		</div>
	);
}
