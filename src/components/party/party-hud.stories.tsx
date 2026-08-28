import type { Meta, StoryObj } from '@storybook/react-vite';

import type { Adventure, DailyProgress, Party } from '#/lib/api';

import { PartyHud } from './party-hud';

const party: Party = {
	id: 'party-1',
	name: 'Lantern Walkers',
	status: 'active',
	lastVillageNodeId: null,
	memberCapacity: 6,
	currentNode: {
		id: 'node-1',
		chapterNo: 1,
		regionNo: 1,
		name: 'Mossway Crossing',
		nodeType: 'travel',
		templateKey: 'travel-v1',
		config: {
			movementCost: 10,
			challengeCost: 0,
			event: { eventType: 'narrative', prompt: 'Which light do you follow?', choices: [] },
		},
	},
	challengeProgress: 12,
	tileBalance: 12,
	decisionStartedAt: null,
	activeEncounterNodeId: null,
	members: [
		{ userId: 'user-1', role: 'leader', displayName: 'Hero' },
		{ userId: 'user-2', role: 'member', displayName: 'Mira' },
	],
};

const adventure: Adventure = {
	partyId: 'party-1',
	currentNodeId: 'node-1',
	land: {
		key: 'mistwood',
		chapterNo: 1,
		displayName: 'The Mistwood Marches',
		description: 'A lantern-lit frontier where every landmark marks a new promise.',
	},
	currentObjective: {
		key: 'mossway-crossing',
		displayName: 'Cross Mossway Crossing',
		description: 'Guide the party through the first stretch of the Marches.',
		landmarkKey: 'mossway-crossing',
	},
	history: [],
};

const daily: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	movementUnits: 7,
	movementCost: 10,
	movementSatisfied: false,
	recoveryPoints: 4,
	challengeContribution: 4,
	challengeProgress: 12,
	challengeCost: 20,
	challengeCleared: false,
	status: 'provisional',
	members: [
		{ userId: 'user-1', movementUnits: 7, recoveryPoints: 4, status: 'provisional' },
		{ userId: 'user-2', movementUnits: 6, recoveryPoints: 3, status: 'provisional' },
	],
};

const meta = {
	title: 'Party/PartyHud',
	component: PartyHud,
	parameters: { layout: 'padded' },
	args: { party, adventure, daily },
} satisfies Meta<typeof PartyHud>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expedition: Story = {};

export const WithoutObjective: Story = {
	args: { adventure: { ...adventure, currentObjective: null } },
};

export const DailySignalUnavailable: Story = {
	args: { daily: undefined },
};

export const WithoutChallenge: Story = {
	args: {
		daily: {
			...daily,
			challengeContribution: 0,
			challengeProgress: 0,
			challengeCost: 0,
			challengeCleared: true,
		},
	},
};
