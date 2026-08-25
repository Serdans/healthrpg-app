import type { Meta, StoryObj } from '@storybook/react-vite';

import type { DailyProgress } from '#/lib/api';
import type { DailyLoopState } from '#/lib/daily-loop';

import { DailyCommandCenter } from './daily-command-center';

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
		{ userId: 'user-2', movementUnits: 10, recoveryPoints: 3, status: 'complete' },
	],
};

const state = (overrides: Partial<DailyLoopState>): DailyLoopState => ({
	kind: 'command-required',
	tone: 'combat',
	badge: 'Your card plan is needed',
	title: 'Queue cards for today’s encounter.',
	description: 'Read the field, queue cards, and lock in your traveler’s plan before the day closes.',
	actionHref: '#party-action',
	actionLabel: 'Build card plan',
	...overrides,
});

const meta = {
	title: 'Party/DailyCommandCenter',
	component: DailyCommandCenter,
	parameters: { layout: 'padded' },
	args: { daily, state: state({}) },
} satisfies Meta<typeof DailyCommandCenter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CombatCommandRequired: Story = {};

export const RouteVoteSaved: Story = {
	args: {
		state: state({
			kind: 'waiting-for-party',
			tone: 'arcane',
			badge: 'Vote saved',
			title: 'Your route vote is saved.',
			description: 'Wait for the rest of the party, or revisit your choice before the vote closes.',
			actionLabel: 'Review route vote',
		}),
	},
};

export const ChoiceRequired: Story = {
	args: {
		state: state({
			kind: 'choice-required',
			tone: 'arcane',
			badge: 'Your choice is needed',
			title: 'Choose how the party responds.',
			description: 'Read the scene and select the response that carries the party forward.',
			actionLabel: 'Choose a response',
		}),
	},
};

export const Resolved: Story = {
	args: {
		state: state({
			kind: 'resolved',
			tone: 'history',
			badge: 'Resolved',
			title: 'The encounter has resolved.',
			description: 'Read the latest result in the chronicle and follow the party’s next lead.',
			actionHref: '#party-chronicle',
			actionLabel: 'Read the chronicle',
		}),
	},
};

export const ReviewOnly: Story = {
	args: {
		state: state({
			kind: 'review-only',
			tone: 'history',
			badge: 'Review mode',
			title: 'The expedition is closed.',
			description: 'Review the party’s trail and chronicle. New daily actions are no longer available.',
			actionHref: '#party-field',
			actionLabel: 'Review the field',
		}),
	},
};

export const SignalUnavailable: Story = {
	args: {
		daily: undefined,
		state: state({
			kind: 'signal-unavailable',
			tone: 'village',
			badge: 'Signal unavailable',
			title: 'Today’s signal is still out of reach.',
			description: 'The party can continue once the daily health signal is available.',
			actionHref: undefined,
			actionLabel: undefined,
		}),
	},
};
