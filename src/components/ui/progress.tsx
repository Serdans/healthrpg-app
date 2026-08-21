import { cn } from '#/lib/utils';

type ProgressProps = {
	value: number;
	className?: string;
	'aria-label'?: string;
};

export function Progress({ value, className, 'aria-label': ariaLabel }: ProgressProps) {
	const clampedValue = Math.max(0, Math.min(100, value));
	return (
		<div
			className={cn('h-2.5 overflow-hidden rounded-full bg-[var(--line)]', className)}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(clampedValue)}
			aria-label={ariaLabel}
		>
			<div className="h-full rounded-full bg-[var(--teal)] transition-[width] duration-500" style={{ width: `${clampedValue}%` }} />
		</div>
	);
}
