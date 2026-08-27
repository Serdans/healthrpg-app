import type { CSSProperties } from 'react';

import { battleArtBackgroundStyle } from '#/lib/battle-art';
import type { BattleArtSource, BattleArtVariant } from '#/lib/battle-art';
import type { GroundedSpritePlacement } from '#/lib/sprite-grounding';

export function BattleArt({
	art,
	label,
	variant = 'neutral',
	selected = false,
	className,
	testId,
	decorative = true,
	placement = null,
}: {
	art: BattleArtSource | null;
	label: string;
	variant?: BattleArtVariant;
	selected?: boolean;
	className?: string;
	testId?: string;
	decorative?: boolean;
	placement?: GroundedSpritePlacement | null;
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
				...battleArtBackgroundStyle(art),
				...(placement
					? {
							position: 'absolute',
							left: `${placement.left * 100}%`,
							top: `${placement.top * 100}%`,
							width: `${placement.size * 100}%`,
							height: `${placement.size * 100}%`,
						}
					: {}),
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
