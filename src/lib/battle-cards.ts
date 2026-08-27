export interface CardPlayReference {
	cardKey: string;
}

export interface PlanFanCard<TCard> {
	card: TCard;
	queuedOrder: number | null;
	playIndex: number | null;
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
	const plannedCards = plays.flatMap((play, playIndex) => {
		const card = cardByKey.get(play.cardKey);
		return card ? [{ card, queuedOrder: playIndex + 1, playIndex }] : [];
	});
	const availableCards = cards
		.filter((card) => availableCardKeys.has(card.key))
		.map((card) => ({ card, queuedOrder: null, playIndex: null }));

	return [...plannedCards, ...availableCards];
}
