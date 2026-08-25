import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import type { Encounter, Inventory } from '#/lib/api';
import { combatCommandState } from '#/lib/combat-command-state';

import { BattleScene } from './battle-scene';

type EncounterCard = Encounter['members'][number]['cards'][number];
type CardPlay = Encounter['members'][number]['plan']['plays'][number];
type PreviewEffect = NonNullable<EncounterCard['preview']>['effects'][number];

const partyNames: Record<string, string> = {
	'user-1': 'Hero',
	'user-2': 'Mira',
	'user-3': 'Rook',
};

function effectPreview(
	kind: PreviewEffect['kind'],
	baseAmount: number,
	options: Partial<Omit<PreviewEffect, 'kind' | 'baseAmount'>> = {},
): EncounterCard['preview'] {
	return {
		effects: [
			{
				kind,
				baseAmount,
				manualTargetBonus: null,
				rallyBonus: null,
				targetCount: null,
				distribution: null,
				...options,
			},
		],
	};
}

function card({
	key,
	sourceKind,
	sourceKey,
	classKey = null,
	displayName,
	description,
	targetMode,
	locked = false,
	repeatable = false,
	unlockLevel = 1,
	preview = null,
}: {
	key: string;
	sourceKind: EncounterCard['sourceKind'];
	sourceKey: string;
	classKey?: EncounterCard['classKey'];
	displayName: string;
	description: string;
	targetMode: EncounterCard['targetMode'];
	locked?: boolean;
	repeatable?: boolean;
	unlockLevel?: number;
	preview?: EncounterCard['preview'];
}): EncounterCard {
	return {
		key,
		sourceKind,
		sourceKey,
		classKey,
		unlockLevel,
		displayName,
		description,
		targetMode,
		repeatable,
		locked,
		selectedCount: 0,
		preview,
	};
}

const warriorCards: EncounterCard[] = [
	card({
		key: 'class:basic-attack',
		sourceKind: 'class',
		sourceKey: 'basic-attack',
		classKey: 'warrior',
		displayName: 'Basic Attack',
		description: 'A reliable strike against one standing enemy.',
		targetMode: 'enemy',
		repeatable: true,
		preview: effectPreview('damage', 5, { targetCount: 1, distribution: 'single' }),
	}),
	card({
		key: 'class:shield-wall',
		sourceKind: 'class',
		sourceKey: 'shield-wall',
		classKey: 'warrior',
		displayName: 'Shield Wall',
		description: 'Brace against the next assault.',
		targetMode: 'none',
		locked: false,
		unlockLevel: 2,
		preview: effectPreview('guard', 5),
	}),
	card({
		key: 'class:iron-guard',
		sourceKind: 'class',
		sourceKey: 'iron-guard',
		classKey: 'warrior',
		displayName: 'Iron Guard',
		description: 'A stronger practiced stance.',
		targetMode: 'none',
		locked: true,
		unlockLevel: 4,
		preview: effectPreview('guard', 10),
	}),
	card({
		key: 'weapon:short-sword',
		sourceKind: 'weapon',
		sourceKey: 'short-sword',
		displayName: 'Short Sword Strike',
		description: 'Use your sword for a focused attack.',
		targetMode: 'enemy',
		preview: effectPreview('damage', 6, { targetCount: 1, distribution: 'single' }),
	}),
];

const clericCards: EncounterCard[] = [
	card({
		key: 'class:basic-attack',
		sourceKind: 'class',
		sourceKey: 'basic-attack',
		classKey: 'cleric',
		displayName: 'Basic Attack',
		description: 'A reliable strike against one standing enemy.',
		targetMode: 'enemy',
		repeatable: true,
		preview: effectPreview('damage', 5, { targetCount: 1, distribution: 'single' }),
	}),
	card({
		key: 'class:mend',
		sourceKind: 'class',
		sourceKey: 'mend',
		classKey: 'cleric',
		displayName: 'Mend',
		description: 'Restore an ally’s health.',
		targetMode: 'ally',
		unlockLevel: 2,
		preview: effectPreview('heal', 10),
	}),
];

const rogueCards: EncounterCard[] = [
	card({
		key: 'class:basic-attack',
		sourceKind: 'class',
		sourceKey: 'basic-attack',
		classKey: 'rogue',
		displayName: 'Basic Attack',
		description: 'A reliable strike against one standing enemy.',
		targetMode: 'enemy',
		repeatable: true,
		preview: effectPreview('damage', 5, { targetCount: 1, distribution: 'single' }),
	}),
	card({
		key: 'class:ambush',
		sourceKind: 'class',
		sourceKey: 'ambush',
		classKey: 'rogue',
		displayName: 'Ambush',
		description: 'Strike from the shadows.',
		targetMode: 'enemy',
		unlockLevel: 2,
		preview: effectPreview('damage', 10, {
			manualTargetBonus: 2,
			targetCount: 1,
			distribution: 'single',
		}),
	}),
];

