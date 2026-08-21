import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { WorldMap } from './world-map';
import type { PartyMap } from '#/lib/api';

const map: PartyMap = {
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
};

const twoDimensionalMap: PartyMap = {
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

export const TravelingParty: Story = {
	args: { map: twoDimensionalMap },
	render: () => <TravelerPreview />,
};

export const LandmarkGallery: Story = {
	args: {
		map: {
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
		},
	},
};
