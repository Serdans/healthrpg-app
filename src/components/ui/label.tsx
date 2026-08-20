import type { LabelHTMLAttributes } from 'react';

import { cn } from '#/lib/utils';

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return <label className={cn('text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]', className)} {...props} />;
}