const activeEncounter: Encounter = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	status: 'active',
	enemies: [
		{ id: 'enemy-1', archetypeKey: 'slime', displayName: 'Slime', maxHealth: 10, currentHealth: 10 },
		{ id: 'enemy-2', archetypeKey: 'wolf', displayName: 'Wolf', maxHealth: 12, currentHealth: 8 },
	],
	members: [
		{
			userId: 'user-1',
			currentHealth: 20,
			maxHealth: 20,
			classKey: 'warrior',
			movementUnits: 8,
			playSlots: 3,
			cards: warriorCards,
			plan: { itemLoadoutKeys: [], plays: [{ cardKey: 'class:basic-attack', targetEnemyId: 'enemy-1', targetUserId: null }] },
			reservedItems: [],
		},
		{
			userId: 'user-2',
			currentHealth: 18,
			maxHealth: 20,
			classKey: 'cleric',
			movementUnits: 6,
			playSlots: 3,
			cards: clericCards,
			plan: { itemLoadoutKeys: [], plays: [{ cardKey: 'class:mend', targetEnemyId: null, targetUserId: 'user-1' }] },
			reservedItems: [],
		},
		{
			userId: 'user-3',
			currentHealth: 12,
			maxHealth: 24,
			classKey: 'rogue',
			movementUnits: 0,
			playSlots: 1,
			cards: rogueCards,
			plan: { itemLoadoutKeys: [], plays: [] },
			reservedItems: [],
		},
	],
};

const inventory: Inventory = {
	currencies: [],
	items: [
		{
			key: 'herb',
			kind: 'item',
			displayName: 'Herb',
			details: { description: 'Restore a small measure of health.', equipmentSlot: null, effect: { kind: 'heal', amount: 10 } },
			quantity: 2,
		},
	],
	equipment: [
		{
			key: 'short-sword',
			kind: 'equipment',
			displayName: 'Short Sword',
			details: {
				description: 'A dependable light blade.',
				equipmentSlot: 'weapon',
				effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
			},
			quantity: 1,
		},
	],
};

