import { Compass, Sparkles } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { Adventure } from '#/lib/api';
import { formatDateTime } from '#/lib/dates';

export function AdventurePanel({
	adventure,
	timeZone,
	pending,
	error,
	onRetry,
	retrying,
}: {
	adventure: Adventure | undefined;
	timeZone: string;
	pending: boolean;
	error: Error | null;
	onRetry: () => void;
	retrying: boolean;
}) {
	if (pending) {
		return (
			<Card variant="game" tone="atlas">
				<LoadingState label="Reading the current adventure…" />
			</Card>
		);
	}

	if (error) {
		return <ErrorNotice error={error} message={error.message} onRetry={onRetry} retrying={retrying} retryLabel="Retry adventure" />;
	}

	if (!adventure) return null;

	return (
		<Card variant="game" tone="atlas">
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div>
						<Badge>Adventure atlas · chapter {adventure.land.chapterNo}</Badge>
						<CardTitle className="mt-3 text-3xl">{adventure.land.displayName}</CardTitle>
						<CardDescription>{adventure.land.description}</CardDescription>
					</div>
					<Compass className="size-6 shrink-0 text-[var(--gold)]" />
				</div>
			</CardHeader>
			<CardContent>
				{adventure.currentObjective ? (
					<div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4">
						<div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--gold-deep)]">
							<Sparkles className="size-4" /> Current objective
						</div>
						<h3 className="mt-2 text-lg font-extrabold text-[var(--indigo)]">{adventure.currentObjective.displayName}</h3>
						<p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{adventure.currentObjective.description}</p>
					</div>
				) : (
					<EmptyState title="The current land is mapped." copy="Every known objective in this land has been completed." />
				)}

				{adventure.history.length > 0 && (
					<div>
						<div className="mb-3 flex items-center justify-between gap-3">
							<p className="eyebrow">Completed landmarks</p>
							<span className="text-xs font-bold text-[var(--ink-faint)]">{adventure.history.length} recorded</span>
						</div>
						<div className="space-y-2">
							{adventure.history.slice(0, 4).map((item) => (
								<div key={item.nodeId} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<p className="font-extrabold text-[var(--indigo)]">{item.displayName}</p>
										<time className="text-xs text-[var(--ink-faint)]">{formatDateTime(item.completedAt, timeZone)}</time>
									</div>
									<p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{item.description}</p>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
