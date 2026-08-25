import { Compass, Shield, Sparkles } from 'lucide-react';

import { Progress } from '#/components/ui/progress';
import type { DailyProgress } from '#/lib/api';

function percent(value: number, cost: number) {
	return cost > 0 ? Math.min(100, (value / cost) * 100) : 100;
}

function remaining(value: number, cost: number) {
	return Math.max(0, cost - value);
}

export function GameplayMechanics({ daily, showHelp = true }: { daily?: DailyProgress; showHelp?: boolean }) {
	const hasChallenge = Boolean(daily?.challengeCost);
	const travelRequirementMet = daily ? daily.movementCost === 0 || daily.movementSatisfied : false;
	const challengeCleared = daily ? daily.challengeCost === 0 || daily.challengeCleared : false;

	return (
		<section className="gameplay-mechanics" aria-label="Adventure mechanics" data-testid="gameplay-mechanics">
			<div className="gameplay-mechanic-grid">
				<div className="gameplay-mechanic gameplay-mechanic-momentum">
					<div className="gameplay-mechanic-heading">
						<Sparkles className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Momentum · daily movement</span>
					</div>
					<strong>{daily ? daily.movementUnits : '—'}</strong>
					<span>{daily ? 'from today’s health signal' : 'daily signal unavailable'}</span>
				</div>

				<div className="gameplay-mechanic">
					<div className="gameplay-mechanic-heading">
						<Compass className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Travel requirement</span>
					</div>
					<strong>{daily ? (daily.movementCost > 0 ? `${daily.movementUnits} / ${daily.movementCost}` : 'Ready') : '—'}</strong>
					{daily && daily.movementCost > 0 && (
						<Progress value={percent(daily.movementUnits, daily.movementCost)} aria-label="Travel requirement progress" />
					)}
					<span>
						{!daily
							? 'travel requirement unavailable'
							: daily.movementCost === 0
								? 'no travel required'
								: travelRequirementMet
									? 'ready to travel'
									: `needs ${remaining(daily.movementUnits, daily.movementCost)} more Momentum`}
					</span>
				</div>

				{hasChallenge && daily && (
					<div className="gameplay-mechanic gameplay-mechanic-challenge">
						<div className="gameplay-mechanic-heading">
							<Shield className="size-4" aria-hidden="true" />
							<span className="game-pixel-label">Challenge</span>
						</div>
						<strong>
							{daily.challengeProgress} / {daily.challengeCost}
						</strong>
						<Progress value={percent(daily.challengeProgress, daily.challengeCost)} aria-label="Challenge progress" />
						<span>{challengeCleared ? 'cleared' : `needs ${remaining(daily.challengeProgress, daily.challengeCost)} more progress`}</span>
					</div>
				)}
			</div>

			{showHelp && (
				<p className="gameplay-mechanics-help">
					Momentum is daily movement from today’s health signal. It determines each traveler’s card slots and helps the party meet the
					Travel requirement
					{hasChallenge ? ', while contributing to the active Challenge.' : '.'}
				</p>
			)}
		</section>
	);
}
