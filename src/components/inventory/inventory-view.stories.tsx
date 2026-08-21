import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, within } from 'storybook/test';

import type { Inventory, Loadout } from '#/lib/api';

import { InventoryView } from './inventory-view';
import type { InventoryViewProps } from './inventory-view';

const inventory: Inventory = {
	currencies: [{ key: 'gold', kind: 'currency', displayName: 'Gold', quantity: 120 }],
	items: [{ key: 'field-herb', kind: 'item', displayName: 'Field Herb', quantity: 2 }],
	equipment: [{ key: 'trail-blade', kind: 'equipment', displayName: 'Trail Blade', quantity: 1 }],
};

const emptyInventory: Inventory = {
	currencies: [],
	items: [],
	equipment: [],
};

const unknownItemInventory: Inventory = {
	currencies: inventory.currencies,
	items: [{ key: 'moon-seed', kind: 'item', displayName: 'Moon Seed', quantity: 1 }],
	equipment: [],
};

const emptyLoadout: Loadout = {
	weapon: null,
	armor: null,
	accessory: null,
};

const equippedLoadout: Loadout = {
	...emptyLoadout,
	weapon: {
		slot: 'weapon',
		key: 'trail-blade',
		displayName: 'Trail Blade',
		quantity: 1,
	},
};

const onEquip: InventoryViewProps['onEquip'] = () => undefined;
const onUnequip: InventoryViewProps['onUnequip'] = () => undefined;

const meta = {
	title: 'Inventory/InventoryView',
	component: InventoryView,
	parameters: { layout: 'padded' },
	args: {
		inventory,
		loadout: emptyLoadout,
		onEquip,
		onUnequip,
	},
} satisfies Meta<typeof InventoryView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
	args: {
		onEquip: fn<InventoryViewProps['onEquip']>(),
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Equip Trail Blade' }));
		await expect(args.onEquip).toHaveBeenCalledWith('weapon', 'trail-blade');
	},
};

export const Equipped: Story = {
	args: {
		loadout: equippedLoadout,
		onUnequip: fn<InventoryViewProps['onUnequip']>(),
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Unequip' }));
		const dialog = screen.getByRole('alertdialog');
		await expect(dialog).toBeVisible();
		await userEvent.click(within(dialog).getByRole('button', { name: 'Unequip' }));
		await expect(args.onUnequip).toHaveBeenCalledWith('weapon');
	},
};

export const EmptySatchel: Story = {
	args: {
		inventory: emptyInventory,
	},
};

export const SpriteAssets: Story = {
	play: async ({ canvas }) => {
		await expect(canvas.getByTestId('inventory-item-sprite-gold')).toHaveAttribute('data-item-sprite', 'gold');
		await expect(canvas.getByTestId('inventory-item-sprite-field-herb')).toHaveAttribute('data-item-sprite', 'field-herb');
		await expect(canvas.getAllByTestId('inventory-item-sprite-trail-blade')).not.toHaveLength(0);
	},
};

export const UnknownCatalogItem: Story = {
	args: {
		inventory: unknownItemInventory,
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByTestId('inventory-item-sprite-moon-seed')).toHaveAttribute('data-fallback', 'true');
	},
};

export const ErrorState: Story = {
	args: {
		error: new Error('The inventory could not be synchronized.'),
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('alert')).toHaveTextContent('The inventory could not be synchronized.');
	},
};

export const Busy: Story = {
	args: {
		loadout: equippedLoadout,
		isBusy: true,
		isUnequipPending: true,
	},
};

export const SavedStatus: Story = {
	args: {
		status: 'Trail Blade equipped as Weapon.',
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('status')).toHaveTextContent('Trail Blade equipped as Weapon.');
	},
};
