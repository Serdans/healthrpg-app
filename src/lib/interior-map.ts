import type { PartyMap } from '#/lib/api';
import type { PartyTravelerDirection } from '#/lib/game-art';

export type InteriorMapNode = PartyMap['nodes'][number];
export type InteriorMapNodeState = 'current' | 'next' | 'revealed';

export interface InteriorMapLayoutNode {
	node: InteriorMapNode;
	state: InteriorMapNodeState;
	floorNo: number;
	x: number;
	y: number;
}

export interface InteriorMapFloor {
	floorNo: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface InteriorMapLayoutEdge {
	edge: PartyMap['edges'][number];
	state: 'active' | 'revealed';
	path: string;
}

export interface InteriorMapLayout {
	width: number;
	height: number;
	floors: InteriorMapFloor[];
	nodes: InteriorMapLayoutNode[];
	edges: InteriorMapLayoutEdge[];
}

export interface InteriorMapTravel {
	from: Pick<InteriorMapLayoutNode, 'x' | 'y'>;
	to: Pick<InteriorMapLayoutNode, 'x' | 'y'>;
	direction: PartyTravelerDirection;
	path: string;
}

const floorHeight = 300;
const floorBorderInset = 22;
const nodeAnchorInset = 124;
const nodeSpacing = 220;
const stageWidth = 1160;
const stageHeight = 640;
const floorVerticalOffsets = [0, -54, 54, -34, 34] as const;

function edgePath(from: Pick<InteriorMapLayoutNode, 'x' | 'y'>, to: Pick<InteriorMapLayoutNode, 'x' | 'y'>) {
	const horizontalDistance = Math.abs(to.x - from.x);
	const verticalDistance = Math.abs(to.y - from.y);
	if (horizontalDistance >= verticalDistance) {
		const curve = Math.max(60, horizontalDistance * 0.42);
		return `M ${from.x} ${from.y} C ${from.x + (to.x >= from.x ? curve : -curve)} ${from.y}, ${to.x - (to.x >= from.x ? curve : -curve)} ${to.y}, ${to.x} ${to.y}`;
	}

	const curve = Math.max(54, verticalDistance * 0.42);
	return `M ${from.x} ${from.y} C ${from.x} ${from.y + (to.y >= from.y ? curve : -curve)}, ${to.x} ${to.y - (to.y >= from.y ? curve : -curve)}, ${to.x} ${to.y}`;
}

function travelDirection(from: Pick<InteriorMapLayoutNode, 'x' | 'y'>, to: Pick<InteriorMapLayoutNode, 'x' | 'y'>): PartyTravelerDirection {
	const horizontalDistance = to.x - from.x;
	const verticalDistance = to.y - from.y;
	if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) return horizontalDistance >= 0 ? 'east' : 'west';
	return verticalDistance >= 0 ? 'south' : 'north';
}

function nodeState(map: PartyMap, node: InteriorMapNode, nextNodeIds: ReadonlySet<string>): InteriorMapNodeState {
	if (node.id === map.currentNodeId) return 'current';
	return nextNodeIds.has(node.id) ? 'next' : 'revealed';
}

function dungeonLayout(map: PartyMap, nextNodeIds: ReadonlySet<string>): InteriorMapLayout {
	const nodesByFloor = new Map<number, InteriorMapNode[]>();
	for (const node of map.nodes) {
		const nodes = nodesByFloor.get(node.mapMetadata.floorNo) ?? [];
		nodes.push(node);
		nodesByFloor.set(node.mapMetadata.floorNo, nodes);
	}

	const floorNumbers = [...nodesByFloor.keys()].sort((left, right) => left - right);
	const largestFloor = Math.max(1, ...floorNumbers.map((floorNo) => nodesByFloor.get(floorNo)?.length ?? 0));
	const width = Math.max(stageWidth, nodeAnchorInset * 2 + Math.max(0, largestFloor - 1) * nodeSpacing);
	const height = Math.max(stageHeight, floorNumbers.length * floorHeight + 36);
	const floors = floorNumbers.map((floorNo, index) => ({
		floorNo,
		x: floorBorderInset,
		y: index * floorHeight + 18,
		width: width - floorBorderInset * 2,
		height: floorHeight - 28,
	}));
	const positions = new Map<string, InteriorMapLayoutNode>();

	for (const [floorIndex, floorNo] of floorNumbers.entries()) {
		const nodes = [...(nodesByFloor.get(floorNo) ?? [])].sort((left, right) => left.mapMetadata.sortOrder - right.mapMetadata.sortOrder);
		const centerY = floorIndex * floorHeight + floorHeight / 2;
		for (const [nodeIndex, node] of nodes.entries()) {
			const item: InteriorMapLayoutNode = {
				node,
				state: nodeState(map, node, nextNodeIds),
				floorNo,
				x: nodeAnchorInset + nodeIndex * nodeSpacing,
				y: centerY + floorVerticalOffsets[nodeIndex % floorVerticalOffsets.length],
			};
			positions.set(node.id, item);
		}
	}

	return {
		width,
		height,
		floors,
		nodes: [...positions.values()],
		edges: map.edges.flatMap((edge): InteriorMapLayoutEdge[] => {
			const from = positions.get(edge.fromNodeId);
			const to = positions.get(edge.toNodeId);
			if (!from || !to) return [];
			return [{ edge, state: edge.fromNodeId === map.currentNodeId ? 'active' : 'revealed', path: edgePath(from, to) }];
		}),
	};
}

