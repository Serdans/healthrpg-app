export type MapNavigationDirection = 'left' | 'right' | 'up' | 'down';

export interface NavigableMapNode {
	node: { id: string };
	x: number;
	y: number;
}

export function mapDirectionForKey(key: string): MapNavigationDirection | null {
	switch (key) {
		case 'ArrowLeft':
			return 'left';
		case 'ArrowRight':
			return 'right';
		case 'ArrowUp':
			return 'up';
		case 'ArrowDown':
			return 'down';
		default:
			return null;
	}
}

export function getAdjacentMapNodeId<T extends NavigableMapNode>(
	nodes: readonly T[],
	currentNodeId: string,
	direction: MapNavigationDirection,
): string | null {
	const current = nodes.find((item) => item.node.id === currentNodeId);
	if (!current) return null;

	const horizontal = direction === 'left' || direction === 'right';
	const sign = direction === 'left' || direction === 'up' ? -1 : 1;
	const candidates = nodes.filter((item) => {
		const delta = (horizontal ? item.x - current.x : item.y - current.y) * sign;
		return delta > 0;
	});
	const alignedCandidates = candidates.filter((item) => {
		const primaryDistance = horizontal ? Math.abs(item.x - current.x) : Math.abs(item.y - current.y);
		const secondaryDistance = horizontal ? Math.abs(item.y - current.y) : Math.abs(item.x - current.x);
		return secondaryDistance <= primaryDistance;
	});
	const navigableCandidates = alignedCandidates.length > 0 ? alignedCandidates : candidates;

	return (
		navigableCandidates
			.map((item) => {
				const primaryDistance = horizontal ? Math.abs(item.x - current.x) : Math.abs(item.y - current.y);
				const secondaryDistance = horizontal ? Math.abs(item.y - current.y) : Math.abs(item.x - current.x);
				return { item, score: primaryDistance + secondaryDistance * 0.5 };
			})
			.sort((left, right) => left.score - right.score || left.item.node.id.localeCompare(right.item.node.id))[0]?.item.node.id ?? null
	);
}
