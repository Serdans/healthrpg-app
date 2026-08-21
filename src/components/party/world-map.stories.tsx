import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { LocationPanel } from './location-panel';
import { WorldMap } from './world-map';
import type { PartyMap } from '#/lib/api';

type StoryNode = Omit<PartyMap['nodes'][number], 'mapMetadata'>;
type StoryMap = Omit<PartyMap, 'currentMap' | 'enterableLocation' | 'nodes' | 'objectives' | 'completedObjectiveIds'> & {
	nodes: StoryNode[];
};

function withMapDefaults(value: StoryMap): PartyMap {
	return {
		...value,
		currentMap: {
			id: 'overworld',
			mapType: 'overworld',
			name: 'The Atlas',
			templateKey: 'overworld-v1',
			parentNodeId: null,
			entryNodeId: value.nodes[0]?.id ?? value.currentNodeId,
		},
		enterableLocation: null,
		objectives: [],
		completedObjectiveIds: [],
		nodes: value.nodes.map((node, index) => ({
			...node,
			mapMetadata: {
				mapId: 'overworld',
				nodeId: node.id,
				floorNo: 0,
				role: 'overworld',
				sortOrder: index,
				isEntry: index === 0,
				isExit: false,
			},
		})),
	};
}

const map: PartyMap = withMapDefaults({
	currentChapter: 1,
	currentNodeId: 'crossing',
	nodes: [
		{
			id: 'frontier',
			chapterNo: 1,
			regionNo: 0,
			name: 'The Frontier',
			nodeType: 'travel',
			templateKey: 'travel-v1',
			config: null,
		},
		{
			id: 'crossing',
			chapterNo: 1,
			regionNo: 1,
			name: 'Mossway Crossing',
			nodeType: 'travel',
			templateKey: 'travel-v1',
			config: {
				movementCost: 10,
				obstacleCost: 0,
				event: { eventType: 'narrative', prompt: 'Which light do you follow?', choices: [] },
			},
		},
		{
			id: 'village',
			chapterNo: 1,
			regionNo: 2,
			name: 'Mossway Village',
			nodeType: 'village',
			templateKey: 'village-v1',
			config: null,
		},
		{
			id: 'ruins',
			chapterNo: 1,
			regionNo: 2,
			name: 'The Old Ruins',
			nodeType: 'dungeon',
			templateKey: 'dungeon-v1',
			config: null,
		},
		{
			id: 'gate',
			chapterNo: 1,
			regionNo: 3,
			name: 'The Lantern Gate',
			nodeType: 'gate',
			templateKey: 'gate-v1',
			config: null,
		},
	],
	edges: [
		{ id: 'edge-frontier', fromNodeId: 'frontier', toNodeId: 'crossing', optionKey: 'trailhead', sortOrder: 0 },
		{ id: 'edge-village', fromNodeId: 'crossing', toNodeId: 'village', optionKey: 'mossway-village', sortOrder: 1 },
		{ id: 'edge-ruins', fromNodeId: 'crossing', toNodeId: 'ruins', optionKey: 'old-ruins', sortOrder: 2 },
		{ id: 'edge-gate', fromNodeId: 'village', toNodeId: 'gate', optionKey: 'lantern-gate', sortOrder: 3 },
		{ id: 'edge-gate-ruins', fromNodeId: 'ruins', toNodeId: 'gate', optionKey: 'ruins-gate', sortOrder: 4 },
	],
});

