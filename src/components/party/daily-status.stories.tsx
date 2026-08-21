import type { Meta, StoryObj } from '@storybook/react-vite';

import { DailyStatus } from './daily-status';
import type { DailyProgress, PartyRoster } from '#/lib/api';

const provisional: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-2',
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

const roster: PartyRoster = {
	partyId: 'party-1',
	members: [
		{
			userId: 'user-1',
			displayName: 'Hero',
			role: 'leader',
			character: {
				name: 'Aster',
				classKey: 'warrior',
				className: 'Warrior',
				backgroundKey: 'wanderer',
				backgroundName: 'Wanderer',
				stats: { strength: 7, agility: 4, vitality: 6, insight: 3 },
			},
			progression: { experience: 400, level: 3, nextLevelExperience: 900 },
			health: { currentHealth: 64, maxHealth: 80 },
		},
		{
			userId: 'user-2',
			displayName: 'Mira',
			role: 'member',
			character: {
				name: 'Mira',
				classKey: 'cleric',
				className: 'Cleric',
				backgroundKey: 'caretaker',
				backgroundName: 'Caretaker',
				stats: { strength: 3, agility: 4, vitality: 5, insight: 8 },
			},
			progression: { experience: 100, level: 2, nextLevelExperience: 400 },
			health: { currentHealth: 38, maxHealth: 50 },
		},
	],
};

const meta = {
	title: 'Party/DailyStatus',
	component: DailyStatus,
	parameters: { layout: 'padded' },
	args: { daily: provisional, roster },
} satisfies Meta<typeof DailyStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Provisional: Story = {};

export const Complete: Story = {
	args: {
		daily: {
			...provisional,
			movementUnits: 10,
			movementSatisfied: true,
			challengeContribution: 10,
			challengeProgress: 20,
			challengeCleared: true,
			status: 'complete',
		},
	},
};

export const WithoutChallenge: Story = {
	args: {
		daily: {
			...provisional,
			challengeContribution: 0,
			challengeProgress: 0,
			challengeCost: 0,
			challengeCleared: true,
		},
	},
};

export const WithoutRoster: Story = {
	args: { roster: undefined },
};
