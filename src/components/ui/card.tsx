import type { HTMLAttributes } from 'react';

import { cn } from '#/lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <section className={cn('parchment-card rounded-3xl p-5 sm:p-7', className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('mb-5 space-y-1.5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
	return <h2 className={cn('display-title text-2xl text-[var(--indigo)]', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
	return <p className={cn('text-sm leading-6 text-[var(--ink-soft)]', className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn('space-y-4', className)} {...props} />;
}
