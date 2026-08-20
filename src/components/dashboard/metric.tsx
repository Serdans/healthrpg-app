import type { ReactNode } from 'react';

import { Card } from '#/components/ui/card';

export function Metric({ icon, label, value, copy }: { icon: ReactNode; label: string; value: string; copy: string }) {
	return (
		<Card className="p-5">
			<div className="flex items-center justify-between">
				<span className="grid size-10 place-items-center rounded-xl bg-[var(--teal)]/12 text-[var(--teal-deep)]">{icon}</span>
				<p className="font-mono text-xl font-medium text-[var(--indigo)]">{value}</p>
			</div>
			<p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">{label}</p>
			<p className="mt-1 text-sm text-[var(--ink-soft)]">{copy}</p>
		</Card>
	);
}
