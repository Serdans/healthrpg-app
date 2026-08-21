import type { PartyMap } from '#/lib/api';
import type { PartyTravelerDirection } from '#/lib/game-art';

export type WorldMapNode = PartyMap['nodes'][number];
export type WorldMapEdge = PartyMap['edges'][number];
export type WorldMapNodeState = 'current' | 'next' | 'revealed';

export interface WorldMapLayer {
	key: string;
	chapterNo: number;
	regionNo: number;
	label: string;
	x: number;
}

export interface WorldMapLayoutNode {
	node: WorldMapNode;
	state: WorldMapNodeState;
	layerIndex: number;
	x: number;
	y: number;
}

export interface WorldMapLayoutEdge {
	edge: WorldMapEdge;
	state: 'active' | 'revealed';
	path: string;
}

export interface WorldMapTravel {
	from: Pick<WorldMapLayoutNode, 'x' | 'y'>;
	to: Pick<WorldMapLayoutNode, 'x' | 'y'>;
	direction: PartyTravelerDirection;
	path: string;
}

export interface WorldMapLayout {
	width: number;
	height: number;
	layers: WorldMapLayer[];
	nodes: WorldMapLayoutNode[];
	edges: WorldMapLayoutEdge[];
}

const horizontalSpacing = 220;
const verticalSpacing = 132;
const horizontalPadding = 86;
const verticalPadding = 96;
const verticalBuffer = 96;
const minimumMapHeight = 440;
const verticalOffsets = [0, -64, 64, -40, 40, -24, 24] as const;

function layerKey(map: PartyMap, node: WorldMapNode) {
	if (map.currentMap.mapType !== 'overworld') return `${map.currentMap.id}:floor:${String(node.mapMetadata.floorNo)}`;
	return `${node.chapterNo}:${node.regionNo}`;
}

function layerLabel(map: PartyMap, chapterNo: number, regionNo: number, floorNo: number) {
	if (map.currentMap.mapType === 'dungeon') return `Floor ${floorNo + 1}`;
	if (map.currentMap.mapType === 'village') return 'Village';
	if (regionNo < 0) return `Chapter ${chapterNo} · Frontier`;
	return `Chapter ${chapterNo} · Region ${regionNo}`;
}

function clamp(value: number, minimum: number, maximum: number) {
	return Math.min(Math.max(value, minimum), maximum);
}

