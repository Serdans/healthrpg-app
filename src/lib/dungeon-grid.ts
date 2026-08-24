import type { PartyMap } from '#/lib/api';
import type { PartyTravelerDirection } from '#/lib/game-art';

export type DungeonGridTileKind = 'entry' | 'floor' | 'stairs-up' | 'stairs-down' | 'treasure' | 'rest' | 'spawn' | 'goal' | 'boss';

export type DungeonGridTileState = 'current' | 'revealed';
export type DungeonGridTerrain = 'floor' | 'wall' | 'fog';

export const DUNGEON_EDGE = {
	north: 1,
	east: 2,
	south: 4,
	west: 8,
	northEast: 16,
	southEast: 32,
	southWest: 64,
	northWest: 128,
} as const;

export interface DungeonGridTile {
	node: PartyMap['nodes'][number];
	state: DungeonGridTileState;
	discovered: boolean;
	kind: DungeonGridTileKind;
	/** Monster archetype rendered on spawn/boss tiles. */
	archetypeKey?: string;
	floorNo: number;
	col: number;
	row: number;
}

/** One cell of the active floor plane: carved ground, rock, or fog. */
export interface DungeonGridCell {
	floorNo: number;
	col: number;
	row: number;
	walkable: boolean;
	discovered: boolean;
	terrain: DungeonGridTerrain;
	/** Stable coordinate seed used for deterministic props and floor variants. */
	decorSeed: number;
	/** Eight-neighbor mask used to select wall caps and corner chunks. */
	edgeMask: number;
	/** Rock cell with walked floor directly beneath — renders the cliff face. */
	floorBelow: boolean;
	/** Sides (n/e/s/w) where carved floor meets rock — draws the dark rim. */
	rockEdges: { n: boolean; e: boolean; s: boolean; w: boolean };
}

export interface DungeonGridFloor {
	floorNo: number;
	x: number;
	y: number;
	width: number;
	height: number;
	cols: number;
	rows: number;
}

export interface DungeonGridLayout {
	tileSize: number;
	gap: number;
	padding: number;
	activeFloorNo: number | null;
	width: number;
	height: number;
	/** Contains exactly the party's active floor when one exists. */
	floors: DungeonGridFloor[];
	/** Walkable tiles of the active floor, seen or still under fog. */
	tiles: DungeonGridTile[];
	/** The active floor plane including rock cells between carved tiles. */
	cells: DungeonGridCell[];
	currentTile: DungeonGridTile | null;
}

const tileSize = 48;
/** Tiles butt edge-to-edge: the plane is seamless, Mystery Dungeon style. */
const gap = 0;
const padding = 24;
/** Keep compact API maps readable without inventing additional walkable nodes. */
export const DUNGEON_CONTEXT_CELLS = 2;
const stageSidePadding = 48;
const minStageWidth = 960;
const minStageHeight = 720;

const KINDS: ReadonlySet<string> = new Set(['entry', 'stairs-up', 'stairs-down', 'treasure', 'rest', 'spawn', 'goal', 'boss']);

export function dungeonTileKind(templateKey: string): DungeonGridTileKind {
	const match = /^dungeon-tile-(.+)-v1$/.exec(templateKey);
	const kind = match?.[1];
	return kind && KINDS.has(kind) ? (kind as DungeonGridTileKind) : 'floor';
}

/**
 * Pure layout for a PMD-style active floor. The API's tile coordinates remain
 * the source of truth; the renderer normalizes the active floor into a compact
 * stage and derives wall, fog, and decoration metadata from its neighbors.
 */
