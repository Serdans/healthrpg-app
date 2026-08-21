import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, HeartPulse, MapPinned, Shield, Sparkles, Swords } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { PartyRecap } from '#/lib/api';
import { formatDateTime } from '#/lib/dates';

function label(value: string) {
	return value
		.split('-')
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

function outcomeLabel(outcome: PartyRecap['resolution']['outcome']) {
	if (outcome === 'advanced') return 'The party advanced';
	if (outcome === 'route-selected') return 'The party chose a route';
	return 'The trail held';
}

function rewardSummary(reward: PartyRecap['resolution']['rewards'][number]) {
	const rewards = [
		reward.experience ? `${reward.experience} XP` : null,
		reward.currency ? `${reward.currency.amount} ${label(reward.currency.key)}` : null,
		reward.item ? `${reward.item.quantity} ${label(reward.item.key)}` : null,
		reward.equipment ? label(reward.equipment.key) : null,
		reward.unlockKey ? `Unlocked ${label(reward.unlockKey)}` : null,
		reward.milestoneKey ? `Milestone: ${label(reward.milestoneKey)}` : null,
	].filter((value): value is string => Boolean(value));
	return rewards.length > 0 ? rewards.join(' · ') : 'Progress recorded';
}

function signedHealth(value: number) {
	return value > 0 ? `+${value}` : String(value);
}

export function DailyResolutionRecap({
	partyId,
	recap,
	timeZone,
	pending = false,
	error,
	onRetry,
	retrying = false,
}: {
	partyId: string;
	recap: PartyRecap | null | undefined;
	timeZone: string;
	pending?: boolean;
	error?: unknown;
	onRetry?: () => void;
	retrying?: boolean;
}) {
	if (pending && !recap) {
		return (
			<Card variant="game" tone="history" data-testid="daily-resolution-recap">
				<LoadingState label="Reading the latest resolution…" />
			</Card>
		);
	}
	if (error && !recap) {
		return (
			<Card variant="game" tone="history" data-testid="daily-resolution-recap">
				<ErrorNotice
					error={error}
					message="The daily recap could not be read."
					onRetry={onRetry}
					retrying={retrying}
					retryLabel="Retry recap"
				/>
			</Card>
		);
	}

	if (!recap) {
		return (
			<Card variant="game" tone="history" data-testid="daily-resolution-recap">
				<CardHeader>
					<Badge>Daily resolution</Badge>
					<CardTitle className="mt-3 text-2xl">The chronicle is waiting.</CardTitle>
					<CardDescription>No completed world day has been recorded for this party yet.</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const resolution = recap.resolution;
	const combat = resolution.combat;

	return (
		<Card variant="game" tone="history" data-testid="daily-resolution-recap">
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge>Daily resolution</Badge>
							<NewResolutionMarker partyId={partyId} worldDate={recap.worldDate} />
						</div>
						<CardTitle className="mt-3 text-2xl">The trail answers back.</CardTitle>
						<CardDescription>
							{recap.worldDate} · resolved {formatDateTime(recap.resolvedAt, timeZone)}
						</CardDescription>
					</div>
					<Sparkles className="size-6 text-[var(--gold)]" aria-hidden="true" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4">
					<div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-[var(--indigo)]">
						<span>{resolution.sourceNode.name}</span>
						<ArrowRight className="size-4 text-[var(--gold-deep)]" aria-hidden="true" />
						<span>{resolution.destinationNode.name}</span>
					</div>
					<p className="mt-2 text-sm font-bold text-[var(--gold-deep)]">{outcomeLabel(resolution.outcome)}</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					<SummaryStat
						label="Movement"
						value={`${resolution.movement.units} / ${resolution.movement.cost}`}
						icon={<MapPinned className="size-4" />}
					/>
					<SummaryStat label="Recovery" value={`${resolution.recoveryPoints} points`} icon={<HeartPulse className="size-4" />} />
					<SummaryStat
						label="Gate"
						value={`${resolution.gate.progressAfter} / ${resolution.gate.cost}`}
						icon={<Shield className="size-4" />}
					/>
				</div>

				{resolution.route && (
					<DetailRow label="Route selected" value={`${label(resolution.route.optionKey)} · ${resolution.route.reason}`} />
				)}

				<DetailRow
					label="Gate contribution"
					value={`${resolution.gate.contribution} · ${resolution.gate.unlocked ? 'unlocked' : 'still sealed'}`}
				/>

				{resolution.event && (
					<DetailRow
						label={`${label(resolution.event.eventType)} event`}
						value={`${label(resolution.event.outcome)}${resolution.event.selectedChoiceKey ? ` · ${label(resolution.event.selectedChoiceKey)}` : ''}`}
					/>
				)}

				{combat && (
					<div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
						<div className="flex items-center gap-2">
							<Swords className="size-4 text-[var(--danger)]" aria-hidden="true" />
							<p className="game-pixel-label text-[var(--ink-soft)]">Encounter recap</p>
						</div>
						<div className="space-y-2">
							{combat.members.map((member) => (
								<div key={member.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
									<span className="font-extrabold text-[var(--indigo)]">{member.displayName}</span>
									<span className="text-[var(--ink-soft)]">
										{member.actionName} · {signedHealth(member.recovery)} recovery
										{member.actionHealing > 0 ? ` · +${member.actionHealing} healing` : ''}
										{member.damageTaken > 0 ? ` · -${member.damageTaken} damage` : ''} · {member.healthAfter}/{member.maxHealth} HP
									</span>
								</div>
							))}
						</div>
						<div className="border-t border-[var(--line)] pt-3">
							{combat.enemies.map((enemy) => (
								<div key={enemy.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
									<span className="font-extrabold text-[var(--indigo)]">{enemy.displayName}</span>
									<span className="text-[var(--ink-soft)]">
										{enemy.damageTaken > 0 ? `-${enemy.damageTaken} damage` : 'No damage'} · {enemy.healthAfter}/{enemy.maxHealth} HP
										{enemy.defeated ? ' · defeated' : ''}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{resolution.rewards.length > 0 && (
					<div className="rounded-2xl border border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[color-mix(in_srgb,var(--teal)_8%,transparent)] p-4">
						<p className="game-pixel-label text-[var(--teal-deep)]">Rewards</p>
						<ul className="mt-2 space-y-1 text-sm font-bold text-[var(--teal-deep)]">
							{resolution.rewards.map((reward) => (
								<li key={rewardSummary(reward)}>{rewardSummary(reward)}</li>
							))}
						</ul>
					</div>
				)}

				{Boolean(error) && (
					<ErrorNotice
						error={error}
						message="The recap may be out of date."
						onRetry={onRetry}
						retrying={retrying}
						retryLabel="Retry recap"
					/>
				)}
			</CardContent>
		</Card>
	);
}

function NewResolutionMarker({ partyId, worldDate }: { partyId: string; worldDate: string }) {
	const [isNew, setIsNew] = useState(false);

	useEffect(() => {
		const key = `healthrpg:party-recap:${partyId}`;
		const seenWorldDate = window.localStorage.getItem(key);
		const unseen = seenWorldDate !== worldDate;
		setIsNew(unseen);
		if (unseen) window.localStorage.setItem(key, worldDate);
	}, [partyId, worldDate]);

	return isNew ? (
		<Badge className="border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[var(--teal)]/10 text-[var(--teal-deep)]">
			New resolution
		</Badge>
	) : null;
}

function SummaryStat({ label: statLabel, value, icon }: { label: string; value: string; icon: ReactNode }) {
	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
			<div className="flex items-center justify-between gap-2 text-[var(--ink-soft)]">
				<span className="game-pixel-label">{statLabel}</span>
				{icon}
			</div>
			<p className="mt-2 font-mono text-lg font-bold text-[var(--indigo)]">{value}</p>
		</div>
	);
}

function DetailRow({ label: detailLabel, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm">
			<span className="font-extrabold text-[var(--indigo)]">{detailLabel}</span>
			<span className="text-[var(--ink-soft)]">{value}</span>
		</div>
	);
}
