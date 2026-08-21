import { Compass, Shield, Sparkles } from 'lucide-react';

import { Progress } from '#/components/ui/progress';
import type { DailyProgress } from '#/lib/api';

function percent(value: number, cost: number) {
	return cost > 0 ? Math.min(100, (value / cost) * 100) : 100;
}

function remaining(value: number, cost: number) {
	return Math.max(0, cost - value);
}

export function GameplayMechanics({
	daily,
	currentMemberUserId,
	compact = false,
	showHelp = true,
}: {
	daily?: DailyProgress;
	currentMemberUserId?: string;
	compact?: boolean;
	showHelp?: boolean;
}) {
	const hasChallenge = Boolean(daily?.challengeCost);
	const currentMember = currentMemberUserId ? daily?.members.find((member) => member.userId === currentMemberUserId) : undefined;
	const journeyReady = daily ? daily.movementCost === 0 || daily.movementSatisfied : false;
	const challengeCleared = daily ? daily.challengeCost === 0 || daily.challengeCleared : false;

	return (
		<section
			className={`gameplay-mechanics ${compact ? 'gameplay-mechanics-compact' : ''}`}
			aria-label="Adventure mechanics"
			data-testid="gameplay-mechanics"
		>
			<div className="gameplay-mechanic-grid">
				<div className="gameplay-mechanic gameplay-mechanic-momentum">
					<div className="gameplay-mechanic-heading">
						<Sparkles className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Momentum</span>
					</div>
					<strong>{daily ? daily.movementUnits : '—'}</strong>
					<span>{daily ? 'today’s party readiness' : 'daily signal unavailable'}</span>
				</div>

				<div className="gameplay-mechanic">
					<div className="gameplay-mechanic-heading">
						<Compass className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Journey</span>
					</div>
					<strong>{daily ? (daily.movementCost > 0 ? `${daily.movementUnits} / ${daily.movementCost}` : 'Ready') : '—'}</strong>
					{daily && daily.movementCost > 0 && (
						<Progress value={percent(daily.movementUnits, daily.movementCost)} aria-label="Journey requirement" />
					)}
					<span>
						{!daily
							? 'travel requirement unavailable'
							: daily.movementCost === 0
								? 'no travel required'
								: journeyReady
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

			{currentMemberUserId && daily && (
				<p className="gameplay-mechanics-note" role="status">
					<strong>{currentMember?.movementUnits ? 'Ready to act today.' : 'No Momentum recorded for this traveler today.'}</strong> Each
					traveler chooses one command; Momentum determines whether that command can resolve.
				</p>
			)}

			{!compact && showHelp && (
				<p className="gameplay-mechanics-help">
					Momentum comes from today’s health signal. It powers daily commands and helps meet the Journey requirement
					{hasChallenge ? ', while contributing to the active Challenge.' : '.'}
				</p>
			)}
		</section>
	);
}
