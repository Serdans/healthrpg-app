import { Clock3, Sparkles } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import type { DailyProgress, PartyRoster } from '#/lib/api';

function memberName(member: DailyProgress['members'][number], roster?: PartyRoster) {
	const rosterMember = roster?.members.find((candidate) => candidate.userId === member.userId);
	return rosterMember?.character?.name ?? rosterMember?.displayName ?? 'Traveler';
}

export function DailyStatus({ daily, roster }: { daily: DailyProgress; roster?: PartyRoster }) {
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
				<div className="daily-summary-grid">
					<div className="daily-summary-tile daily-summary-tile-teal">
						<p className="font-mono text-xl text-[var(--teal-deep)]">{daily.recoveryPoints}</p>
						<p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Recovery points</p>
					</div>
					<div className="daily-summary-tile daily-summary-tile-gold">
						<p className="font-mono text-xl text-[var(--gold-deep)]">{daily.challengeCost > 0 ? daily.challengeContribution : '—'}</p>
						<p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">Challenge contribution</p>
					</div>
				</div>

				<div className="daily-readiness">
					<div className="daily-readiness-heading">
						<div>
							<p className="game-pixel-label">Traveler readiness</p>
							<p>Momentum is shown per traveler; the Journey requirement is calculated for the party as a whole.</p>
						</div>
						<Sparkles className="size-4" aria-hidden="true" />
					</div>
					{daily.members.length > 0 ? (
						<ul className="daily-readiness-list" aria-label="Daily traveler readiness">
							{daily.members.map((member) => {
								const name = memberName(member, roster);
								const contributes = member.movementUnits > 0;
								return (
									<li className="daily-readiness-row" key={member.userId} data-testid="daily-readiness-member">
										<div className="daily-readiness-row-header">
											<div>
												<strong>{name}</strong>
												<span>{contributes ? 'Contributing Momentum' : 'No Momentum recorded'}</span>
											</div>
											<Badge className={member.status === 'complete' ? 'daily-readiness-badge-complete' : ''}>{member.status}</Badge>
										</div>
										<div className="daily-readiness-row-values">
											<span>
												<Sparkles className="size-3" aria-hidden="true" />
												<strong>{member.movementUnits}</strong> Momentum
											</span>
											<span>
												<Clock3 className="size-3" aria-hidden="true" />
												<strong>{member.recoveryPoints}</strong> Recovery
											</span>
										</div>
									</li>
								);
							})}
						</ul>
					) : (
						<p className="daily-readiness-empty">No traveler readiness has been recorded for today yet.</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
