import { describe, expect, it } from 'vitest';

import type { Inventory } from '#/lib/api';
import { cardPlanAdditionIssue, cardsForPlanFan, reviewCardPlan } from '#/lib/battle-cards';

const inventoryItem = (key: string): Inventory['items'][number] => ({
	key,
	kind: 'item',
	displayName: key,
	details: { description: `${key} test item`, equipmentSlot: null, effect: null },
	quantity: 1,
});

const inventory: Inventory = {
	currencies: [],
	equipment: [],
	items: [inventoryItem('potion'), inventoryItem('ether'), inventoryItem('elixir')],
};

const cards = [
	{ key: 'basic', sourceKind: 'class' as const, sourceKey: 'basic', repeatable: false, locked: false },
	{ key: 'guard', sourceKind: 'class' as const, sourceKey: 'guard', repeatable: false, locked: false },
	{ key: 'potion', sourceKind: 'item' as const, sourceKey: 'potion', repeatable: true, locked: false },
	{ key: 'ether', sourceKind: 'item' as const, sourceKey: 'ether', repeatable: true, locked: false },
	{ key: 'elixir', sourceKind: 'item' as const, sourceKey: 'elixir', repeatable: true, locked: false },
];

describe('cardsForPlanFan', () => {
	it('puts planned cards first while preserving the hand order', () => {
		const handCards = [{ key: 'basic' }, { key: 'guard' }, { key: 'herb' }, { key: 'sword' }];
		const result = cardsForPlanFan(handCards, [{ cardKey: 'herb' }, { cardKey: 'basic' }], new Set(['guard', 'sword']));

		expect(result.map(({ card }) => card?.key ?? null)).toEqual(['herb', 'basic', 'guard', 'sword']);
		expect(result.map(({ queuedOrder }) => queuedOrder)).toEqual([1, 2, null, null]);
		expect(result.map(({ playIndex }) => playIndex)).toEqual([0, 1, null, null]);
	});

	it('renders repeated plays as separate planned instances and keeps an available copy', () => {
		const result = cardsForPlanFan(
			[{ key: 'basic' }, { key: 'guard' }],
			[{ cardKey: 'basic' }, { cardKey: 'guard' }, { cardKey: 'basic' }],
			new Set(['basic']),
		);

		expect(result).toEqual([
			{ card: { key: 'basic' }, queuedOrder: 1, playIndex: 0 },
			{ card: { key: 'guard' }, queuedOrder: 2, playIndex: 1 },
			{ card: { key: 'basic' }, queuedOrder: 3, playIndex: 2 },
			{ card: { key: 'basic' }, queuedOrder: null, playIndex: null },
		]);
	});

	it('does not mutate the source hand or plan', () => {
		const handCards = [{ key: 'basic' }, { key: 'guard' }];
		const plays = [{ cardKey: 'guard' }];

		cardsForPlanFan(handCards, plays, new Set(['basic']));

		expect(handCards).toEqual([{ key: 'basic' }, { key: 'guard' }]);
		expect(plays).toEqual([{ cardKey: 'guard' }]);
	});

	it('keeps a missing planned card visible so it can be removed', () => {
		const result = cardsForPlanFan([{ key: 'basic' }], [{ cardKey: 'retired-skill' }]);

		expect(result).toEqual([
			{ card: null, queuedOrder: 1, playIndex: 0 },
			{ card: { key: 'basic' }, queuedOrder: null, playIndex: null },
		]);
	});
});

describe('battle plan rules', () => {
	it('reports the first blocking issue for each planned play', () => {
		const result = reviewCardPlan({
			cards,
			inventory,
			playSlots: 3,
			plays: [
				{ cardKey: 'basic', targetEnemyId: null, targetUserId: null },
				{ cardKey: 'basic', targetEnemyId: null, targetUserId: null },
				{ cardKey: 'missing', targetEnemyId: null, targetUserId: null },
				{ cardKey: 'guard', targetEnemyId: null, targetUserId: null },
			],
		});

		expect([...result.issues.entries()]).toEqual([
			[1, 'duplicate'],
			[2, 'missing-card'],
			[3, 'capacity'],
		]);
		expect(result.valid).toBe(false);
	});

	it('enforces item quantity and item-type limits when adding cards', () => {
		const plays = [{ cardKey: 'potion' }, { cardKey: 'ether' }];

		expect(cardPlanAdditionIssue({ card: cards[2], plays, cards, inventory, playSlots: 3 })).toBe('item-quantity');
		expect(cardPlanAdditionIssue({ card: cards[4], plays, cards, inventory, playSlots: 3 })).toBe('item-type-limit');
	});

	it('invalidates a plan when a previously selected skill becomes locked', () => {
		const result = reviewCardPlan({
			cards: [{ ...cards[0], locked: true }, ...cards.slice(1)],
			inventory,
			playSlots: 3,
			plays: [{ cardKey: 'basic', targetEnemyId: null, targetUserId: null }],
		});

		expect([...result.issues.entries()]).toEqual([[0, 'locked-card']]);
		expect(result.valid).toBe(false);
	});
});