export function createDungeonGridLayout(map: PartyMap): DungeonGridLayout {
	const tilesByFloor = new Map<number, DungeonGridTile[]>();
	for (const node of map.nodes) {
		const metadata = node.mapMetadata;
		if (metadata.tileX === null || metadata.tileY === null) continue;
		const kind = dungeonTileKind(node.templateKey);
		const tile: DungeonGridTile = {
			node,
			state: node.id === map.currentNodeId ? 'current' : 'revealed',
			discovered: node.discovered,
			kind,
			archetypeKey: (kind === 'spawn' || kind === 'boss') && metadata.spawnArchetype ? metadata.spawnArchetype : undefined,
			floorNo: metadata.floorNo,
			col: metadata.tileX,
			row: metadata.tileY,
		};
		const tiles = tilesByFloor.get(tile.floorNo) ?? [];
		tiles.push(tile);
		tilesByFloor.set(tile.floorNo, tiles);
	}

	const currentNode = map.nodes.find((node) => node.id === map.currentNodeId);
	const floorNumbers = [...tilesByFloor.keys()].sort((left, right) => left - right);
	const activeFloorNo: number | null = currentNode?.mapMetadata.floorNo ?? floorNumbers.at(0) ?? null;
	const floorNumber = activeFloorNo === null ? 0 : activeFloorNo;
	const rawTiles = activeFloorNo === null ? [] : (tilesByFloor.get(activeFloorNo) ?? []);
	const floorDimensionsFromApi = floorDimensions(rawTiles);
	const floorTiles = normalizeTiles(rawTiles, DUNGEON_CONTEXT_CELLS);
	const dimensions = {
		cols: floorDimensionsFromApi.cols + DUNGEON_CONTEXT_CELLS * 2,
		rows: floorDimensionsFromApi.rows + DUNGEON_CONTEXT_CELLS * 2,
	};
	const floorWidth = dimensions.cols * (tileSize + gap) + padding * 2;
	const floorHeight = dimensions.rows * (tileSize + gap) + padding * 2;
	const width = Math.max(minStageWidth, floorWidth + stageSidePadding * 2);
	const height = Math.max(minStageHeight, floorHeight + stageSidePadding * 2);
	const floor: DungeonGridFloor = {
		floorNo: floorNumber,
		x: Math.round((width - floorWidth) / 2),
		y: Math.round((height - floorHeight) / 2),
		width: floorWidth,
		height: floorHeight,
		cols: dimensions.cols,
		rows: dimensions.rows,
	};

	// Every bounding-box cell is part of the active plane: carved floor where a
	// node exists, solid wall between known carved tiles, and fog for a known
	// but undiscovered node. This keeps the map readable without revealing
	// future floor geometry.
	const tileAt = new Map<string, DungeonGridTile>();
	const litAt = new Map<string, DungeonGridTile>();
	for (const tile of floorTiles) {
		tileAt.set(gridKey(tile.col, tile.row), tile);
		if (tile.discovered) litAt.set(gridKey(tile.col, tile.row), tile);
	}

	const cells: DungeonGridCell[] = [];
	for (let row = 0; row < dimensions.rows; row += 1) {
		for (let col = 0; col < dimensions.cols; col += 1) {
			const tile = tileAt.get(gridKey(col, row));
			const discovered = Boolean(tile?.discovered);
			const edgeMask = terrainEdgeMask(litAt, col, row);
			cells.push({
				floorNo: floorNumber,
				col,
				row,
				walkable: Boolean(tile),
				discovered,
				terrain: tile && !discovered ? 'fog' : discovered ? 'floor' : 'wall',
				decorSeed: hashCoordinate(floorNumber, col, row),
				edgeMask,
				floorBelow: !discovered && Boolean(litAt.get(gridKey(col, row + 1))),
				rockEdges: {
					n: !litAt.has(gridKey(col, row - 1)),
					e: !litAt.has(gridKey(col + 1, row)),
					s: !litAt.has(gridKey(col, row + 1)),
					w: !litAt.has(gridKey(col - 1, row)),
				},
			});
		}
	}

	const tiles = floorTiles.map((tile) => ({
		...tile,
		state: tile.node.id === map.currentNodeId ? ('current' as const) : ('revealed' as const),
	}));

	return {
		tileSize,
		gap,
		padding,
		activeFloorNo,
		width,
		height,
		floors: activeFloorNo === null ? [] : [floor],
		tiles,
		cells,
		currentTile: tiles.find((tile) => tile.state === 'current') ?? null,
	};
}

function gridKey(col: number, row: number): string {
	return `${String(col)}:${String(row)}`;
}

function terrainEdgeMask(litAt: ReadonlyMap<string, DungeonGridTile>, col: number, row: number): number {
	let mask = 0;
	if (!litAt.has(gridKey(col, row - 1))) mask |= DUNGEON_EDGE.north;
	if (!litAt.has(gridKey(col + 1, row))) mask |= DUNGEON_EDGE.east;
	if (!litAt.has(gridKey(col, row + 1))) mask |= DUNGEON_EDGE.south;
	if (!litAt.has(gridKey(col - 1, row))) mask |= DUNGEON_EDGE.west;
	if (!litAt.has(gridKey(col + 1, row - 1))) mask |= DUNGEON_EDGE.northEast;
	if (!litAt.has(gridKey(col + 1, row + 1))) mask |= DUNGEON_EDGE.southEast;
	if (!litAt.has(gridKey(col - 1, row + 1))) mask |= DUNGEON_EDGE.southWest;
	if (!litAt.has(gridKey(col - 1, row - 1))) mask |= DUNGEON_EDGE.northWest;
	return mask;
}

