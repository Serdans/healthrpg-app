import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, within } from 'storybook/test';

import type { Inventory, Loadout, PartyRoster } from '#/lib/api';

import { InventoryView } from './inventory-view';
import type { InventoryViewProps } from './inventory-view';

const inventory: Inventory = {
	currencies: [
		{
			key: 'gold',
			kind: 'currency',
			displayName: 'Gold',
			details: {
				description: 'The common coin of every road, market, and waystation.',
				equipmentSlot: null,
				effect: null,
			},
			quantity: 120,
		},
	],
	items: [
		{
			key: 'herb',
			kind: 'item',
			displayName: 'Herb',
			details: {
				description: 'A fresh bundle of restorative leaves gathered along the trail.',
				equipmentSlot: null,
				effect: { kind: 'heal', amount: 10 },
			},
			quantity: 2,
		},
	],
	equipment: [
		{
			key: 'short-sword',
			kind: 'equipment',
			displayName: 'Short Sword',
			details: {
				description: 'A dependable light blade made for a traveler’s first real battles.',
				equipmentSlot: 'weapon',
				effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
			},
			quantity: 1,
		},
		{
			key: 'mace',
			kind: 'equipment',
			displayName: 'Mace',
			details: {
				description: 'A compact iron-headed weapon that asks little of its wielder.',
				equipmentSlot: 'weapon',
				effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
			},
			quantity: 1,
		},
		{
			key: 'leather-armor',
			kind: 'equipment',
			displayName: 'Leather Armor',
			details: {
				description: 'Supple hide that turns a glancing blow into a survivable one.',
				equipmentSlot: 'body',
				effect: { kind: 'stat-modifiers', modifiers: { defense: 1, vitality: 1 } },
			},
			quantity: 1,
		},
		{
			key: 'traveler-sandals',
			kind: 'equipment',
			displayName: 'Traveler Sandals',
			details: {
				description: 'Soft-soled sandals that make the first miles feel less demanding.',
				equipmentSlot: 'boots',
				effect: { kind: 'stat-modifiers', modifiers: { agility: 1 } },
			},
			quantity: 1,
		},
	],
};

const emptyInventory: Inventory = {
	currencies: [],
	items: [],
	equipment: [],
};

const unknownItemInventory: Inventory = {
	currencies: inventory.currencies,
	items: [
		{
			key: 'moon-seed',
			kind: 'item',
			displayName: 'Moon Seed',
			details: { description: 'An un catalogued seed.', equipmentSlot: null, effect: null },
			quantity: 1,
		},
	],
	equipment: [],
};

const emptyLoadout: Loadout = {
	weapon: null,
	body: null,
	head: null,
	arm: null,
	boots: null,
	ring: null,
	shirt: null,
};

const roster: PartyRoster = {
	partyId: 'party-1',
	members: [
		{
			userId: 'user-1',
			role: 'leader',
			displayName: 'Hero',
			character: {
				name: 'Hero',
				classKey: 'warrior',
				className: 'Warrior',
				backgroundKey: 'wanderer',
				backgroundName: 'Wanderer',
				stats: { strength: 4, agility: 3, vitality: 4, insight: 2 },
				combatStats: { strength: 5, agility: 3, vitality: 5, insight: 2, defense: 2 },
			},
			progression: { experience: 120, level: 2, nextLevelExperience: 400 },
			health: { currentHealth: 20, maxHealth: 20 },
		},
		{
			userId: 'user-2',
			role: 'member',
			displayName: 'Mira',
			character: {
				name: 'Mira',
				classKey: 'cleric',
				className: 'Cleric',
				backgroundKey: 'caretaker',
				backgroundName: 'Caretaker',
				stats: { strength: 3, agility: 4, vitality: 5, insight: 8 },
				combatStats: { strength: 3, agility: 4, vitality: 5, insight: 8, defense: 1 },
			},
			progression: { experience: 400, level: 3, nextLevelExperience: 900 },
			health: { currentHealth: 38, maxHealth: 50 },
		},
	],
};

const equippedLoadout: Loadout = {
	...emptyLoadout,
	weapon: {
		slot: 'weapon',
		key: 'short-sword',
		displayName: 'Short Sword',
		details: {
			description: 'A dependable light blade made for a traveler’s first real battles.',
			equipmentSlot: 'weapon',
			effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
		},
		quantity: 1,
	},
	body: {
		slot: 'body',
		key: 'leather-armor',
		displayName: 'Leather Armor',
		details: {
			description: 'Supple hide that turns a glancing blow into a survivable one.',
			equipmentSlot: 'body',
			effect: { kind: 'stat-modifiers', modifiers: { defense: 1, vitality: 1 } },
		},
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
		await userEvent.click(canvas.getAllByRole('button', { name: 'Equip' })[0]);
		await expect(args.onEquip).toHaveBeenCalledWith('weapon', 'short-sword');
	},
};

export const UseOnPartyMember: Story = {
	args: {
		activeParties: [{ id: 'party-1', name: 'Lantern Walkers' }],
		selectedPartyId: 'party-1',
		roster,
		onUseItem: fn<NonNullable<InventoryViewProps['onUseItem']>>(),
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Use on traveler' }));
		const dialog = screen.getByRole('alertdialog');
		await expect(dialog).toBeVisible();
		await userEvent.click(within(dialog).getByDisplayValue('user-2'));
		await userEvent.click(within(dialog).getByRole('button', { name: 'Use item' }));
		await expect(args.onUseItem).toHaveBeenCalledWith('herb', 'user-2');
	},
};

export const Equipped: Story = {
	args: {
		loadout: equippedLoadout,
		onUnequip: fn<InventoryViewProps['onUnequip']>(),
	},
	play: async ({ args, canvas, userEvent }) => {
		await userEvent.click(canvas.getAllByRole('button', { name: 'Unequip' })[0]);
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
		await expect(canvas.getByTestId('inventory-item-sprite-herb')).toHaveAttribute('data-item-sprite', 'herb');
		await expect(canvas.getAllByTestId('inventory-item-sprite-short-sword')).not.toHaveLength(0);
		await expect(canvas.getAllByTestId('inventory-item-sprite-mace')).not.toHaveLength(0);
		await expect(canvas.getAllByTestId('inventory-item-sprite-leather-armor')).not.toHaveLength(0);
		await expect(canvas.getAllByTestId('inventory-item-sprite-traveler-sandals')).not.toHaveLength(0);
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
		status: 'Short Sword equipped as Weapon.',
	},
	play: async ({ canvas }) => {
		await expect(canvas.getByRole('status')).toHaveTextContent('Short Sword equipped as Weapon.');
	},
};
