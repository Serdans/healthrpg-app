import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Progress } from '#/components/ui/progress';
import type { DailyProgress } from '#/lib/api';

export function DailyStatus({ daily }: { daily: DailyProgress }) {
	const movementPercent = daily.movementCost > 0 ? (daily.movementUnits / daily.movementCost) * 100 : 100;
	return (
		<Card variant="game" tone="village">
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="eyebrow">Today · {daily.worldDate}</p>
						<CardTitle className="mt-3 text-2xl">Party health signal</CardTitle>
					</div>
					<Badge
						className={
							daily.status === 'complete'
								? 'border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[var(--teal)]/10 text-[var(--teal-deep)]'
								: ''
						}
					>
						{daily.status}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-end justify-between gap-3 text-sm">
					<span className="font-bold text-[var(--ink-soft)]">Movement toward gate</span>
					<span className="font-mono font-medium text-[var(--indigo)]">
						{daily.movementUnits} / {daily.movementCost}
					</span>
				</div>
				<Progress value={movementPercent} aria-label="Daily movement progress" />
				<div className="grid grid-cols-2 gap-3 pt-2">
					<div className="rounded-xl bg-[var(--teal)]/10 p-3">
						<p className="font-mono text-xl text-[var(--teal-deep)]">{daily.recoveryPoints}</p>
						<p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Recovery points</p>
					</div>
					<div className="rounded-xl bg-[var(--gold-wash)] p-3">
						<p className="font-mono text-xl text-[var(--gold-deep)]">{daily.gateContribution}</p>
						<p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Gate contribution</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
