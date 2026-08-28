import type { Meta, StoryObj } from '@storybook/react-vite';

import type { DailyProgress } from '#/lib/api';
import type { DailyLoopState } from '#/lib/daily-loop';

import { DailyActionStrip } from './daily-command-center';

const daily: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	movementUnits: 8,
	movementCost: 10,
	movementSatisfied: false,
	recoveryPoints: 4,
	challengeContribution: 0,
	challengeProgress: 0,
	challengeCost: 0,
	challengeCleared: true,
	status: 'provisional',
	members: [
		{ userId: 'user-1', movementUnits: 8, recoveryPoints: 4, status: 'provisional' },
		{ userId: 'user-2', movementUnits: 0, recoveryPoints: 2, status: 'provisional' },
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
	title: 'Party/DailyActionStrip',
	component: DailyActionStrip,
	parameters: { layout: 'padded' },
	args: { daily, state: state({}) },
} satisfies Meta<typeof DailyActionStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CommandRequired: Story = {
	render: () => <DailyActionStrip daily={daily} state={state({})} />,
};

export const WaitingForParty: Story = {
	render: () => (
		<DailyActionStrip
			daily={daily}
			state={state({
				kind: 'waiting-for-party',
				tone: 'arcane',
				badge: 'Vote saved',
				title: 'Your route vote is saved.',
				description: 'Wait for the rest of the party.',
				actionLabel: 'Review route vote',
			})}
		/>
	),
};

export const ReviewOnly: Story = {
	render: () => (
		<DailyActionStrip
			daily={daily}
			state={state({
				kind: 'review-only',
				tone: 'history',
				badge: 'Review mode',
				title: 'The expedition is closed.',
				description: 'Review the party trail.',
				actionHref: '#party-field',
				actionLabel: 'Review the field',
			})}
		/>
	),
};

export const SignalUnavailable: Story = {
	render: () => (
		<DailyActionStrip
			state={state({
				kind: 'signal-unavailable',
				tone: 'village',
				badge: 'Signal unavailable',
				title: 'Today’s signal is still out of reach.',
				description: 'Wait for the daily signal.',
				actionHref: undefined,
				actionLabel: undefined,
			})}
			signal={{ isError: true, message: 'Today’s health signal could not be read.', onRetry: () => undefined }}
		/>
	),
};
