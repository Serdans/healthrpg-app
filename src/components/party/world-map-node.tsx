import type { ComponentType, KeyboardEvent, RefCallback } from 'react';
import { BookOpen, Castle, Gem, Home, Moon, Route as RouteIcon, Shield, Swords } from 'lucide-react';

import type { PartyMap } from '#/lib/api';
import { landmarkArtForNode, landmarkSpriteArt } from '#/lib/game-art';
import type { WorldMapLayoutNode } from '#/lib/world-map';

type IconComponent = ComponentType<{ className?: string }>;

function iconForNode(nodeType: PartyMap['nodes'][number]['nodeType']): IconComponent {
	switch (nodeType) {
		case 'dungeon':
			return Castle;
		case 'challenge':
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

export function WorldMapNode({
	item,
	selected,
	registerNode,
	onSelect,
	onNavigate,
}: {
	item: WorldMapLayoutNode;
	selected: boolean;
	registerNode: RefCallback<HTMLButtonElement>;
	onSelect: (nodeId: string, focusInspector: boolean) => void;
	onNavigate: (event: KeyboardEvent<HTMLButtonElement>, nodeId: string) => void;
}) {
	const Icon = iconForNode(item.node.nodeType);

	return (
		<button
			ref={registerNode}
			type="button"
			className={`world-map-node world-map-node-${item.state}`}
			style={{ left: `${item.x}px`, top: `${item.y}px` }}
			aria-label={`${item.node.name}, ${stateLabel(item.state)}, ${readableType(item.node.nodeType)}`}
			aria-pressed={selected}
			data-node-id={item.node.id}
			data-node-state={item.state}
			onClick={(event) => onSelect(item.node.id, event.detail > 0)}
			onKeyDown={(event) => onNavigate(event, item.node.id)}
		>
			<span className="world-map-node-orb">
				<span
					className="world-map-node-art"
					aria-hidden="true"
					style={{
						backgroundImage: `url('${landmarkSpriteArt.src}')`,
						backgroundPosition: landmarkArtForNode(item.node.nodeType).position,
						backgroundSize: landmarkSpriteArt.backgroundSize,
					}}
				/>
				<Icon className="world-map-node-fallback size-5" aria-hidden="true" />
			</span>
			<span className="world-map-node-name">{item.node.name}</span>
		</button>
	);
}
