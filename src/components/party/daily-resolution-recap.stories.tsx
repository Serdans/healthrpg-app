import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import type { PartyRecap } from '#/lib/api';

import { DailyResolutionRecap } from './daily-resolution-recap';

const baseResolution: PartyRecap['resolution'] = {
	sourceNode: { id: 'node-1', name: 'Mossway Crossing', nodeType: 'travel' },
	destinationNode: { id: 'node-2', name: 'North Lantern Road', nodeType: 'travel' },
	outcome: 'advanced',
	movement: { units: 12, cost: 10, satisfied: true },
	recoveryPoints: 4,
	challenge: { progressBefore: 4, contribution: 8, progressAfter: 12, cost: 10, cleared: true },
	route: null,
	event: null,
	combats: [],
	rewards: [],
	navigation: null,
};

const recap: PartyRecap = {
	partyId: 'party-1',
	worldDate: '2026-08-20',
	resolvedAt: '2026-08-21T00:05:00.000Z',
	resolution: baseResolution,
};

const meta = {
	title: 'Party/DailyResolutionRecap',
	component: DailyResolutionRecap,
	parameters: { layout: 'padded' },
	args: { partyId: 'party-1', recap, timeZone: 'UTC' },
} satisfies Meta<typeof DailyResolutionRecap>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Travel: Story = {};

export const Rewards: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				rewards: [
					{
						experience: 100,
						currency: { key: 'gold', amount: 40 },
						item: { key: 'herb', quantity: 2 },
						equipment: { key: 'short-sword' },
					},
					{ item: { key: 'moon-seed', quantity: 1 } },
				],
			},
		},
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByTestId('inventory-item-sprite-gold')).toBeInTheDocument();
		await expect(canvas.getByTestId('inventory-item-sprite-herb')).toBeInTheDocument();
		await expect(canvas.getByTestId('inventory-item-sprite-short-sword')).toBeInTheDocument();
		await expect(canvas.getByTestId('inventory-item-sprite-moon-seed')).toHaveAttribute('data-fallback', 'true');
	},
};

export const EventFailure: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				destinationNode: baseResolution.sourceNode,
				outcome: 'held',
				event: {
					eventType: 'narrative',
					outcome: 'failed',
					selectedChoiceKey: 'take-the-road',
					selectionReason: 'deadline',
				},
			},
		},
	},
};

export const OngoingCombat: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				destinationNode: baseResolution.sourceNode,
				outcome: 'held',
				event: {
					eventType: 'combat',
					outcome: 'ongoing',
					selectedChoiceKey: null,
					selectionReason: null,
				},
				combats: [
					{
						completed: false,
						members: [
							{
								userId: 'user-1',
								displayName: 'Hero',
								classKey: 'warrior',
								cards: [{ key: 'class:basic-attack', displayName: 'Basic Attack' }],
								healthBefore: 20,
								recovery: 4,
								cardHealing: 0,
								damageTaken: 2,
								healthAfter: 22,
								maxHealth: 30,
							},
						],
						enemies: [
							{
								id: 'enemy-1',
								archetypeKey: 'wolf',
								displayName: 'Wolf',
								healthBefore: 12,
								damageTaken: 4,
								healthAfter: 8,
								maxHealth: 12,
								defeated: false,
							},
						],
					},
				],
			},
		},
	},
};

export const CompletedCombat: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				event: {
					eventType: 'combat',
					outcome: 'succeeded',
					selectedChoiceKey: null,
					selectionReason: null,
				},
				combats: [
					{
						completed: true,
						members: [],
						enemies: [
							{
								id: 'enemy-1',
								archetypeKey: 'wolf',
								displayName: 'Wolf',
								healthBefore: 12,
								damageTaken: 12,
								healthAfter: 0,
								maxHealth: 12,
								defeated: true,
							},
						],
					},
				],
				rewards: [{ experience: 100 }],
			},
		},
	},
};

export const MultipleEncounters: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				combats: [
					{
						completed: true,
						members: [],
						enemies: [
							{
								id: 'slime-1',
								archetypeKey: 'slime',
								displayName: 'Slime',
								healthBefore: 8,
								damageTaken: 8,
								healthAfter: 0,
								maxHealth: 8,
								defeated: true,
							},
						],
					},
					{
						completed: true,
						members: [],
						enemies: [
							{
								id: 'bat-1',
								archetypeKey: 'bat',
								displayName: 'Cave Bat',
								healthBefore: 12,
								damageTaken: 12,
								healthAfter: 0,
								maxHealth: 12,
								defeated: true,
							},
						],
					},
				],
			},
		},
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByText('Encounter 1 recap')).toBeInTheDocument();
		await expect(canvas.getByText('Encounter 2 recap')).toBeInTheDocument();
	},
};

export const NoRecap: Story = { args: { recap: null } };

export const WithoutChallenge: Story = {
	args: {
		recap: {
			...recap,
			resolution: {
				...baseResolution,
				challenge: { progressBefore: 0, contribution: 0, progressAfter: 0, cost: 0, cleared: true },
			},
		},
	},
};

export const Loading: Story = {
	args: { recap: undefined, pending: true },
};

export const ErrorState: Story = {
	args: {
		recap: undefined,
		error: new globalThis.Error('The recap service is unavailable.'),
		onRetry: () => undefined,
		retrying: false,
	},
};
