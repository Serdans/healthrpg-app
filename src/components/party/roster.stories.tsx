import type { Meta, StoryObj } from '@storybook/react-vite';

import type { PartyRoster } from '#/lib/api';

import { Roster } from './roster';

const roster: PartyRoster = {
	partyId: 'party-1',
	members: [
		{
			userId: 'user-1',
			displayName: 'Hero',
			role: 'leader',
			character: {
				name: 'Aster',
				classKey: 'warrior',
				className: 'Warrior',
				backgroundKey: 'wanderer',
				backgroundName: 'Wanderer',
				stats: { strength: 7, agility: 4, vitality: 6, insight: 3 },
				combatStats: { strength: 8, agility: 4, vitality: 7, insight: 3, defense: 3 },
			},
			progression: { experience: 400, level: 3, nextLevelExperience: 900 },
			health: { currentHealth: 64, maxHealth: 80 },
		},
		{
			userId: 'user-2',
			displayName: 'Mira',
			role: 'member',
			character: {
				name: 'Mira',
				classKey: 'cleric',
				className: 'Cleric',
				backgroundKey: 'caretaker',
				backgroundName: 'Caretaker',
				stats: { strength: 3, agility: 4, vitality: 5, insight: 8 },
				combatStats: { strength: 3, agility: 4, vitality: 5, insight: 8, defense: 1 },
			},
			progression: { experience: 100, level: 2, nextLevelExperience: 400 },
			health: { currentHealth: 38, maxHealth: 50 },
		},
	],
};

const fullPartyRoster: PartyRoster = {
	...roster,
	members: [
		...roster.members,
		{
			userId: 'user-3',
			displayName: 'Rook',
			role: 'member',
			character: {
				name: 'Rook',
				classKey: 'rogue',
				className: 'Rogue',
				backgroundKey: 'artisan',
				backgroundName: 'Artisan',
				stats: { strength: 5, agility: 8, vitality: 4, insight: 5 },
				combatStats: { strength: 5, agility: 9, vitality: 4, insight: 5, defense: 0 },
			},
			progression: { experience: 280, level: 3, nextLevelExperience: 900 },
			health: { currentHealth: 26, maxHealth: 60 },
		},
		{
			userId: 'user-4',
			displayName: 'Sol',
			role: 'member',
			character: {
				name: 'Sol',
				classKey: 'mage',
				className: 'Mage',
				backgroundKey: 'scholar',
				backgroundName: 'Scholar',
				stats: { strength: 2, agility: 5, vitality: 3, insight: 9 },
				combatStats: { strength: 2, agility: 5, vitality: 3, insight: 10, defense: 1 },
			},
			progression: { experience: 560, level: 3, nextLevelExperience: 900 },
			health: { currentHealth: 42, maxHealth: 55 },
		},
	],
};

const meta = {
	title: 'Party/Roster',
	component: Roster,
	parameters: { layout: 'padded' },
	args: { roster, currentUserId: 'user-1' },
} satisfies Meta<typeof Roster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CharacterSheet: Story = {};

export const FullParty: Story = {
	args: { roster: fullPartyRoster },
};

export const MissingCharacter: Story = {
	args: {
		roster: {
			...roster,
			members: roster.members.map((member, index) => (index === 0 ? { ...member, character: null, health: null } : member)),
		},
	},
};
