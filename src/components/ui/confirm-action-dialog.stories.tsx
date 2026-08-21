import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './button';
import { ConfirmActionDialog } from './alert-dialog';

const meta = {
	title: 'UI/ConfirmActionDialog',
	component: ConfirmActionDialog,
	parameters: { layout: 'centered' },
	args: {
		open: false,
		onOpenChange: () => undefined,
		title: 'Open the next route?',
		description: 'The party will be ready to continue along the selected route.',
		confirmLabel: 'Continue',
		onConfirm: () => undefined,
	},
} satisfies Meta<typeof ConfirmActionDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function DialogStory({ destructive = false, pending = false }: { destructive?: boolean; pending?: boolean }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open confirmation</Button>
			<ConfirmActionDialog
				open={open}
				onOpenChange={setOpen}
				title={destructive ? 'Leave this party?' : 'Open the next route?'}
				description={
					destructive
						? 'Leaving removes your traveler from the active expedition.'
						: 'The party will be ready to continue along the selected route.'
				}
				confirmLabel={destructive ? 'Leave party' : 'Continue'}
				destructive={destructive}
				pending={pending}
				onConfirm={() => setOpen(false)}
			/>
		</>
	);
}

export const Default: Story = {
	render: () => <DialogStory />,
};

export const Destructive: Story = {
	render: () => <DialogStory destructive />,
};

export const Pending: Story = {
	render: () => <DialogStory pending />,
};
