import { describe, expect, it } from 'vitest';

import { cardsForPlanFan } from '#/lib/battle-cards';

describe('cardsForPlanFan', () => {
	it('puts planned cards first while preserving the hand order', () => {
		const cards = [{ key: 'basic' }, { key: 'guard' }, { key: 'herb' }, { key: 'sword' }];
		const result = cardsForPlanFan(cards, [{ cardKey: 'herb' }, { cardKey: 'basic' }], new Set(['guard', 'sword']));

		expect(result.map(({ card }) => card.key)).toEqual(['herb', 'basic', 'guard', 'sword']);
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
		const cards = [{ key: 'basic' }, { key: 'guard' }];
		const plays = [{ cardKey: 'guard' }];

		cardsForPlanFan(cards, plays, new Set(['basic']));

		expect(cards).toEqual([{ key: 'basic' }, { key: 'guard' }]);
		expect(plays).toEqual([{ cardKey: 'guard' }]);
	});
});