const twoDimensionalMap: PartyMap = withMapDefaults({
	currentChapter: 1,
	currentNodeId: 'sunken-camp',
	nodes: [
		{
			id: 'sunken-camp',
			chapterNo: 1,
			regionNo: 1,
			name: 'Sunken Camp',
			nodeType: 'rest',
			templateKey: 'rest-v1',
			config: null,
		},
		{
			id: 'high-road',
			chapterNo: 1,
			regionNo: 2,
			name: 'High Road',
			nodeType: 'travel',
			templateKey: 'travel-v1',
			config: null,
		},
		{
			id: 'low-road',
			chapterNo: 1,
			regionNo: 2,
			name: 'Low Marsh',
			nodeType: 'combat',
			templateKey: 'combat-v1',
			config: null,
		},
		{
			id: 'sunlit-grove',
			chapterNo: 1,
			regionNo: 3,
			name: 'Sunlit Grove',
			nodeType: 'village',
			templateKey: 'village-v1',
			config: null,
		},
		{
			id: 'mirror-cavern',
			chapterNo: 1,
			regionNo: 3,
			name: 'Mirror Cavern',
			nodeType: 'dungeon',
			templateKey: 'dungeon-v1',
			config: null,
		},
		{
			id: 'mist-steps',
			chapterNo: 1,
			regionNo: 4,
			name: 'Mist Steps',
			nodeType: 'narrative',
			templateKey: 'narrative-v1',
			config: null,
		},
		{
			id: 'lantern-gate',
			chapterNo: 1,
			regionNo: 5,
			name: 'Lantern Gate',
			nodeType: 'gate',
			templateKey: 'gate-v1',
			config: null,
		},
		{
			id: 'starfall-cache',
			chapterNo: 1,
			regionNo: 6,
			name: 'Starfall Cache',
			nodeType: 'treasure',
			templateKey: 'treasure-v1',
			config: null,
		},
	],
	edges: [
		{ id: 'edge-high-road', fromNodeId: 'sunken-camp', toNodeId: 'high-road', optionKey: 'high-road', sortOrder: 0 },
		{ id: 'edge-low-road', fromNodeId: 'sunken-camp', toNodeId: 'low-road', optionKey: 'low-road', sortOrder: 1 },
		{ id: 'edge-grove', fromNodeId: 'high-road', toNodeId: 'sunlit-grove', optionKey: 'sunlit-grove', sortOrder: 0 },
		{ id: 'edge-cavern-high', fromNodeId: 'high-road', toNodeId: 'mirror-cavern', optionKey: 'mirror-cavern', sortOrder: 1 },
		{ id: 'edge-cavern-low', fromNodeId: 'low-road', toNodeId: 'mirror-cavern', optionKey: 'mirror-cavern', sortOrder: 0 },
		{ id: 'edge-mist-steps', fromNodeId: 'low-road', toNodeId: 'mist-steps', optionKey: 'mist-steps', sortOrder: 1 },
		{ id: 'edge-gate-grove', fromNodeId: 'sunlit-grove', toNodeId: 'lantern-gate', optionKey: 'lantern-gate', sortOrder: 2 },
		{ id: 'edge-gate-cavern', fromNodeId: 'mirror-cavern', toNodeId: 'lantern-gate', optionKey: 'lantern-gate', sortOrder: 3 },
		{ id: 'edge-gate-mist', fromNodeId: 'mist-steps', toNodeId: 'lantern-gate', optionKey: 'lantern-gate', sortOrder: 4 },
		{ id: 'edge-starfall', fromNodeId: 'lantern-gate', toNodeId: 'starfall-cache', optionKey: 'starfall-cache', sortOrder: 0 },
	],
});

const entranceMap: PartyMap = {
	...map,
	currentNodeId: 'village',
	enterableLocation: {
		id: 'map-village',
		mapType: 'village',
		name: "Wayfarer's Rest",
		templateKey: 'village-v1',
		parentNodeId: 'village',
		entryNodeId: 'village-hub',
	},
};

const entryMutation = { isPending: false, error: null, mutate: () => undefined };

const interiorMetadata = (
	mapId: string,
	nodeId: string,
	floorNo: number,
	role: PartyMap['nodes'][number]['mapMetadata']['role'],
	sortOrder: number,
	isEntry = false,
	isExit = false,
) => ({
	mapId,
	nodeId,
	floorNo,
	role,
	sortOrder,
	isEntry,
	isExit,
});

