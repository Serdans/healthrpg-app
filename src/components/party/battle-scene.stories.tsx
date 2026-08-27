import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import type { Encounter, Inventory } from '#/lib/api';
import type { BattleTerrain } from '#/lib/battle-terrain';
import { combatCommandState } from '#/lib/combat-command-state';

import { BattleScene } from './battle-scene';

type EncounterCard = Encounter['members'][number]['cards'][number];
type CardPlay = Encounter['members'][number]['plan']['plays'][number];
type PreviewEffect = NonNullable<EncounterCard['preview']>['effects'][number];

const partyNames: Record<string, string> = {
	'user-1': 'Hero',
	'user-2': 'Mira',
	'user-3': 'Rook',
	'user-4': 'Sable',
	'user-5': 'Finn',
	'user-6': 'Tala',
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
		description: 'Brace against the next assault, reducing incoming pressure while the party regains its footing.',
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

const fullPartyEncounter: Encounter = {
	...activeEncounter,
	members: [
		...activeEncounter.members,
		{ ...activeEncounter.members[0], userId: 'user-4', classKey: 'ranger', currentHealth: 16, maxHealth: 20 },
		{ ...activeEncounter.members[1], userId: 'user-5', classKey: 'mage', currentHealth: 14, maxHealth: 18 },
		{ ...activeEncounter.members[2], userId: 'user-6', classKey: 'bard', currentHealth: 19, maxHealth: 22 },
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
	battleTerrain = 'ruins',
	userId = 'user-1',
	readOnly = false,
}: {
	encounter?: Encounter;
	battleTerrain?: BattleTerrain;
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
				battleTerrain={battleTerrain}
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
					const existingIndexes = plays.flatMap((play, index) => (play.cardKey === cardKey ? [index] : []));
					if (existingIndexes.length > 0 && !selectedEncounterCard.repeatable) {
						setSelectedCardKey(cardKey);
						setSelectedPlayIndex(existingIndexes[0]);
						return;
					}
					if (plays.length >= activeMember.playSlots) {
						if (existingIndexes.length > 0) {
							setSelectedCardKey(cardKey);
							setSelectedPlayIndex(existingIndexes.at(-1) as number);
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
					if (playIndex < 0 || playIndex >= plays.length) return;
					const next = plays.filter((_, index) => index !== playIndex);
					const nextPlayIndex = next.length > 0 ? Math.min(playIndex, next.length - 1) : null;
					setSelectedPlayIndex(nextPlayIndex);
					setSelectedCardKey(nextPlayIndex === null ? null : next[nextPlayIndex].cardKey);
					update(next);
				}}
				onPlayFocus={(playIndex) => {
					if (playIndex < 0 || playIndex >= plays.length) return;
					setSelectedPlayIndex(playIndex);
					setSelectedCardKey(plays[playIndex].cardKey);
				}}
				onPlayReorder={(fromIndex, toIndex) => {
					if (fromIndex < 0 || toIndex < 0 || fromIndex >= plays.length || toIndex >= plays.length || fromIndex === toIndex) return;
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
		await expect(canvas.getByTestId('battlefield')).toHaveAttribute('data-battle-camera-ready', 'true');
		await expect(canvas.getByTestId('battle-status')).toHaveTextContent('1/3');
		await expect(canvas.getByTestId('battle-command-tray')).toHaveTextContent('1/3');
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 1/3');
		await expect(canvas.getByTestId('battle-save-plan')).toHaveTextContent('Ready');
		await expect(canvas.getByTestId('battle-save-plan')).toHaveAccessibleName('Ready — lock battle plan');
		await expect(canvas.getByTestId('battle-plan-action')).toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-plan-footer')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-deck-toggle')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-card-class-iron-guard')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('gameplay-mechanics')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-fan')).toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-hand-frame')).toBeInTheDocument();
		const battleScene = canvas.getByTestId('combat-scene');
		const stage = battleScene.querySelector<HTMLElement>('.battle-stage')?.getBoundingClientRect();
		const commandTray = canvas.getByTestId('battle-command-tray').getBoundingClientRect();
		const handViewport = canvas.getByTestId('battle-card-hand-viewport').getBoundingClientRect();
		const targetNote = battleScene.querySelector<HTMLElement>('.battle-fan-target-note')?.getBoundingClientRect();
		const action = canvas.getByTestId('battle-plan-action').getBoundingClientRect();
		const ready = canvas.getByTestId('battle-save-plan').getBoundingClientRect();
		const handFrame = canvas.getByTestId('battle-card-hand-frame');
		const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		const fanCardEntries = [...battleScene.querySelectorAll<HTMLElement>('.battle-fan-card')].map((fanCard) => {
			const dropRem = Number.parseFloat(fanCard.parentElement?.style.getPropertyValue('--fan-drop') ?? '');
			return {
				queued: fanCard.dataset.queued === 'true',
				rect: fanCard.getBoundingClientRect(),
				drop: Number.isFinite(dropRem) && Number.isFinite(rootFontSize) ? dropRem * rootFontSize : 0,
			};
		});
		const fanCardRects = fanCardEntries.map(({ rect }) => rect);
		const idleCardRects = fanCardEntries.filter(({ queued }) => !queued).map(({ rect }) => rect);
		const queuedCardRects = fanCardEntries.filter(({ queued }) => queued).map(({ rect }) => rect);
		const fanMaxDrop = Math.max(0, ...fanCardEntries.map(({ drop }) => drop));
		const centerFanDrop = fanCardEntries.length > 0 ? fanCardEntries[Math.floor((fanCardEntries.length - 1) / 2)].drop : 0;
		const outerFanDrops = fanCardEntries.length >= 2 ? [fanCardEntries[0].drop, fanCardEntries.at(-1)?.drop ?? 0] : [];
		const fanPeek = Number.parseFloat(getComputedStyle(handFrame).getPropertyValue('--battle-fan-peek'));
		if (!stage || !targetNote || fanCardRects.length === 0 || !Number.isFinite(fanPeek) || !Number.isFinite(rootFontSize))
			throw new Error('Battle command geometry is missing.');
		const fanTop = Math.min(...fanCardRects.map((cardRect) => cardRect.top));
		const fanBottom = Math.max(...fanCardRects.map((cardRect) => cardRect.bottom));
		const idleFanBottom = idleCardRects.length > 0 ? Math.max(...idleCardRects.map((cardRect) => cardRect.bottom)) : null;
		const readyBottomOffset = ready.bottom - fanTop;
		expect(Math.abs(commandTray.bottom - stage.bottom)).toBeLessThanOrEqual(1);
		expect(commandTray.height).toBeLessThanOrEqual(17 * 16 + 1);
		expect(targetNote.height).toBeLessThanOrEqual(2.5 * 16 + 1);
		expect(targetNote.bottom).toBeLessThanOrEqual(handViewport.top + 1);
		expect(action.height).toBeLessThanOrEqual(2.5 * 16 + 1);
		expect(readyBottomOffset).toBeGreaterThanOrEqual(-4);
		expect(ready.top - fanTop).toBeLessThanOrEqual(12);
		expect(fanCardRects.every((cardRect) => cardRect.top >= handViewport.top - 1)).toBe(true);
		expect(idleCardRects.length).toBeGreaterThan(0);
		expect(idleFanBottom).not.toBeNull();
		expect(idleFanBottom as number).toBeGreaterThanOrEqual(stage.bottom + 1);
		expect(queuedCardRects.every((cardRect) => cardRect.bottom <= handViewport.bottom + 2)).toBe(true);
		expect(fanBottom).toBeLessThanOrEqual(stage.bottom + fanPeek + fanMaxDrop + 12);
		expect(fanCardEntries.length).toBeGreaterThanOrEqual(3);
		expect(Math.max(...outerFanDrops)).toBeGreaterThan(centerFanDrop);
		expect(Math.abs((outerFanDrops[0] ?? 0) - (outerFanDrops[1] ?? 0))).toBeLessThanOrEqual(0.1);
		expect(getComputedStyle(canvas.getByTestId('battle-card-hand-viewport')).overflowY).toBe('hidden');
		await expect(canvas.getByTestId('battle-card-hand-viewport')).toHaveAccessibleName(
			'Available card hand. Scroll horizontally to browse cards.',
		);
		await expect(canvas.queryByTestId('battle-card-hand-fade-start')).not.toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-card-hand-fade-end')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('battle-arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
		await expect(canvas.getByTestId('battle-card-preview-detail')).toHaveTextContent('Damage 5');
		const availableShieldWall = canvas.getByTestId('battle-card-class-shield-wall');
		await expect(availableShieldWall).not.toBeDisabled();
		await userEvent.hover(availableShieldWall);
		const availablePreview = await canvas.findByTestId('battle-card-preview');
		await expect(availablePreview).toHaveAttribute('data-card-key', 'class:shield-wall');
		await expect(canvas.getByTestId('battle-card-preview-layer')).toHaveAttribute('aria-hidden', 'true');
		const expandedDescription = availablePreview.querySelector<HTMLElement>('.battle-card-description');
		const expandedMeta = availablePreview.querySelector<HTMLElement>('.battle-card-meta');
		if (!expandedDescription || !expandedMeta) throw new Error('Expanded card preview text layout is missing.');
		await expect(expandedDescription).toHaveTextContent('reducing incoming pressure while the party regains its footing');
		const expandedDescriptionStyles = getComputedStyle(expandedDescription);
		expect(expandedDescriptionStyles.display).not.toBe('-webkit-box');
		expect(expandedDescriptionStyles.overflowY).toBe('auto');
		expect(expandedDescriptionStyles.getPropertyValue('-webkit-line-clamp')).toBe('none');
		expect(expandedDescription.offsetTop + expandedDescription.offsetHeight).toBeLessThanOrEqual(expandedMeta.offsetTop + 1);
		expect(availablePreview.closest('.battle-card-hand-viewport')).toBeNull();
		const shortSwordDescription = canvas
			.getByTestId('battle-card-weapon-short-sword')
			.querySelector<HTMLElement>('.battle-card-description');
		const shortSwordFace = shortSwordDescription?.closest('.battle-card-face');
		if (!shortSwordDescription || !shortSwordFace) throw new Error('Short Sword description layout is missing.');
		const shortSwordDescriptionRect = shortSwordDescription.getBoundingClientRect();
		const shortSwordFaceRect = shortSwordFace.getBoundingClientRect();
		const shortSwordDescriptionStyles = getComputedStyle(shortSwordDescription);
		expect(getComputedStyle(shortSwordFace).overflow).toBe('visible');
		expect(shortSwordDescriptionRect.height).toBeGreaterThanOrEqual(Number.parseFloat(shortSwordDescriptionStyles.lineHeight));
		expect(shortSwordDescriptionRect.bottom).toBeLessThanOrEqual(shortSwordFaceRect.bottom + 1);
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
		await expect(wolf).toHaveAttribute('data-selected', 'true');
		await userEvent.click(canvas.getByTestId('battle-card-class-shield-wall'));
		await expect(canvas.getByTestId('battle-card-preview-detail')).toHaveTextContent('Guard 5');
		const queuedShieldWall = canvas.getByTestId('battle-queued-card-2');
		await expect(queuedShieldWall).toHaveAttribute('data-card-key', 'class:shield-wall');
		await expect(queuedShieldWall).toHaveAttribute('data-queued', 'true');
		await expect(queuedShieldWall).toHaveAttribute('data-queued-order', '2');
		await expect(queuedShieldWall.querySelector('.battle-fan-card-queued-badge')).toHaveTextContent('2');
		await expect(queuedShieldWall).toHaveAttribute('data-category', 'class');
		await expect(queuedShieldWall).toHaveClass('battle-fan-card-focused');
		await expect(queuedShieldWall.parentElement).toHaveAttribute('data-focused', 'true');
		await expect(canvas.getByTestId('battle-plan-boundary')).toBeInTheDocument();
		await expect(canvas.getByTestId('battle-reorder-handle-2')).toBeInTheDocument();
		await expect(canvas.queryByTestId('battle-card-preview')).not.toBeInTheDocument();
		const selectedSourceSurface = queuedShieldWall.querySelector<HTMLElement>('.battle-fan-card-surface');
		const selectedSourceSlot = queuedShieldWall.parentElement;
		if (!selectedSourceSurface || !selectedSourceSlot) throw new Error('Selected card source surface is missing.');
		expect(getComputedStyle(selectedSourceSurface).visibility).toBe('visible');
		expect(selectedSourceSlot.dataset.previewActive).toBe('false');
		await expect(canvas.queryByTestId('battle-card-class-shield-wall')).not.toBeInTheDocument();
		await canvas.getByTestId('battle-reorder-handle-2').focus();
		await userEvent.keyboard('{ArrowUp}');
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 2/3');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'class:shield-wall');
		await expect(canvas.getByTestId('battle-queued-card-2')).toHaveAttribute('data-card-key', 'class:basic-attack');
		await userEvent.click(canvas.getByTestId('battle-queued-card-1'));
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 1/3');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'class:basic-attack');
		await userEvent.click(canvas.getByTestId('battle-card-class-basic-attack'));
		await expect(canvas.getByTestId('battle-queued-card-2')).toHaveAttribute('data-card-key', 'class:basic-attack');
		await expect(canvas.getByTestId('battle-card-class-basic-attack')).toHaveAttribute('data-queued', 'false');
		await expect(canvas.getByTestId('battle-card-class-basic-attack')).toHaveAttribute('data-queued-count', '2');
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
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 0/3');
		await expect(canvas.queryByTestId('battle-deck-toggle')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('battle-card-item-herb')).toBeInTheDocument();
		await userEvent.click(canvas.getByTestId('battle-card-item-herb'));
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 1/3');
		await expect(canvas.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'item:herb');
		await expect(canvas.getByTestId('battle-card-item-herb')).toHaveAttribute('data-queued', 'false');
		await expect(canvas.getByTestId('battle-card-item-herb')).toHaveAttribute('data-queued-count', '1');
		await expect(canvas.getByTestId('battle-card-item-herb').querySelector('[data-testid="inventory-item-sprite-herb"]')).not.toBeNull();
	},
};