function BattlePreview({
	encounter = activeEncounter,
	userId = 'user-1',
	readOnly = false,
}: {
	encounter?: Encounter;
	userId?: string;
	readOnly?: boolean;
}) {
	const currentMember = encounter.members.find((member) => member.userId === userId) ?? encounter.members[0];
	const activeMember = currentMember;
	const [plays, setPlays] = useState<CardPlay[]>(activeMember.plan.plays);
	const initialCardKey = activeMember.plan.plays[0]?.cardKey ?? null;
	const [selectedCardKey, setSelectedCardKey] = useState<string | null>(initialCardKey);
	const [selectedPlayIndex, setSelectedPlayIndex] = useState<number | null>(activeMember.plan.plays.length > 0 ? 0 : null);
	const [saved, setSaved] = useState(false);
	const [dirty, setDirty] = useState(false);

	const draftCards = [
		...new Map(
			[
				...activeMember.cards,
				...inventory.items
					.filter((item) => item.quantity > 0)
					.map((item) =>
						card({
							key: `item:${item.key}`,
							sourceKind: 'item',
							sourceKey: item.key,
							displayName: item.displayName,
							description: item.details.description,
							targetMode: 'ally',
							repeatable: true,
						}),
					),
			].map((candidate) => [candidate.key, candidate]),
		).values(),
	];
	const selectedPlay = selectedPlayIndex === null ? undefined : plays[selectedPlayIndex];
	const selectedCard = draftCards.find((candidate) => candidate.key === selectedCardKey);
	const update = (nextPlays: CardPlay[]) => {
		setPlays(nextPlays);
		setDirty(true);
		setSaved(false);
	};

	return (
		<div className="gameplay-surface mx-auto max-w-[1280px] p-4 sm:p-8">
			<BattleScene
				encounter={encounter}
				currentMember={{ ...activeMember, cards: draftCards }}
				userId={userId}
				readOnly={readOnly}
				plays={plays}
				inventory={inventory}
				selectedCardKey={selectedCardKey}
				selectedPlayIndex={selectedPlayIndex}
				targetEnemyId={selectedPlay?.targetEnemyId ?? null}
				selectedTargetUserId={selectedPlay?.targetUserId ?? null}
				actionPending={false}
				actionBusy={false}
				actionError={null}
				commandState={combatCommandState({
					readOnly,
					encounterCompleted: encounter.status === 'completed',
					actionPending: false,
					actionSuccess: saved,
					commandDirty: dirty,
				})}
				partyMemberName={(memberUserId) => partyNames[memberUserId] ?? 'Traveler'}
				onCardActivate={(cardKey) => {
					const selectedEncounterCard = draftCards.find((candidate) => candidate.key === cardKey);
					if (!selectedEncounterCard || selectedEncounterCard.locked) return;
					const existingIndex = plays.findIndex((play) => play.cardKey === cardKey);
					if (existingIndex >= 0 && !selectedEncounterCard.repeatable) {
						setSelectedCardKey(cardKey);
						setSelectedPlayIndex(existingIndex);
						return;
					}
					if (plays.length >= activeMember.playSlots) {
						if (existingIndex >= 0) {
							setSelectedCardKey(cardKey);
							setSelectedPlayIndex(existingIndex);
						}
						return;
					}
					const itemQuantity = inventory.items.find((item) => item.key === selectedEncounterCard.sourceKey)?.quantity;
					if (
						selectedEncounterCard.sourceKind === 'item' &&
						itemQuantity !== undefined &&
						plays.filter((play) => play.cardKey === cardKey).length >= itemQuantity
					)
						return;
					const queuedItemKeys = new Set(
						plays.flatMap((play) => {
							const queuedCard = draftCards.find((candidate) => candidate.key === play.cardKey);
							return queuedCard?.sourceKind === 'item' ? [queuedCard.sourceKey] : [];
						}),
					);
					if (
						selectedEncounterCard.sourceKind === 'item' &&
						!queuedItemKeys.has(selectedEncounterCard.sourceKey) &&
						queuedItemKeys.size >= 2
					)
						return;
					setSelectedCardKey(cardKey);
					const nextPlay = {
						cardKey,
						targetEnemyId:
							selectedEncounterCard.targetMode === 'enemy'
								? (encounter.enemies.find((enemy) => enemy.currentHealth > 0)?.id ?? null)
								: null,
						targetUserId: selectedEncounterCard.targetMode === 'ally' ? userId : null,
					};
					setSelectedPlayIndex(plays.length);
					update([...plays, nextPlay]);
				}}
				onPlayActivate={(playIndex) => {
					if (selectedPlayIndex !== playIndex) {
						setSelectedPlayIndex(playIndex);
						setSelectedCardKey(plays[playIndex]?.cardKey ?? null);
						return;
					}
					const next = plays.filter((_, index) => index !== playIndex);
					setSelectedPlayIndex(next[playIndex] ? playIndex : null);
					setSelectedCardKey(next[playIndex]?.cardKey ?? null);
					update(next);
				}}
				onPlayReorder={(fromIndex, toIndex) => {
					const next = [...plays];
					const [moved] = next.splice(fromIndex, 1);
					next.splice(toIndex, 0, moved);
					setSelectedPlayIndex(toIndex);
					update(next);
				}}
				onEnemySelect={(enemyId) => {
					if (selectedPlayIndex === null || selectedCard?.targetMode !== 'enemy') return;
					update(
						plays.map((play, index) => (index === selectedPlayIndex ? { ...play, targetEnemyId: enemyId, targetUserId: null } : play)),
					);
				}}
				onAllySelect={(memberUserId) => {
					if (selectedPlayIndex === null || selectedCard?.targetMode !== 'ally') return;
					update(
						plays.map((play, index) => (index === selectedPlayIndex ? { ...play, targetEnemyId: null, targetUserId: memberUserId } : play)),
					);
				}}
				onSubmitPlan={() => {
					setSaved(true);
					setDirty(false);
				}}
			/>
		</div>
	);
}

