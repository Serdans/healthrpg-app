import { Compass, HeartPulse, UsersRound } from 'lucide-react';

import type { Adventure, DailyProgress, Party } from '#/lib/api';

export function PartyHud({ party, adventure, daily }: { party: Party; adventure: Adventure | undefined; daily: DailyProgress }) {
	const movementPercent = daily.movementCost > 0 ? Math.min(100, (daily.movementUnits / daily.movementCost) * 100) : 100;
	const gatePercent = daily.gateCost > 0 ? Math.min(100, (daily.gateProgress / daily.gateCost) * 100) : 0;

	return (
		<section className="party-hud game-panel" data-game-tone="atlas" aria-label="Party status" data-testid="party-hud">
			<div className="party-hud-location">
				<span className="party-hud-crest" aria-hidden="true">
					✦
				</span>
				<div>
					<p className="eyebrow game-pixel-label">Expedition · chapter {party.currentNode.chapterNo}</p>
					<h2>{adventure?.land.displayName ?? 'The frontier'}</h2>
					<p>
						{party.name} · {party.currentNode.name}
					</p>
				</div>
			</div>

			<div className="party-hud-stats">
				<div className="party-hud-stat">
					<div className="party-hud-stat-label game-pixel-label">
						<UsersRound className="size-4" /> Party
					</div>
					<strong>
						{party.members.length} / {party.memberCapacity}
					</strong>
					<span>travelers</span>
				</div>
				<div className="party-hud-stat">
					<div className="party-hud-stat-label game-pixel-label">
						<Compass className="size-4" /> Movement
					</div>
					<strong>
						{daily.movementUnits} / {daily.movementCost}
					</strong>
					<span className="party-hud-progress">
						<i style={{ width: `${movementPercent}%` }} />
					</span>
				</div>
				<div className="party-hud-stat">
					<div className="party-hud-stat-label game-pixel-label">
						<HeartPulse className="size-4" /> Gate
					</div>
					<strong>
						{daily.gateProgress} / {daily.gateCost}
					</strong>
					<span className="party-hud-progress party-hud-progress-gold">
						<i style={{ width: `${gatePercent}%` }} />
					</span>
				</div>
			</div>

			{adventure?.currentObjective && (
				<div className="party-hud-quest">
					<p className="eyebrow game-pixel-label">Current objective</p>
					<strong>{adventure.currentObjective.displayName}</strong>
					<span>{adventure.currentObjective.description}</span>
				</div>
			)}
		</section>
	);
}