export const EnemyTargeting: Story = {
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
		await userEvent.click(canvas.getByTestId('battle-card-class-basic-attack'));
		await expect(canvas.getByTestId('battle-plan-summary')).toHaveTextContent('Plan 1/3');
		const enemies = canvas.getAllByTestId('battle-enemy');
		expect(enemies.some((enemy) => enemy.classList.contains('battle-targetable'))).toBe(true);
		const target = enemies.find((enemy) => enemy.getAttribute('data-enemy-id') === 'enemy-1');
		await expect(target).toBeDefined();
		await userEvent.click(target!);
		await expect(target).toHaveAttribute('data-selected', 'true');
		await expect(target).toHaveAttribute('aria-pressed', 'true');
		await expect(canvas.getByTestId('battle-target-ellipse')).toBeInTheDocument();
	},
};

export const OverworldTerrain: Story = {
	render: () => <BattlePreview battleTerrain="wilds" />,
	play: async ({ canvas }) => {
		await expect(canvas.getByTestId('battlefield')).toHaveAttribute('data-battle-terrain', 'wilds');
	},
};

export const FullPartyArena: Story = {
	render: () => <BattlePreview encounter={fullPartyEncounter} />,
	play: async ({ canvas }) => {
		await expect(canvas.getByTestId('battlefield-arena')).toBeInTheDocument();
		await expect(canvas.getByTestId('battlefield')).toHaveAttribute('data-battle-camera-ready', 'true');
		await expect(canvas.getByTestId('battlefield-arena-label-layer')).toBeInTheDocument();
		await expect(canvas.getAllByTestId('battle-arena-actor')).toHaveLength(8);
		await expect(canvas.getAllByTestId('battle-arena-meta')).toHaveLength(8);
		await expect(
			canvas.getAllByTestId('battle-arena-actor').filter((actor) => actor.getAttribute('data-arena-side') === 'enemy'),
		).toHaveLength(2);
		await expect(
			canvas.getAllByTestId('battle-arena-actor').filter((actor) => actor.getAttribute('data-arena-side') === 'party'),
		).toHaveLength(6);
		await expect(
			canvas.getAllByTestId('battle-arena-actor').filter((actor) => actor.getAttribute('data-arena-row') === 'front'),
		).toHaveLength(4);
		await expect(
			canvas.getAllByTestId('battle-arena-actor').filter((actor) => actor.getAttribute('data-arena-row') === 'back'),
		).toHaveLength(4);

		const battlefield = canvas.getByTestId('battlefield').getBoundingClientRect();
		const actors = canvas.getAllByTestId('battle-arena-actor').map((actor) => actor.getBoundingClientRect());
		const labels = canvas.getAllByTestId('battle-arena-meta').map((metaElement) => ({
			rect: metaElement.getBoundingClientRect(),
			side: metaElement.parentElement?.dataset.arenaSide,
			row: metaElement.parentElement?.dataset.arenaRow,
		}));
		const cards = Array.from(canvas.getByTestId('combat-scene').querySelectorAll<HTMLElement>('.battle-fan-card')).map((fanCard) =>
			fanCard.getBoundingClientRect(),
		);
		const categories = Array.from(
			canvas.getByTestId('combat-scene').querySelectorAll<HTMLElement>('[data-testid^="battle-card-filter-"]'),
		).map((category) => category.getBoundingClientRect());
		const handHeader = canvas
			.getByTestId('battle-card-hand-frame')
			.querySelector<HTMLElement>('.battle-hand-header')
			?.getBoundingClientRect();
		const nameplates = Array.from(
			canvas.getByTestId('combat-scene').querySelectorAll<HTMLElement>('.battle-enemy-nameplate, .battle-party-nameplate'),
		).map((nameplate) => getComputedStyle(nameplate));
		const intersects = (left: DOMRect, right: DOMRect) =>
			left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;

		expect(labels.every(({ rect }) => rect.left >= battlefield.left && rect.right <= battlefield.right)).toBe(true);
		expect(labels.every(({ rect }) => actors.every((actorRect) => !intersects(rect, actorRect)))).toBe(true);
		expect(labels.every(({ rect }) => cards.every((cardRect) => !intersects(rect, cardRect)))).toBe(true);
		expect(labels.every(({ rect }) => !handHeader || rect.bottom <= handHeader.top || rect.top >= handHeader.bottom)).toBe(true);
		expect(categories.every((categoryRect) => actors.every((actorRect) => !intersects(categoryRect, actorRect)))).toBe(true);
		expect(nameplates.every((style) => style.backgroundImage.includes('linear-gradient'))).toBe(true);
		expect(
			labels.every((left, index) =>
				labels.slice(index + 1).every((right) => left.side !== right.side || left.row !== right.row || !intersects(left.rect, right.rect)),
			),
		).toBe(true);
		expect(actors.every((actorRect) => cards.every((cardRect) => !intersects(actorRect, cardRect)))).toBe(true);
	},
};

export const AllyTargeting: Story = {
	render: () => <BattlePreview userId="user-2" />,
	play: async ({ canvas }) => {
		const selectedMember = canvas
			.getAllByTestId('battle-party-member')
			.find((member) => member.getAttribute('data-member-id') === 'user-1');
		await expect(selectedMember).toBeDefined();
		await expect(selectedMember).toHaveAttribute('data-selected', 'true');
		await expect(canvas.getAllByText('Ally target', { exact: true })).not.toHaveLength(0);
	},
};

export const ResolvedEncounter: Story = {
	render: () => <BattlePreview encounter={{ ...activeEncounter, status: 'completed' }} readOnly />,
};