function villageLayout(map: PartyMap, nextNodeIds: ReadonlySet<string>): InteriorMapLayout {
	const width = stageWidth;
	const height = stageHeight;
	const floors: InteriorMapFloor[] = [{ floorNo: 0, x: 22, y: 18, width: width - 44, height: height - 36 }];
	const nodes = [...map.nodes].sort((left, right) => left.mapMetadata.sortOrder - right.mapMetadata.sortOrder);
	const hub = nodes.find((node) => node.mapMetadata.role === 'hub') ?? nodes.find((node) => node.mapMetadata.isEntry) ?? nodes.at(0);
	const positions = new Map<string, InteriorMapLayoutNode>();
	if (!hub) {
		return { width, height, floors, nodes: [], edges: [] };
	}
	positions.set(hub.id, {
		node: hub,
		state: nodeState(map, hub, nextNodeIds),
		floorNo: hub.mapMetadata.floorNo,
		x: width / 2,
		y: height / 2,
	});

	const satellites = nodes.filter((node) => node.id !== hub.id);
	const radiusX = width * 0.32;
	const radiusY = height * 0.31;
	for (const [index, node] of satellites.entries()) {
		const angle = -Math.PI / 2 + (index / Math.max(1, satellites.length)) * Math.PI * 2;
		positions.set(node.id, {
			node,
			state: nodeState(map, node, nextNodeIds),
			floorNo: node.mapMetadata.floorNo,
			x: width / 2 + Math.cos(angle) * radiusX,
			y: height / 2 + Math.sin(angle) * radiusY,
		});
	}

	return {
		width,
		height,
		floors,
		nodes: [...positions.values()],
		edges: map.edges.flatMap((edge): InteriorMapLayoutEdge[] => {
			const from = positions.get(edge.fromNodeId);
			const to = positions.get(edge.toNodeId);
			if (!from || !to) return [];
			return [{ edge, state: edge.fromNodeId === map.currentNodeId ? 'active' : 'revealed', path: edgePath(from, to) }];
		}),
	};
}

export function createInteriorMapLayout(map: PartyMap): InteriorMapLayout {
	const nextNodeIds = new Set<string>();
	for (const edge of map.edges) {
		if (edge.fromNodeId === map.currentNodeId) nextNodeIds.add(edge.toNodeId);
	}
	return map.currentMap.mapType === 'village' ? villageLayout(map, nextNodeIds) : dungeonLayout(map, nextNodeIds);
}

export function createInteriorMapTravel(
	previousLayout: InteriorMapLayout,
	nextLayout: InteriorMapLayout,
	fromNodeId: string,
	toNodeId: string,
): InteriorMapTravel | null {
	const from =
		previousLayout.nodes.find((item) => item.node.id === fromNodeId) ?? nextLayout.nodes.find((item) => item.node.id === fromNodeId);
	const to = nextLayout.nodes.find((item) => item.node.id === toNodeId) ?? previousLayout.nodes.find((item) => item.node.id === toNodeId);
	if (!from || !to) return null;

	const route =
		previousLayout.edges.find((item) => item.edge.fromNodeId === fromNodeId && item.edge.toNodeId === toNodeId) ??
		nextLayout.edges.find((item) => item.edge.fromNodeId === fromNodeId && item.edge.toNodeId === toNodeId);
	return {
		from: { x: from.x, y: from.y },
		to: { x: to.x, y: to.y },
		direction: travelDirection(from, to),
		path: route?.path ?? edgePath(from, to),
	};
}
