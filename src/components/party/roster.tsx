import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import type { Party } from '#/lib/api';

export function Roster({ party }: { party: Party }) {
	return (
		<Card variant="game" tone="atlas">
			<CardHeader>
				<p className="eyebrow">Travelers</p>
				<CardTitle className="mt-3 text-2xl">The party roster</CardTitle>
			</CardHeader>
			<CardContent>
				{party.members.map((member) => (
					<div
						key={member.userId}
						className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
					>
						<div className="flex min-w-0 items-center gap-3">
							<span className="health-orb grid size-8 shrink-0 place-items-center rounded-full bg-[var(--teal)] text-xs font-black text-white">
								{member.displayName?.slice(0, 1).toUpperCase() ?? '?'}
							</span>
							<span className="truncate text-sm font-bold text-[var(--ink)]">{member.displayName ?? 'Unnamed traveler'}</span>
						</div>
						{member.role === 'leader' ? <Badge>Leader</Badge> : <span className="text-xs font-bold text-[var(--teal-deep)]">On trail</span>}
					</div>
				))}
			</CardContent>
		</Card>
	);
}
