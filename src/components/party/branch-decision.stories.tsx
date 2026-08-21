import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { PartyMap, PartyVotes } from '#/lib/api';

import { BranchDecision } from './branch-decision';

const map: PartyMap = {
	currentChapter: 1,
	currentNodeId: 'crossing',
	currentMap: {
		id: 'overworld',
		mapType: 'overworld',
		name: 'The Atlas',
		templateKey: 'overworld-v1',
		parentNodeId: null,
		entryNodeId: 'crossing',
	},
	enterableLocation: null,
	nodes: [
		{
			id: 'crossing',
			chapterNo: 1,
			regionNo: 1,
			name: 'Mossway Crossing',
			nodeType: 'travel',
			templateKey: 'travel-v1',
			config: null,
			mapMetadata: {
				mapId: 'overworld',
				nodeId: 'crossing',
				floorNo: 0,
				role: 'overworld',
				sortOrder: 0,
				isEntry: true,
				isExit: false,
			},
		},
		{
			id: 'lantern-road',
			chapterNo: 1,
			regionNo: 2,
			name: 'North Lantern Road',
			nodeType: 'travel',
			templateKey: 'travel-v1',
			config: null,
			mapMetadata: {
				mapId: 'overworld',
				nodeId: 'lantern-road',
				floorNo: 0,
				role: 'overworld',
				sortOrder: 1,
				isEntry: false,
				isExit: false,
			},
		},
		{
			id: 'old-ruins',
			chapterNo: 1,
			regionNo: 2,
			name: 'The Old Ruins',
			nodeType: 'dungeon',
			templateKey: 'dungeon-v1',
			config: null,
			mapMetadata: {
				mapId: 'overworld',
				nodeId: 'old-ruins',
				floorNo: 0,
				role: 'overworld',
				sortOrder: 2,
				isEntry: false,
				isExit: false,
			},
		},
	],
	edges: [
		{ id: 'edge-lantern-road', fromNodeId: 'crossing', toNodeId: 'lantern-road', optionKey: 'lantern-road', sortOrder: 0 },
		{ id: 'edge-old-ruins', fromNodeId: 'crossing', toNodeId: 'old-ruins', optionKey: 'old-ruins', sortOrder: 1 },
	],
	objectives: [],
	completedObjectiveIds: [],
};

const votes: PartyVotes = {
	accepted: true,
	partyId: 'party-1',
	nodeId: 'crossing',
	deadlineAt: '2026-08-22T00:00:00.000Z',
	resolvedEdgeId: null,
	votes: [],
};

type BranchMutation = ComponentProps<typeof BranchDecision>['mutation'];

function mutation(overrides: Partial<BranchMutation> = {}): BranchMutation {
	return {
		data: undefined,
		error: null,
		isError: false,
		isPending: false,
		isSuccess: false,
		mutate: () => undefined,
		...overrides,
	} as BranchMutation;
}

const meta = {
	title: 'Party/BranchDecision',
	component: BranchDecision,
	parameters: { layout: 'padded' },
	args: {
		map,
		votes,
		edges: map.edges,
		mutation: mutation(),
		userId: 'user-1',
		memberCount: 3,
		timeZone: 'UTC',
	},
} satisfies Meta<typeof BranchDecision>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {};

export const SavedVote: Story = {
	args: {
		votes: { ...votes, votes: [{ userId: 'user-1', edgeId: 'edge-lantern-road' }] },
		mutation: mutation({ data: { ...votes, votes: [{ userId: 'user-1', edgeId: 'edge-lantern-road' }] }, isSuccess: true }),
	},
};

export const Saving: Story = {
	args: { mutation: mutation({ isPending: true }) },
};

export const Resolved: Story = {
	args: {
		votes: {
			...votes,
			resolvedEdgeId: 'edge-lantern-road',
			votes: [{ userId: 'user-1', edgeId: 'edge-lantern-road' }],
		},
	},
};

export const ReadOnly: Story = {
	args: { readOnly: true },
};
