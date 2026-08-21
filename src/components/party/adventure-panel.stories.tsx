import type { Meta, StoryObj } from '@storybook/react-vite';

import { AdventurePanel } from './adventure-panel';
import type { Adventure } from '#/lib/api';

const adventure: Adventure = {
	partyId: 'party-1',
	currentNodeId: 'node-2',
	land: {
		key: 'mistwood',
		chapterNo: 1,
		displayName: 'The Mistwood Marches',
		description: 'A lantern-lit frontier where every landmark marks a new promise.',
	},
	currentObjective: {
		key: 'first-ruins',
		displayName: 'Reach the First Ruins',
		description: 'Follow the old road and discover what waits beyond the moss-covered gate.',
		landmarkKey: 'first-ruins',
	},
	history: [
		{
			landKey: 'first-reach',
			objectiveKey: 'wayfarers-rest',
			displayName: 'Wayfarer’s Rest',
			description: 'The party found a safe place to recover before entering the Marches.',
			landmarkKey: 'wayfarers-rest',
			nodeId: 'node-1',
			completedAt: '2026-08-20T18:30:00.000Z',
		},
	],
};

const meta = {
	title: 'Party/AdventurePanel',
	component: AdventurePanel,
	parameters: { layout: 'padded' },
	args: {
		adventure,
		timeZone: 'UTC',
		pending: false,
		error: null,
		onRetry: () => undefined,
		retrying: false,
	},
} satisfies Meta<typeof AdventurePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CurrentObjective: Story = {};

export const LandComplete: Story = {
	args: {
		adventure: { ...adventure, currentObjective: null, history: [] },
	},
};

export const Loading: Story = {
	args: { adventure: undefined, pending: true },
};

export const ErrorState: Story = {
	args: { adventure: undefined, error: new globalThis.Error('Adventure service unavailable.') },
};
