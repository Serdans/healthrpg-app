import { useEffect, useState } from 'react';
import { BookOpen, Coins, Shield, Sparkles } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import type { PartyProgression } from '#/lib/api';
import { formatDateTime } from '#/lib/dates';
import { usePartyProgression } from '#/lib/queries';

function rewardSummary(reward: PartyProgression['items'][number]['reward']) {
	const rewards = [
		reward.experience ? `${reward.experience} XP` : null,
		reward.currency ? `${reward.currency.amount} ${reward.currency.key}` : null,
		reward.item ? `${reward.item.quantity} ${reward.item.key}` : null,
		reward.equipment ? reward.equipment.key : null,
		reward.unlockKey ? `Unlocked ${reward.unlockKey}` : null,
		reward.milestoneKey ? `Milestone: ${reward.milestoneKey}` : null,
	].filter((value): value is string => Boolean(value));
	return rewards.length > 0 ? rewards.join(' · ') : 'Progress recorded';
}

export function ProgressionHistory({ partyId, timeZone }: { partyId: string; timeZone: string }) {
	const [cursor, setCursor] = useState<string>();
	const [items, setItems] = useState<PartyProgression['items']>([]);
	const progressionQuery = usePartyProgression(partyId, cursor);

	useEffect(() => {
		if (!progressionQuery.data) return;
		setItems((current) => {
			if (!cursor) return progressionQuery.data.items;
			const existing = new Set(current.map((item) => item.id));
			return [...current, ...progressionQuery.data.items.filter((item) => !existing.has(item.id))];
		});
	}, [cursor, progressionQuery.data]);

	if (progressionQuery.isPending && items.length === 0) return <LoadingState label="Reading the party chronicle…" />;
	if (progressionQuery.isError && items.length === 0)
		return (
			<ErrorNotice
				error={progressionQuery.error}
				message={progressionQuery.error.message}
				onRetry={() => void progressionQuery.refetch()}
				retrying={progressionQuery.isFetching}
				retryLabel="Retry chronicle"
			/>
		);

	const nextCursor = progressionQuery.data?.nextCursor ?? null;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-3">
					<div>
						<Badge>Party chronicle</Badge>
						<CardTitle className="mt-3 text-2xl">What the party has earned</CardTitle>
					</div>
					<BookOpen className="size-5 text-[var(--gold-deep)]" />
				</div>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<EmptyState title="The chronicle is waiting." copy="Resolved events and encounters will leave rewards here." />
				) : (
					<div className="space-y-3">
						{items.map((item) => (
							<div key={item.id} className="flex items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
								<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">
									{item.reward.currency ? (
										<Coins className="size-4" />
									) : item.reward.equipment ? (
										<Shield className="size-4" />
									) : (
										<Sparkles className="size-4" />
									)}
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="font-extrabold text-[var(--indigo)]">{item.nodeName}</p>
										<time className="text-xs text-[var(--ink-faint)]">{formatDateTime(item.createdAt, timeZone)}</time>
									</div>
									<p className="mt-1 text-sm text-[var(--ink-soft)]">{rewardSummary(item.reward)}</p>
								</div>
							</div>
						))}
					</div>
				)}
				{progressionQuery.isError && items.length > 0 && (
					<ErrorNotice
						error={progressionQuery.error}
						message={progressionQuery.error.message}
						onRetry={() => void progressionQuery.refetch()}
						retrying={progressionQuery.isFetching}
						retryLabel="Retry chronicle"
					/>
				)}
				{nextCursor && (
					<Button variant="secondary" disabled={progressionQuery.isPending} onClick={() => setCursor(nextCursor)}>
						{progressionQuery.isPending ? 'Loading…' : 'Load more history'}
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
