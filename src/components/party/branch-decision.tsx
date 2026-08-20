import { Check } from 'lucide-react';

import { Card, CardContent } from '#/components/ui/card';
import type { PartyMap, PartyVotes } from '#/lib/api';
import type { useCastVote } from '#/lib/queries';

export function BranchDecision({
	map,
	votes,
	edges,
	mutation,
}: {
	map: PartyMap;
	votes: PartyVotes | undefined;
	edges: PartyMap['edges'];
	mutation: ReturnType<typeof useCastVote>;
}) {
	const targetName = new Map(map.nodes.map((node) => [node.id, node.name]));
	return (
		<Card>
			<CardContent className="grid gap-3 pt-1 sm:grid-cols-2">
				{edges.map((edge) => {
					const count = votes?.votes.filter((vote) => vote.edgeId === edge.id).length ?? 0;
					const selected = votes?.votes.some((vote) => vote.edgeId === edge.id);
					return (
						<button
							key={edge.id}
							type="button"
							className="choice-card rounded-2xl p-5 text-left"
							data-selected={selected}
							disabled={mutation.isPending}
							onClick={() => mutation.mutate(edge.id)}
						>
							<div className="flex items-start justify-between gap-3">
								<span className="grid size-9 place-items-center rounded-xl bg-[var(--indigo)] font-mono text-sm text-[var(--gold)]">
									{edge.sortOrder + 1}
								</span>
								{selected && <Check className="size-5 text-[var(--amethyst)]" />}
							</div>
							<p className="mt-5 text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--gold-deep)]">{edge.optionKey}</p>
							<p className="mt-1 text-lg font-extrabold text-[var(--indigo)]">
								{targetName.get(edge.toNodeId) ?? 'A path through the mist'}
							</p>
							<p className="mt-2 text-xs font-bold text-[var(--ink-soft)]">
								{count} vote{count === 1 ? '' : 's'} · your choice can change before the day closes
							</p>
						</button>
					);
				})}
			</CardContent>
		</Card>
	);
}