const interiorVillageMap: PartyMap = {
	currentChapter: 1,
	currentNodeId: 'village-hub',
	currentMap: {
		id: 'map-village',
		mapType: 'village',
		name: "Wayfarer's Rest",
		templateKey: 'village-v1',
		parentNodeId: 'village',
		entryNodeId: 'village-hub',
	},
	enterableLocation: null,
	nodes: [
		{
			id: 'village-hub',
			chapterNo: 1,
			regionNo: 2,
			name: 'Lantern Square',
			nodeType: 'village',
			templateKey: 'village-hub-v1',
			config: null,
			mapMetadata: interiorMetadata('map-village', 'village-hub', 0, 'hub', 0, true),
		},
		{
			id: 'village-shop',
			chapterNo: 1,
			regionNo: 2,
			name: 'Copperleaf Shop',
			nodeType: 'treasure',
			templateKey: 'village-shop-v1',
			config: null,
			mapMetadata: interiorMetadata('map-village', 'village-shop', 0, 'shop', 1),
		},
		{
			id: 'village-rest',
			chapterNo: 1,
			regionNo: 2,
			name: 'Wayfarer Lodge',
			nodeType: 'rest',
			templateKey: 'village-rest-v1',
			config: null,
			mapMetadata: interiorMetadata('map-village', 'village-rest', 0, 'rest', 2),
		},
		{
			id: 'village-exit',
			chapterNo: 1,
			regionNo: 2,
			name: 'Mossway Road',
			nodeType: 'travel',
			templateKey: 'village-exit-v1',
			config: null,
			mapMetadata: interiorMetadata('map-village', 'village-exit', 0, 'exit', 3, false, true),
		},
	],
	edges: [
		{ id: 'village-shop-edge', fromNodeId: 'village-hub', toNodeId: 'village-shop', optionKey: 'shop', sortOrder: 0 },
		{ id: 'village-rest-edge', fromNodeId: 'village-hub', toNodeId: 'village-rest', optionKey: 'rest', sortOrder: 1 },
		{ id: 'village-exit-edge', fromNodeId: 'village-hub', toNodeId: 'village-exit', optionKey: 'exit', sortOrder: 2 },
	],
	objectives: [
		{
			id: 'village-objective',
			mapId: 'map-village',
			key: 'visit-lodge',
			type: 'reach-node',
			targetNodeId: 'village-rest',
			required: false,
			displayName: 'Visit the Wayfarer Lodge',
			description: 'Hear the latest rumors before the party returns to the road.',
		},
	],
	completedObjectiveIds: [],
};

const interiorDungeonMap: PartyMap = {
	...interiorVillageMap,
	currentNodeId: 'dungeon-puzzle',
	currentMap: {
		id: 'map-ruins',
		mapType: 'dungeon',
		name: 'The Mossbound Ruins',
		templateKey: 'dungeon-v1',
		parentNodeId: 'ruins',
		entryNodeId: 'dungeon-entry',
	},
	nodes: [
		{
			id: 'dungeon-entry',
			chapterNo: 1,
			regionNo: 3,
			name: 'Fallen Gate',
			nodeType: 'travel',
			templateKey: 'dungeon-entry-v1',
			config: null,
			mapMetadata: interiorMetadata('map-ruins', 'dungeon-entry', 0, 'entrance', 0, true),
		},
		{
			id: 'dungeon-puzzle',
			chapterNo: 1,
			regionNo: 3,
			name: 'Turning Stones',
			nodeType: 'narrative',
			templateKey: 'dungeon-puzzle-v1',
			config: null,
			mapMetadata: interiorMetadata('map-ruins', 'dungeon-puzzle', 1, 'puzzle', 0),
		},
		{
			id: 'dungeon-guard',
			chapterNo: 1,
			regionNo: 3,
			name: 'Mossbound Guard',
			nodeType: 'combat',
			templateKey: 'dungeon-combat-v1',
			config: null,
			mapMetadata: interiorMetadata('map-ruins', 'dungeon-guard', 2, 'combat', 0),
		},
		{
			id: 'dungeon-reliquary',
			chapterNo: 1,
			regionNo: 3,
			name: 'Sealed Reliquary',
			nodeType: 'treasure',
			templateKey: 'dungeon-treasure-v1',
			config: null,
			mapMetadata: interiorMetadata('map-ruins', 'dungeon-reliquary', 2, 'treasure', 1),
		},
		{
			id: 'dungeon-exit',
			chapterNo: 1,
			regionNo: 3,
			name: 'Road Back',
			nodeType: 'travel',
			templateKey: 'dungeon-exit-v1',
			config: null,
			mapMetadata: interiorMetadata('map-ruins', 'dungeon-exit', 3, 'exit', 0, false, true),
		},
	],
	edges: [
		{ id: 'dungeon-puzzle-edge', fromNodeId: 'dungeon-entry', toNodeId: 'dungeon-puzzle', optionKey: 'turning-stones', sortOrder: 0 },
		{ id: 'dungeon-guard-edge', fromNodeId: 'dungeon-puzzle', toNodeId: 'dungeon-guard', optionKey: 'mossbound-guard', sortOrder: 0 },
		{ id: 'dungeon-reliquary-edge', fromNodeId: 'dungeon-puzzle', toNodeId: 'dungeon-reliquary', optionKey: 'reliquary', sortOrder: 1 },
		{ id: 'dungeon-exit-edge', fromNodeId: 'dungeon-guard', toNodeId: 'dungeon-exit', optionKey: 'road-back', sortOrder: 2 },
	],
	objectives: [
		{
			id: 'dungeon-objective',
			mapId: 'map-ruins',
			key: 'reach-reliquary',
			type: 'reach-node',
			targetNodeId: 'dungeon-reliquary',
			required: true,
			displayName: 'Reach the Sealed Reliquary',
			description: 'Find the relic chamber hidden beyond the mossbound guard.',
		},
	],
	completedObjectiveIds: [],
};

