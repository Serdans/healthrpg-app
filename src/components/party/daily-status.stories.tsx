import type { Meta, StoryObj } from '@storybook/react-vite';

import { DailyStatus } from './daily-status';
import type { DailyProgress } from '#/lib/api';

const provisional: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-2',
	worldDate: '2026-08-21',
	movementUnits: 7,
	movementCost: 10,
	movementSatisfied: false,
	recoveryPoints: 4,
	gateContribution: 4,
	gateProgress: 12,
	gateCost: 20,
	gateUnlocked: false,
	status: 'provisional',
	members: [
		{ userId: 'user-1', movementUnits: 7, recoveryPoints: 4, status: 'provisional' },
		{ userId: 'user-2', movementUnits: 6, recoveryPoints: 3, status: 'provisional' },
	],
};

const meta = {
	title: 'Party/DailyStatus',
	component: DailyStatus,
	parameters: { layout: 'padded' },
	args: { daily: provisional },
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
			gateContribution: 10,
			gateProgress: 20,
			gateUnlocked: true,
			status: 'complete',
		},
	},
};
