import { MapPin } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { StatusCard } from './status-card';

const meta = {
	title: 'Party/StatusCard',
	component: StatusCard,
	parameters: { layout: 'centered' },
	args: {
		icon: <MapPin />,
		eyebrow: 'Current node',
		value: 'Mossway Crossing',
		detail: 'travel · region 1',
	},
} satisfies Meta<typeof StatusCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
