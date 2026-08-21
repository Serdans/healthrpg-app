import type { Meta, StoryObj } from '@storybook/react-vite';

import { EmptyState, ErrorNotice, LoadingState, SuccessNotice } from './app-state';

const meta = {
	title: 'Application/State',
	parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
	render: () => <LoadingState label="Reading the current adventure…" />,
};

export const Success: Story = {
	render: () => <SuccessNotice>Your route vote is saved.</SuccessNotice>,
};

export const Error: Story = {
	render: () => <ErrorNotice message="The expedition service is unavailable." onRetry={() => undefined} />,
};

export const Empty: Story = {
	render: () => <EmptyState title="The chronicle is waiting." copy="Resolved events and encounters will leave rewards here." />,
};
