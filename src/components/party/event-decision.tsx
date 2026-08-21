import { Check, Sparkles } from 'lucide-react';

import { ErrorNotice } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import type { PartyEvent } from '#/lib/api';
import type { useChooseEvent } from '#/lib/queries';

export function EventDecision({
	event,
	mutation,
	readOnly = false,
}: {
	event: PartyEvent;
	mutation: ReturnType<typeof useChooseEvent>;
	readOnly?: boolean;
}) {
	return (
		<Card variant="game" tone="arcane">
			<CardHeader>
				<Badge className="border-[color-mix(in_srgb,var(--amethyst)_30%,transparent)] bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
					{event.eventType} event
				</Badge>
				<CardTitle className="mt-4 text-3xl">{event.prompt}</CardTitle>
				{readOnly && (
					<p role="status" className="text-sm font-bold text-[var(--ink-soft)]">
						This expedition is no longer active. The event history is available to view, but new choices are closed.
					</p>
				)}
				{mutation.isPending && (
					<p className="game-action-status" role="status" aria-live="polite">
						Saving your event choice…
					</p>
				)}
				{mutation.isSuccess && (
					<p className="game-action-status game-action-status-success" role="status" aria-live="polite">
						Your event choice is saved. The scene will resolve with the party’s daily outcome.
					</p>
				)}
			</CardHeader>
			<CardContent className="grid gap-3 sm:grid-cols-2">
				{event.choices.map((choice) => {
					const selected = event.selectedChoiceKey === choice.key;
					const voteCount = event.votes.filter((vote) => vote.choiceKey === choice.key).length;
					return (
						<button
							key={choice.key}
							type="button"
							className="choice-card game-choice-card p-5 text-left"
							data-selected={selected}
							data-choice-state={mutation.isPending ? 'pending' : mutation.isError ? 'error' : selected ? 'selected' : 'available'}
							aria-pressed={selected}
							aria-busy={mutation.isPending}
							disabled={readOnly || mutation.isPending}
							onClick={() => mutation.mutate(choice.key)}
						>
							<div className="flex items-start justify-between gap-3">
								<Sparkles className="size-5 text-[var(--gold)]" aria-hidden="true" />
								{selected && <Check className="size-5 text-[var(--amethyst)]" aria-hidden="true" />}
							</div>
							<p className="mt-5 text-lg font-extrabold text-[var(--indigo)]">{choice.displayName}</p>
							<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{choice.description}</p>
							<p className="mt-4 font-mono text-xs text-[var(--gold-deep)]">
								{choice.requirements.movementUnits} Momentum · {choice.requirements.recoveryPoints} Recovery
							</p>
							<p className="mt-2 text-xs font-bold text-[var(--ink-soft)]">
								{voteCount} vote{voteCount === 1 ? '' : 's'} · your choice can change before the day closes
							</p>
						</button>
					);
				})}
			</CardContent>
			{mutation.isError && (
				<div className="game-action-error px-7 pb-7">
					<ErrorNotice error={mutation.error} message={mutation.error.message} />
				</div>
			)}
		</Card>
	);
}
