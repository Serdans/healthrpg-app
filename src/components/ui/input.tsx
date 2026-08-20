import type { InputHTMLAttributes } from 'react';

import { cn } from '#/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			className={cn(
				'h-12 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--gold)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gold)_24%,transparent)]',
				className,
			)}
			{...props}
		/>
	);
}
