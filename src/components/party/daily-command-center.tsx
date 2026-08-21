import { ArrowRight, Compass, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import type { DailyProgress } from '#/lib/api';
import type { DailyLoopState } from '#/lib/daily-loop';
import { GameplayMechanics } from './gameplay-mechanics';

export function DailyCommandCenter({ daily, state }: { daily?: DailyProgress; state: DailyLoopState }) {
	const travelersWithMomentum = daily?.members.filter((member) => member.movementUnits > 0).length ?? 0;
	const travelerCount = daily?.members.length ?? 0;
	const recoveryPoints = daily?.members.reduce((total, member) => total + member.recoveryPoints, 0) ?? 0;

	return (
		<section
			className={`daily-command-center daily-command-center-${state.tone}`}
			aria-labelledby="daily-command-center-title"
			data-testid="daily-command-center"
		>
			<div className="daily-command-center-header">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<p className="eyebrow game-pixel-label">Today · {daily?.worldDate ?? 'daily signal'}</p>
						<Badge className="daily-command-center-badge">{state.badge}</Badge>
					</div>
					<h2 id="daily-command-center-title">{state.title}</h2>
					<p>{state.description}</p>
				</div>
				<span className="daily-command-center-emblem" aria-hidden="true">
					<Compass className="size-6" />
				</span>
			</div>

			{daily ? (
				<GameplayMechanics daily={daily} showHelp={false} />
			) : (
				<div className="daily-command-center-unavailable" role="status" aria-live="polite">
					<Compass className="size-4" aria-hidden="true" />
					<span>Momentum and Journey details will appear when today’s signal is available.</span>
				</div>
			)}

			<div className="daily-command-center-footer">
				<div className="daily-command-center-readiness">
					<div>
						<UsersRound className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Party readiness</span>
					</div>
					<strong>{daily ? `${travelersWithMomentum} / ${travelerCount}` : '—'}</strong>
					<span>{daily ? `travelers with Momentum · ${recoveryPoints} Recovery` : 'waiting for the party signal'}</span>
				</div>

				{state.actionHref && state.actionLabel && (
					<div className="daily-command-center-actions">
						<a className="daily-command-center-action game-button" href={state.actionHref}>
							{state.actionLabel}
							<ArrowRight className="size-4" aria-hidden="true" />
						</a>
						{state.actionHref !== '#party-field' && (
							<a className="daily-command-center-secondary" href="#party-field">
								View field
							</a>
						)}
					</div>
				)}
			</div>
		</section>
	);
}
