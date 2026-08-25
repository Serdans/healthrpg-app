import type { CSSProperties } from 'react';

import type { BattleArtVariant } from '#/lib/battle-art';

type BattleArtSource = {
	src: string;
	backgroundSize: string;
	position: string;
};

export function BattleArt({
	art,
	label,
	variant = 'neutral',
	selected = false,
	className,
	testId,
	decorative = true,
}: {
	art: BattleArtSource | null;
	label: string;
	variant?: BattleArtVariant;
	selected?: boolean;
	className?: string;
	testId?: string;
	decorative?: boolean;
}) {
	const classes = [
		'battle-art',
		`battle-art-${variant}`,
		selected ? 'battle-art-selected' : null,
		art ? null : 'battle-art-empty',
		className,
	]
		.filter((value): value is string => Boolean(value))
		.join(' ');
	const style = art
		? ({
				backgroundImage: `url('${art.src}')`,
				backgroundPosition: art.position,
				backgroundSize: art.backgroundSize,
			} satisfies CSSProperties)
		: undefined;

	return (
		<span
			className={classes}
			data-testid={testId}
			style={style}
			{...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label })}
		/>
	);
}