function edgePath(from: WorldMapLayoutNode, to: WorldMapLayoutNode) {
	const curve = Math.max(48, Math.abs(to.x - from.x) * 0.42);
	const verticalDelta = to.y - from.y;
	return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y + verticalDelta * 0.12}, ${to.x - curve} ${to.y - verticalDelta * 0.12}, ${to.x} ${to.y}`;
}

export function getWorldMapTravelDirection(
	from: Pick<WorldMapLayoutNode, 'x' | 'y'>,
	to: Pick<WorldMapLayoutNode, 'x' | 'y'>,
): PartyTravelerDirection {
	const horizontalDistance = to.x - from.x;
	const verticalDistance = to.y - from.y;

	if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) return horizontalDistance >= 0 ? 'east' : 'west';
	return verticalDistance >= 0 ? 'south' : 'north';
}

export function createWorldMapTravel(
	previousLayout: WorldMapLayout,
	nextLayout: WorldMapLayout,
	fromNodeId: string,
	toNodeId: string,
): WorldMapTravel | null {
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
		direction: getWorldMapTravelDirection(from, to),
		path: route?.path ?? edgePath(from, to),
	};
}

export function createWorldMapLayout(map: PartyMap): WorldMapLayout {
	const layerEntries = new Map<string, { chapterNo: number; regionNo: number }>();
	for (const node of map.nodes) {
		const key = layerKey(map, node);
		if (!layerEntries.has(key)) {
			layerEntries.set(key, {
				chapterNo: node.chapterNo,
				regionNo: map.currentMap.mapType === 'overworld' ? node.regionNo : node.mapMetadata.floorNo,
			});
		}
	}

	const layers = [...layerEntries.entries()]
		.sort(([, left], [, right]) => left.chapterNo - right.chapterNo || left.regionNo - right.regionNo)
		.map(([key, layer], index) => ({
			key,
			chapterNo: layer.chapterNo,
			regionNo: layer.regionNo,
			label: layerLabel(map, layer.chapterNo, layer.regionNo, layer.regionNo),
			x: horizontalPadding + index * horizontalSpacing,
		}));

	const nodesByLayer = new Map<string, WorldMapNode[]>();
	for (const node of map.nodes) {
		const key = layerKey(map, node);
		const nodes = nodesByLayer.get(key) ?? [];
		nodes.push(node);
		nodesByLayer.set(key, nodes);
	}

	const maxLayerSize = Math.max(
		1,
		[...nodesByLayer.values()].reduce((largest, nodes) => Math.max(largest, nodes.length), 0),
	);
	const height = Math.max(minimumMapHeight, verticalPadding * 2 + (maxLayerSize - 1) * verticalSpacing + verticalBuffer);
	const positionById = new Map<string, WorldMapLayoutNode>();

	const nextNodeIds = new Set<string>();
	const edgeOrderByNodeId = new Map<string, number>();
	for (const edge of map.edges) {
		if (edge.fromNodeId === map.currentNodeId) nextNodeIds.add(edge.toNodeId);
		const existingOrder = edgeOrderByNodeId.get(edge.toNodeId);
		if (existingOrder === undefined || edge.sortOrder < existingOrder) {
			edgeOrderByNodeId.set(edge.toNodeId, edge.sortOrder);
		}
	}
	const layoutNodes: WorldMapLayoutNode[] = [];
	const centerY = height / 2;

	for (const [layerIndex, layer] of layers.entries()) {
		const nodes = [...(nodesByLayer.get(layer.key) ?? [])].sort((left, right) => {
			const leftOrder = edgeOrderByNodeId.get(left.id);
			const rightOrder = edgeOrderByNodeId.get(right.id);
			if (leftOrder !== undefined && rightOrder !== undefined && leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}
			if (leftOrder !== undefined && rightOrder === undefined) return -1;
			if (leftOrder === undefined && rightOrder !== undefined) return 1;
			return left.id.localeCompare(right.id);
		});
		const totalHeight = Math.max(0, (nodes.length - 1) * verticalSpacing);
		const minimumCenterY = verticalPadding + totalHeight / 2;
		const maximumCenterY = height - verticalPadding - totalHeight / 2;
		const layerCenterY = clamp(centerY + verticalOffsets[layerIndex % verticalOffsets.length], minimumCenterY, maximumCenterY);
		const startY = layerCenterY - totalHeight / 2;

		for (const [nodeIndex, node] of nodes.entries()) {
			const item: WorldMapLayoutNode = {
				node,
				state: node.id === map.currentNodeId ? 'current' : nextNodeIds.has(node.id) ? 'next' : 'revealed',
				layerIndex,
				x: layer.x,
				y: startY + nodeIndex * verticalSpacing,
			};
			layoutNodes.push(item);
			positionById.set(node.id, item);
		}
	}

	const layoutEdges = map.edges.flatMap((edge): WorldMapLayoutEdge[] => {
		const from = positionById.get(edge.fromNodeId);
		const to = positionById.get(edge.toNodeId);
		if (!from || !to) return [];
		return [
			{
				edge,
				state: edge.fromNodeId === map.currentNodeId ? 'active' : 'revealed',
				path: edgePath(from, to),
			},
		];
	});

	return {
		width: Math.max(720, horizontalPadding * 2 + Math.max(0, layers.length - 1) * horizontalSpacing),
		height,
		layers,
		nodes: layoutNodes,
		edges: layoutEdges,
	};
}
