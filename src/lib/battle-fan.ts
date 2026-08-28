export interface BattleFanPosition {
	centeredIndex: number;
	rotation: number;
	offset: number;
	drop: number;
}

export function centeredFanPosition(
	index: number,
	cardCount: number,
	maxRotation: number,
	horizontalStep: number,
	maxDrop: number,
): BattleFanPosition {
	const centeredIndex = index - (cardCount - 1) / 2;
	const maxIndex = Math.max((cardCount - 1) / 2, 1);
	const normalizedIndex = centeredIndex / maxIndex;
	const edgeFactor = cardCount > 1 ? normalizedIndex ** 2 : 0;

	return {
		centeredIndex,
		rotation: cardCount > 1 ? normalizedIndex * maxRotation : 0,
		offset: cardCount > 1 ? centeredIndex * horizontalStep : 0,
		drop: edgeFactor * maxDrop,
	};
}
