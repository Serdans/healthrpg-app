import type { Meta, StoryObj } from '@storybook/react-vite';

import { GameplayPanelState } from './gameplay-panel-state';

const meta = {
	title: 'Party/GameplayPanelState',
	component: GameplayPanelState,
	parameters: { layout: 'padded' },
	args: { label: 'Reading the party trail…', tone: 'atlas' },
} satisfies Meta<typeof GameplayPanelState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {};

export const ErrorState: Story = {
	args: {
		error: new globalThis.Error('The map service is unavailable.'),
		message: 'The field map could not be read.',
		onRetry: () => undefined,
		retryLabel: 'Retry map',
	},
};
