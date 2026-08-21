import { CalendarDays, UsersRound } from 'lucide-react';

import type { Adventure, DailyProgress, Party } from '#/lib/api';

export function PartyHud({ party, adventure, daily }: { party: Party; adventure: Adventure | undefined; daily?: DailyProgress }) {
	return (
		<section className="party-hud game-panel" data-game-tone="atlas" aria-label="Party status" data-testid="party-hud">
			<div className="party-hud-location">
				<span className="party-hud-crest" aria-hidden="true">
					<span>✦</span>
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
						<UsersRound className="size-4" aria-hidden="true" /> Party
					</div>
					<strong>
						{party.members.length} / {party.memberCapacity}
					</strong>
					<span>travelers</span>
				</div>
				<div className="party-hud-stat">
					<div className="party-hud-stat-label game-pixel-label">
						<CalendarDays className="size-4" aria-hidden="true" /> Today
					</div>
					<strong>{daily ? (daily.status === 'complete' ? 'Complete' : 'In progress') : '—'}</strong>
					<span>{daily?.worldDate ?? 'Daily signal unavailable'}</span>
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
