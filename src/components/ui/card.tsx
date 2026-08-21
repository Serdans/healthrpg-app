import type { HTMLAttributes } from 'react';

import type { GamePanelTone } from '#/lib/game-art';
import { cn } from '#/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLElement> {
	variant?: 'default' | 'game';
	tone?: GamePanelTone;
}

export function Card({ className, variant = 'default', tone = 'atlas', ...props }: CardProps) {
	const isGamePanel = variant === 'game';

	return (
		<section
			className={cn(isGamePanel ? 'game-panel p-5 sm:p-7' : 'parchment-card rounded-3xl p-5 sm:p-7', className)}
			data-game-tone={isGamePanel ? tone : undefined}
			{...props}
		/>
	);
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('card-header mb-5 space-y-1.5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
	return <h2 className={cn('card-title display-title text-2xl text-[var(--indigo)]', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
	return <p className={cn('card-description text-sm leading-6 text-[var(--ink-soft)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('card-content space-y-4', className)} {...props} />;
}
