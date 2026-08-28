import type { Encounter, Inventory } from '#/lib/api';

export interface CardPlayReference {
	cardKey: string;
}

export interface PlanFanCard<TCard> {
	card: TCard | null;
	queuedOrder: number | null;
	playIndex: number | null;
}

export type BattlePlanCard = Pick<
	Encounter['members'][number]['cards'][number],
	'key' | 'sourceKind' | 'sourceKey' | 'repeatable' | 'locked'
>;
export type BattlePlanPlay = Encounter['members'][number]['plan']['plays'][number];

export type CardPlanIssue = 'missing-card' | 'locked-card' | 'duplicate' | 'capacity' | 'item-quantity' | 'item-type-limit';

export interface CardPlanReview {
	issues: ReadonlyMap<number, CardPlanIssue>;
	valid: boolean;
}

export function cardPlanIssueLabel(issue: CardPlanIssue): string {
	switch (issue) {
		case 'missing-card':
			return 'This card is no longer available. Remove it from the plan.';
		case 'locked-card':
			return 'This skill is locked. Remove it from the plan until it is unlocked.';
		case 'duplicate':
			return 'This card cannot be played more than once.';
		case 'capacity':
			return 'This play is beyond the available card slots.';
		case 'item-quantity':
			return 'You do not have enough copies of this item.';
		case 'item-type-limit':
			return 'A plan can contain at most two item types.';
	}
}

function itemQuantity(card: BattlePlanCard, inventory: Inventory): number | null {
	if (card.sourceKind !== 'item') return null;
	return inventory.items.find((item) => item.key === card.sourceKey)?.quantity ?? 0;
}

export function cardPlanAdditionIssue({
	card,
	plays,
	cards,
	inventory,
	playSlots,
}: {
	card: BattlePlanCard;
	plays: readonly CardPlayReference[];
	cards: readonly BattlePlanCard[];
	inventory: Inventory;
	playSlots: number;
}): CardPlanIssue | null {
	const cardByKey = new Map(cards.map((candidate) => [candidate.key, candidate]));
	let queuedCount = 0;
	const queuedItemTypes = new Set<string>();
	for (const play of plays) {
		if (play.cardKey === card.key) queuedCount += 1;
		const queuedCard = cardByKey.get(play.cardKey);
		if (queuedCard?.sourceKind === 'item') queuedItemTypes.add(queuedCard.sourceKey);
	}

	if (card.locked) return 'locked-card';
	if (!card.repeatable && queuedCount > 0) return 'duplicate';
	if (plays.length >= playSlots) return 'capacity';

	const quantity = itemQuantity(card, inventory);
	if (quantity !== null && queuedCount >= quantity) return 'item-quantity';

	if (card.sourceKind === 'item' && !queuedItemTypes.has(card.sourceKey) && queuedItemTypes.size >= 2) return 'item-type-limit';

	return null;
}

export function reviewCardPlan({
	plays,
	cards,
	inventory,
	playSlots,
}: {
	plays: readonly BattlePlanPlay[];
	cards: readonly BattlePlanCard[];
	inventory: Inventory;
	playSlots: number;
}): CardPlanReview {
	const cardByKey = new Map(cards.map((card) => [card.key, card]));
	const issues = new Map<number, CardPlanIssue>();
	const seenCards = new Set<string>();
	const itemCounts = new Map<string, number>();
	const itemTypes = new Set<string>();

	for (const [playIndex, play] of plays.entries()) {
		const card = cardByKey.get(play.cardKey);
		if (!card) {
			issues.set(playIndex, 'missing-card');
			continue;
		}
		if (card.locked) {
			issues.set(playIndex, 'locked-card');
			continue;
		}
		if (playIndex >= playSlots) {
			issues.set(playIndex, 'capacity');
			continue;
		}
		if (!card.repeatable && seenCards.has(card.key)) {
			issues.set(playIndex, 'duplicate');
			continue;
		}

		seenCards.add(card.key);
		if (card.sourceKind === 'item') {
			const nextCount = (itemCounts.get(card.sourceKey) ?? 0) + 1;
			itemCounts.set(card.sourceKey, nextCount);
			const quantity = itemQuantity(card, inventory);
			if (quantity !== null && nextCount > quantity) {
				issues.set(playIndex, 'item-quantity');
				continue;
			}
			if (!itemTypes.has(card.sourceKey) && itemTypes.size >= 2) {
				issues.set(playIndex, 'item-type-limit');
				continue;
			}
			itemTypes.add(card.sourceKey);
		}
	}

	return { issues, valid: issues.size === 0 };
}

/**
 * Makes the current plan read left-to-right without changing the underlying
 * card definitions. Each play is represented by one planned card instance;
 * available cards are appended in their original hand order.
 */
export function cardsForPlanFan<TCard extends { key: string }>(
	cards: readonly TCard[],
	plays: readonly CardPlayReference[],
	availableCardKeys: ReadonlySet<string> = new Set(cards.map((card) => card.key)),
): PlanFanCard<TCard>[] {
	const cardByKey = new Map(cards.map((card) => [card.key, card]));
	const plannedCards = plays.map((play, playIndex) => {
		const card = cardByKey.get(play.cardKey);
		return { card: card ?? null, queuedOrder: playIndex + 1, playIndex };
	});
	const availableCards = cards
		.filter((card) => availableCardKeys.has(card.key))
		.map((card) => ({ card, queuedOrder: null, playIndex: null }));

	return [...plannedCards, ...availableCards];
}