function TravelerPreview() {
	const [currentNodeId, setCurrentNodeId] = useState(twoDimensionalMap.currentNodeId);
	const nextNodeId = currentNodeId === 'sunken-camp' ? 'high-road' : 'sunken-camp';

	return (
		<div className="space-y-4">
			<button
				className="game-button rounded-md bg-[var(--indigo)] px-4 py-2 text-xs text-[var(--parchment-bright)]"
				type="button"
				onClick={() => setCurrentNodeId(nextNodeId)}
			>
				{currentNodeId === 'sunken-camp' ? 'Advance traveler' : 'Return traveler'}
			</button>
			<WorldMap map={{ ...twoDimensionalMap, currentNodeId }} />
		</div>
	);
}

const meta = {
	title: 'Party/WorldMap',
	component: WorldMap,
	parameters: { layout: 'padded' },
} satisfies Meta<typeof WorldMap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BranchedAtlas: Story = {
	args: { map },
};

export const NarrowFrontier: Story = {
	args: { map: { ...map, nodes: map.nodes.slice(0, 4), edges: map.edges.slice(0, 3) } },
};

export const TwoDimensionalAtlas: Story = {
	args: { map: twoDimensionalMap },
};

export const EnterableLocation: Story = {
	args: { map: entranceMap, enterMutation: entryMutation },
};

function LocationJourney() {
	const [inside, setInside] = useState(false);

	if (inside) {
		return (
			<div className="space-y-4">
				<button
					className="game-button rounded-md bg-[var(--indigo)] px-4 py-2 text-xs text-[var(--parchment-bright)]"
					type="button"
					onClick={() => setInside(false)}
				>
					Return to overworld
				</button>
				<WorldMap map={interiorVillageMap} />
				<LocationPanel map={interiorVillageMap} />
			</div>
		);
	}

	return (
		<WorldMap
			map={entranceMap}
			enterMutation={{
				isPending: false,
				error: null,
				mutate: () => setInside(true),
			}}
		/>
	);
}

export const TravelingParty: Story = {
	args: { map: twoDimensionalMap },
	render: () => <TravelerPreview />,
};

export const InteriorDungeon: Story = {
	args: { map: interiorDungeonMap },
};

export const EnteringLocation: Story = {
	args: { map: entranceMap },
	render: () => <LocationJourney />,
};

export const LandmarkGallery: Story = {
	args: {
		map: withMapDefaults({
			currentChapter: 1,
			currentNodeId: 'landmark-village',
			nodes: [
				...(['travel', 'dungeon', 'gate', 'rest', 'combat', 'treasure', 'narrative', 'village'] as const).map((nodeType, index) => ({
					id: `landmark-${nodeType}`,
					chapterNo: 1,
					regionNo: index + 1,
					name: nodeType.replace('-', ' '),
					nodeType,
					templateKey: `${nodeType}-v1`,
					config: null,
				})),
			],
			edges: [{ id: 'gallery-1', fromNodeId: 'landmark-village', toNodeId: 'landmark-travel', optionKey: 'trail', sortOrder: 0 }],
		}),
	},
};