function hashCoordinate(floorNo: number, col: number, row: number): number {
	let value = ((floorNo + 1) * 73856093) ^ ((col + 101) * 19349663) ^ ((row + 17) * 83492791);
	value ^= value >>> 13;
	return Math.abs(value);
}

/** Rebase both grid axes and leave a non-walkable visual context around them. */
function normalizeTiles(tiles: readonly DungeonGridTile[], contextCells: number): DungeonGridTile[] {
	if (tiles.length === 0) return [];
	let minCol = Number.POSITIVE_INFINITY;
	let minRow = Number.POSITIVE_INFINITY;
	for (const tile of tiles) {
		minCol = Math.min(minCol, tile.col);
		minRow = Math.min(minRow, tile.row);
	}
	return tiles.map((tile) => ({ ...tile, col: tile.col - minCol + contextCells, row: tile.row - minRow + contextCells }));
}

function floorDimensions(tiles: readonly DungeonGridTile[]) {
	if (tiles.length === 0) return { cols: 1, rows: 1 };
	let minCol = Number.POSITIVE_INFINITY;
	let maxCol = Number.NEGATIVE_INFINITY;
	let minRow = Number.POSITIVE_INFINITY;
	let maxRow = Number.NEGATIVE_INFINITY;
	for (const tile of tiles) {
		minCol = Math.min(minCol, tile.col);
		maxCol = Math.max(maxCol, tile.col);
		minRow = Math.min(minRow, tile.row);
		maxRow = Math.max(maxRow, tile.row);
	}
	return { cols: Math.max(1, maxCol - minCol + 1), rows: Math.max(1, maxRow - minRow + 1) };
}

/** Top-left pixel origin of a cell inside the active floor stage. */
export function cellOrigin(layout: DungeonGridLayout, cell: Pick<DungeonGridCell, 'col' | 'row'>): { x: number; y: number } {
	const floor = layout.floors.at(0);
	if (!floor) return { x: 0, y: 0 };
	return {
		x: floor.x + layout.padding + cell.col * (layout.tileSize + layout.gap),
		y: floor.y + layout.padding + cell.row * (layout.tileSize + layout.gap),
	};
}

/** Pixel center of a tile inside the active floor stage. */
export function tileCenter(layout: DungeonGridLayout, tile: DungeonGridTile): { x: number; y: number } {
	const floor = layout.floors.find((candidate) => candidate.floorNo === tile.floorNo);
	if (!floor) return { x: layout.width / 2, y: layout.height / 2 };
	return {
		x: floor.x + layout.padding + tile.col * (layout.tileSize + layout.gap) + layout.tileSize / 2,
		y: floor.y + layout.padding + tile.row * (layout.tileSize + layout.gap) + layout.tileSize / 2,
	};
}

/** Grid-aware arrow-key navigation between adjacent tiles in the known floor graph. */
export function adjacentGridTileId(layout: DungeonGridLayout, currentTileId: string, direction: PartyTravelerDirection): string | null {
	const current = layout.tiles.find((tile) => tile.node.id === currentTileId);
	if (!current) return null;
	const delta: Record<PartyTravelerDirection, [number, number]> = {
		north: [0, -1],
		south: [0, 1],
		west: [-1, 0],
		east: [1, 0],
	};
	const [dc, dr] = delta[direction];
	return (
		layout.tiles.find(
			(tile) =>
				tile.node.id !== currentTileId &&
				tile.floorNo === current.floorNo &&
				tile.col === current.col + dc &&
				tile.row === current.row + dr,
		)?.node.id ?? null
	);
}

/** Compass direction between two grid positions, for sprite facing. */
export function directionBetween(layout: DungeonGridLayout, fromTileId: string, toTileId: string): PartyTravelerDirection | null {
	const from = layout.tiles.find((tile) => tile.node.id === fromTileId);
	const to = layout.tiles.find((tile) => tile.node.id === toTileId);
	if (!from || !to || from.node.id === to.node.id) return null;
	if (to.row < from.row) return 'north';
	if (to.row > from.row) return 'south';
	if (to.col < from.col) return 'west';
	return 'east';
}