const meta = { title: 'Party/BattleScene', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveEncounter: Story = {
	render: () => <BattlePreview />,
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole('heading', { name: 'Battle encounter' })).toBeInTheDocument();
		await expect(canvas.getByTestId('battle-status')).toHaveTextContent('1/3');
		await expect(canvas.getByTestId('battle-command-tray')).toHaveTextContent('1/3');
		await expect(canvas.getByTestId('battle-play-queue')).toHaveTextContent('Plan');
		await expect(canvas.getByTestId('battle-play-queue')).toHaveAttribute('data-queue-state', 'expanded');
		await expect(canvas.getByTestId('battle-save-plan')).toHaveTextContent('Lock plan');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-play-order', '1');
		await expect(canvas.queryByTestId('battle-deck-toggle')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-card-class-iron-guard')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('gameplay-mechanics')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-fan')).toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-preview-detail')).toHaveTextContent('Damage 5');
		await expect(canvas.getByTestId('battle-card-filter-all')).toHaveAttribute('aria-selected', 'true');
		await userEvent.click(canvas.getByTestId('battle-card-filter-all'));
		await userEvent.keyboard('{ArrowRight}');
		await expect(canvas.getByTestId('battle-card-filter-class')).toHaveAttribute('aria-selected', 'true');
		await userEvent.keyboard('{Home}');
		await expect(canvas.getByTestId('battle-card-filter-all')).toHaveAttribute('aria-selected', 'true');
		expect(canvas.getAllByTestId('battle-enemy').some((enemy) => enemy.classList.contains('battle-targetable'))).toBe(true);
		await expect(canvas.getByTestId('battle-target-ellipse')).toBeInTheDocument();
		const wolf = canvas.getAllByTestId('battle-enemy').find((enemy) => enemy.getAttribute('data-enemy-id') === 'enemy-2');
		await expect(wolf).toBeDefined();
		await userEvent.click(wolf!);
		await expect(canvas.getByTestId('battle-enemy-art-wolf')).toHaveClass('battle-art-selected');
		await userEvent.click(canvas.getByTestId('battle-card-class-shield-wall'));
		await expect(canvas.getByTestId('battle-card-preview-detail')).toHaveTextContent('Guard 5');
		await expect(canvas.getByTestId('battle-card-class-shield-wall')).toHaveAttribute('data-queued', 'true');
		await expect(canvas.getByTestId('battle-card-class-shield-wall')).toHaveAttribute('data-queued-order', '2');
		await expect(canvas.getByTestId('battle-card-class-shield-wall').querySelector('.battle-fan-card-queued-badge')).toHaveTextContent('2');
		await expect(canvas.getByTestId('battle-card-class-shield-wall')).toHaveAttribute('data-category', 'class');
		await userEvent.click(canvas.getByRole('button', { name: 'Move Shield Wall earlier' }));
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'class:shield-wall');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-category', 'class');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-focused', 'true');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-play-order', '1');
		await expect(canvas.getByTestId('battle-card-class-shield-wall')).toHaveAttribute('data-queued-order', '1');
		await userEvent.click(canvas.getByTestId('battle-queued-card-2'));
		await expect(canvas.getByTestId('battle-queued-card-2')).toHaveAttribute('data-card-key', 'class:basic-attack');
		await expect(canvas.getByTestId('battle-queued-card-2')).toHaveAttribute('data-focused', 'true');
		await userEvent.click(canvas.getByTestId('battle-queued-card-2'));
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'class:shield-wall');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-focused', 'false');
		await userEvent.click(canvas.getByTestId('battle-card-class-basic-attack'));
		await expect(canvas.getByTestId('battle-queued-card-2')).toHaveAttribute('data-card-key', 'class:basic-attack');
		await userEvent.click(canvas.getByTestId('battle-save-plan'));
		await expect(canvas.getByTestId('battle-status')).toHaveTextContent('locked in');
	},
};

export const ItemLoadout: Story = {
	render: () => (
		<BattlePreview
			encounter={{
				...activeEncounter,
				members: activeEncounter.members.map((member) =>
					member.userId === 'user-1' ? { ...member, plan: { itemLoadoutKeys: [], plays: [] } } : member,
				),
			}}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByTestId('battle-play-queue')).toHaveAttribute('data-queue-state', 'collapsed');
		await expect(canvas.queryByTestId('battle-queued-card-1')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-deck-toggle')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-item-herb')).toBeInTheDocument();
		await userEvent.click(canvas.getByTestId('battle-card-item-herb'));
		await expect(canvas.getByTestId('battle-play-queue')).toHaveAttribute('data-queue-state', 'expanded');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'item:herb');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-category', 'item');
		await expect(canvas.getByTestId('battle-card-item-herb')).toHaveAttribute('data-queued-count', '1');
		await expect(canvas.getByTestId('battle-card-item-herb')).toHaveAttribute('data-queued-order', '1');
		await expect(canvas.getByTestId('battle-card-item-herb').querySelector('[data-testid="inventory-item-sprite-herb"]')).not.toBeNull();
	},
};

export const AllyTargeting: Story = {
	render: () => <BattlePreview userId="user-2" />,
	play: async ({ canvas }) => {
		const selectedMember = canvas
			.getAllByTestId('battle-party-member')
			.find((member) => member.getAttribute('data-member-id') === 'user-1');
		await expect(selectedMember).toBeDefined();
		await expect(selectedMember?.querySelector('.battle-art')).toHaveClass('battle-art-selected');
		await expect(canvas.getAllByText('Ally target', { exact: true })).not.toHaveLength(0);
	},
};

export const ResolvedEncounter: Story = {
	render: () => <BattlePreview encounter={{ ...activeEncounter, status: 'completed' }} readOnly />,
};
