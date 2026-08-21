import type { ReactNode } from 'react';

import { Card } from '#/components/ui/card';

export function StatusCard({ icon, eyebrow, value, detail }: { icon: ReactNode; eyebrow: string; value: string; detail: string }) {
	return (
		<Card variant="game" tone="atlas" className="p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="eyebrow">{eyebrow}</p>
					<p className="display-title mt-2 text-2xl text-[var(--indigo)]">{value}</p>
					<p className="mt-1 text-xs capitalize text-[var(--ink-soft)]">{detail}</p>
				</div>
				<span className="grid size-10 place-items-center rounded-xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">{icon}</span>
			</div>
		</Card>
	);
}
