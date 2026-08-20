import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '#/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold tracking-[0.01em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				primary: 'bg-[var(--indigo)] text-[var(--parchment-bright)] shadow-[0_8px_20px_rgba(33,29,78,0.24)] hover:bg-[var(--indigo-light)]',
				secondary:
					'border border-[var(--line-strong)] bg-[var(--surface-strong)] text-[var(--indigo)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)]',
				ghost: 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--indigo)]',
				danger: 'bg-[var(--danger)] text-white hover:brightness-110',
			},
			size: {
				sm: 'min-h-9 px-3',
				md: 'min-h-11 px-4',
				lg: 'min-h-13 px-6 text-base',
			},
		},
		defaultVariants: {
			variant: 'primary',
			size: 'md',
		},
	},
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
	return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
