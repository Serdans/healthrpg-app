import type { Meta, StoryObj } from '@storybook/react-vite';

import type { PartyMap } from '#/lib/api';

import { LocationPanel } from './location-panel';

const metadata = (
	mapId: string,
	nodeId: string,
	floorNo: number,
	role: PartyMap['nodes'][number]['mapMetadata']['role'],
	sortOrder: number,
	isEntry = false,
	isExit = false,
	tileX = null,
	tileY = null,
	spawnArchetype: string | null = null,
	discovered = true,
) => ({
	mapId,
	nodeId,
	floorNo,
	role,
	sortOrder,
	isEntry,
	isExit,
	tileX,
	tileY,
	spawnArchetype,
	discovered,
});

const dungeonMap: PartyMap = {
	currentChapter: 1,
	currentNodeId: 'dungeon-puzzle',
	currentMap: {
		id: 'map-ruins',
		mapType: 'dungeon',
		name: 'First Ruins',
		templateKey: 'dungeon-v1',
		parentNodeId: 'overworld-ruins',
		entryNodeId: 'dungeon-entry',
	},
	enterableLocation: null,
	nodes: [
		{
			id: 'dungeon-entry',
			chapterNo: 1,
			regionNo: 4,
			name: 'Fallen Gate',
			nodeType: 'travel',
			templateKey: 'dungeon-entrance-v1',
			config: null,
			mapMetadata: metadata('map-ruins', 'dungeon-entry', 0, 'entrance', 0, true),
			discovered: true,
		},
		{
			id: 'dungeon-puzzle',
			chapterNo: 1,
			regionNo: 4,
			name: 'Turning Stones',
			nodeType: 'narrative',
			templateKey: 'dungeon-puzzle-v1',
			config: null,
			mapMetadata: metadata('map-ruins', 'dungeon-puzzle', 1, 'puzzle', 1),
			discovered: true,
		},
		{
			id: 'dungeon-goal',
			chapterNo: 1,
			regionNo: 4,
			name: 'Memory Well',
			nodeType: 'narrative',
			templateKey: 'dungeon-goal-v1',
			config: null,
			mapMetadata: metadata('map-ruins', 'dungeon-goal', 2, 'goal', 2),
			discovered: true,
		},
		{
			id: 'dungeon-exit',
			chapterNo: 1,
			regionNo: 4,
			name: 'Road Back',
			nodeType: 'travel',
			templateKey: 'dungeon-exit-v1',
			config: null,
			mapMetadata: metadata('map-ruins', 'dungeon-exit', 2, 'exit', 3, false, true),
			discovered: true,
		},
	],
	edges: [
		{ id: 'edge-puzzle', fromNodeId: 'dungeon-entry', toNodeId: 'dungeon-puzzle', optionKey: 'turning-stones', sortOrder: 0 },
		{ id: 'edge-goal', fromNodeId: 'dungeon-puzzle', toNodeId: 'dungeon-goal', optionKey: 'memory-well', sortOrder: 1 },
		{ id: 'edge-exit', fromNodeId: 'dungeon-goal', toNodeId: 'dungeon-exit', optionKey: 'road-back', sortOrder: 2 },
	],
	objectives: [
		{
			id: 'objective-memory',
			mapId: 'map-ruins',
			key: 'explore-memory-well',
			type: 'reach-node',
			targetNodeId: 'dungeon-goal',
			required: true,
			displayName: 'Reach the Memory Well',
			description: 'Find the old well at the heart of the ruins.',
		},
		{
			id: 'objective-boss',
			mapId: 'map-ruins',
			key: 'sealed-reliquary',
			type: 'defeat-boss',
			targetNodeId: null,
			required: false,
			displayName: 'Explore the Sealed Reliquary',
			description: 'An optional challenge waits beyond the broken overlook.',
		},
	],
	completedObjectiveIds: [],
	tileBalance: 12,
	navigation: null,
};

const villageInteriorMap: PartyMap = {
	currentChapter: 1,
	currentNodeId: 'village-hub',
	currentMap: {
		id: 'map-village',
		mapType: 'village',
		name: "Wayfarer's Rest",
		templateKey: 'village-v1',
		parentNodeId: 'overworld-village',
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
			mapMetadata: metadata('map-village', 'village-hub', 0, 'hub', 0, true),
			discovered: true,
		},
	],
	edges: [],
	objectives: [],
	completedObjectiveIds: [],
	tileBalance: 12,
	navigation: null,
};

const meta = {
	title: 'Party/LocationPanel',
	component: LocationPanel,
	parameters: { layout: 'padded' },
} satisfies Meta<typeof LocationPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DungeonObjectives: Story = {
	args: { map: dungeonMap },
};

export const VillageInterior: Story = {
	args: { map: villageInteriorMap },
};
