import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { PartyEvent } from '#/lib/api';

import { EventDecision } from './event-decision';

const event: PartyEvent = {
	partyId: 'party-1',
	nodeId: 'crossing',
	worldDate: '2026-08-21',
	eventType: 'narrative',
	prompt: 'Which light do you follow through the mist?',
	choices: [
		{
			key: 'lantern',
			displayName: 'Follow the lanterns',
			description: 'A warm glow promises a safe road, though the trail may be longer.',
			requirements: { movementUnits: 4, recoveryPoints: 1 },
		},
		{
			key: 'stars',
			displayName: 'Read the stars',
			description: 'Take the high path and trust the sky to reveal the old stones.',
			requirements: { movementUnits: 6, recoveryPoints: 0 },
		},
	],
	selectedChoiceKey: null,
	votes: [],
};

type EventMutation = ComponentProps<typeof EventDecision>['mutation'];

function mutation(overrides: Partial<EventMutation> = {}): EventMutation {
	return {
		data: undefined,
		error: null,
		isError: false,
		isPending: false,
		isSuccess: false,
		mutate: () => undefined,
		...overrides,
	} as EventMutation;
}

const meta = {
	title: 'Party/EventDecision',
	component: EventDecision,
	parameters: { layout: 'padded' },
	args: { event, mutation: mutation() },
} satisfies Meta<typeof EventDecision>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Available: Story = {};

export const SavedChoice: Story = {
	args: {
		event: { ...event, selectedChoiceKey: 'lantern', votes: [{ userId: 'user-1', choiceKey: 'lantern' }] },
		mutation: mutation({
			data: { ...event, selectedChoiceKey: 'lantern', votes: [{ userId: 'user-1', choiceKey: 'lantern' }] },
			isSuccess: true,
		}),
	},
};

export const Saving: Story = {
	args: { mutation: mutation({ isPending: true }) },
};

export const ReadOnly: Story = {
	args: { readOnly: true },
};
