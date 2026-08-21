import { Check } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import type { PartyMap, PartyVotes } from '#/lib/api';
import { formatDateTime, formatTimeRemaining } from '#/lib/dates';
import type { useCastVote } from '#/lib/queries';

export function BranchDecision({
	map,
	votes,
	edges,
	mutation,
	userId,
	memberCount,
	timeZone,
	readOnly = false,
}: {
	map: PartyMap;
	votes: PartyVotes | undefined;
	edges: PartyMap['edges'];
	mutation: ReturnType<typeof useCastVote>;
	userId: string;
	memberCount: number;
	timeZone: string;
	readOnly?: boolean;
}) {
	const targetName = new Map(map.nodes.map((node) => [node.id, node.name]));
	const userVote = votes?.votes.find((vote) => vote.userId === userId)?.edgeId;
	const resolved = Boolean(votes?.resolvedEdgeId);
	const resolvedName = votes?.resolvedEdgeId
		? (targetName.get(edges.find((edge) => edge.id === votes.resolvedEdgeId)?.toNodeId ?? '') ?? 'the chosen route')
		: null;
	const totalVotes = votes?.votes.length ?? 0;
	return (
		<Card variant="game" tone="arcane">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<Badge>Route vote</Badge>
						<CardTitle className="mt-3 text-2xl">Choose the next trail</CardTitle>
					</div>
					<div className="text-right text-xs font-bold text-[var(--ink-soft)]">
						<p>
							{totalVotes} / {memberCount} votes cast
						</p>
						{votes && (
							<p className="mt-1">
								{resolved ? 'Resolved' : `${formatTimeRemaining(votes.deadlineAt)} · closes ${formatDateTime(votes.deadlineAt, timeZone)}`}
							</p>
						)}
					</div>
				</div>
				{resolved && (
					<p className="text-sm font-bold text-[var(--teal-deep)]">
						The route has been resolved toward {resolvedName}. The party is moving together.
					</p>
				)}
				{readOnly && !resolved && (
					<p role="status" className="text-sm font-bold text-[var(--ink-soft)]">
						This expedition is no longer active. The route history is available to view, but new votes are closed.
					</p>
				)}
				{mutation.isPending && (
					<p className="game-action-status" role="status" aria-live="polite">
						Saving your route vote…
					</p>
				)}
				{mutation.isSuccess && (
					<p className="game-action-status game-action-status-success" role="status" aria-live="polite">
						Your route vote is saved. The party can still change it before the decision closes.
					</p>
				)}
			</CardHeader>
			<CardContent className="grid gap-3 pt-1 sm:grid-cols-2">
				{edges.map((edge) => {
					const count = votes?.votes.filter((vote) => vote.edgeId === edge.id).length ?? 0;
					const selected = userVote === edge.id;
					const resolvedSelection = votes?.resolvedEdgeId === edge.id;
					return (
						<button
							key={edge.id}
							type="button"
							className="choice-card game-choice-card p-5 text-left"
							data-selected={selected}
							data-choice-state={
								mutation.isPending ? 'pending' : resolvedSelection ? 'resolved' : resolved ? 'closed' : selected ? 'selected' : 'available'
							}
							aria-pressed={selected}
							aria-busy={mutation.isPending}
							disabled={readOnly || mutation.isPending || resolved}
							onClick={() => mutation.mutate(edge.id)}
						>
							<div className="flex items-start justify-between gap-3">
								<span className="grid size-9 place-items-center rounded-xl bg-[var(--indigo)] font-mono text-sm text-[var(--gold)]">
									{edge.sortOrder + 1}
								</span>
								{(selected || resolvedSelection) && (
									<span className={`game-choice-marker ${resolvedSelection ? 'game-choice-marker-resolved' : ''}`}>
										<Check className="size-3" aria-hidden="true" />
										{resolvedSelection ? 'Chosen route' : 'Your vote'}
									</span>
								)}
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
