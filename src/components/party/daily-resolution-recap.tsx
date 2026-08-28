import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, HeartPulse, MapPinned, Shield, Sparkles, Swords } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { InventoryItemSprite } from '#/components/inventory/inventory-item-sprite';
import { BattleArt } from '#/components/party/battle-art';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { PartyRecap } from '#/lib/api';
import { battleArtVariant } from '#/lib/battle-art';
import { formatDateTime } from '#/lib/dates';
import { battleEnemyArtForArchetype, battlePartyArtForClass } from '#/lib/game-art';
import type { InventoryItemKind } from '#/lib/game-art';

function label(value: string) {
	return value
		.split('-')
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

function outcomeLabel(outcome: PartyRecap['resolution']['outcome']) {
	if (outcome === 'advanced') return 'The party advanced';
	if (outcome === 'route-selected') return 'The party chose a route';
	if (outcome === 'defeated') return 'The party was defeated and returned to safety';
	return 'The trail held';
}

function resolutionExplanation(resolution: PartyRecap['resolution']) {
	if (resolution.outcome === 'defeated') {
		return `The party recovered at ${resolution.destinationNode.name} with reduced health. The cleared dungeon progress remains available for a retry.`;
	}
	if (!resolution.movement.satisfied) {
		return `Needs ${Math.max(0, resolution.movement.cost - resolution.movement.units)} more Momentum for the Travel requirement.`;
	}
	if (resolution.challenge.cost > 0 && !resolution.challenge.cleared) {
		return `The Challenge needs ${Math.max(0, resolution.challenge.cost - resolution.challenge.progressAfter)} more progress.`;
	}
	if (resolution.event?.outcome === 'failed') return 'The event choice did not succeed.';
	return resolution.outcome === 'held' ? 'The party is ready for the next resolution.' : 'The Travel requirement was met.';
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

function rewardVisuals(reward: PartyRecap['resolution']['rewards'][number]) {
	const visuals: { itemKey: string; kind: InventoryItemKind }[] = [];
	if (reward.currency) visuals.push({ itemKey: reward.currency.key, kind: 'currency' });
	if (reward.item) visuals.push({ itemKey: reward.item.key, kind: 'item' });
	if (reward.equipment) visuals.push({ itemKey: reward.equipment.key, kind: 'equipment' });
	return visuals;
}

function rewardKey(reward: PartyRecap['resolution']['rewards'][number]) {
	return JSON.stringify({
		experience: reward.experience ?? null,
		currency: reward.currency ? { key: reward.currency.key, amount: reward.currency.amount } : null,
		item: reward.item ? { key: reward.item.key, quantity: reward.item.quantity } : null,
		equipmentKey: reward.equipment?.key ?? null,
		unlockKey: reward.unlockKey ?? null,
		milestoneKey: reward.milestoneKey ?? null,
	});
}

function signedHealth(value: number) {
	return value > 0 ? `+${value}` : String(value);
}

type NavigationHaltReason = NonNullable<PartyRecap['resolution']['navigation']>['haltedReason'];

function navigationHaltLabel(reason: NavigationHaltReason) {
	switch (reason) {
		case 'pinned-encounter':
			return 'waiting for the pinned encounter';
		case 'checkpoint':
			return 'waiting for the next daily signal';
		case 'encounter':
			return 'paused at an encounter for the party';
		case 'event':
			return 'paused at a landmark event';
		case 'boss':
			return 'waiting for the boss battle';
		case 'retreat':
			return 'retreating toward safety';
		case 'safe-boundary':
			return 'at a safe checkpoint';
		case 'insufficient-balance':
			return 'waiting for more Explore energy';
		case 'wall':
			return 'blocked by a wall';
		case 'step-cap':
			return 'at the movement limit for this resolution';
	}
	return exhaustive(reason);
}

type NavigationPolicy = NonNullable<PartyRecap['resolution']['navigation']>['policy'];

function navigationPolicyLabel(policy: NavigationPolicy) {
	switch (policy) {
		case 'mission':
			return 'Mission';
		case 'explore':
			return 'Explore';
		case 'treasure':
			return 'Treasure';
		case 'rest':
			return 'Rest';
	}
	return exhaustive(policy);
}

function exhaustive(value: never): never {
	throw new Error('Unhandled dungeon navigation value: ' + String(value));
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
	const travelRequirementValue =
		resolution.movement.cost > 0 ? `${resolution.movement.units} / ${resolution.movement.cost} Momentum` : 'Ready';

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
				<div className="game-inset game-inset-gold p-4">
					<div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-[var(--indigo)]">
						<span>{resolution.sourceNode.name}</span>
						<ArrowRight className="size-4 text-[var(--gold-deep)]" aria-hidden="true" />
						<span>{resolution.destinationNode.name}</span>
					</div>
					<p className="mt-2 text-sm font-bold text-[var(--gold-deep)]">{outcomeLabel(resolution.outcome)}</p>
					<p className="mt-1 text-sm text-[var(--ink-soft)]">{resolutionExplanation(resolution)}</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					<SummaryStat label="Travel requirement" value={travelRequirementValue} icon={<MapPinned className="size-4" />} />
					<SummaryStat label="Recovery" value={`${resolution.recoveryPoints} points`} icon={<HeartPulse className="size-4" />} />
					{resolution.challenge.cost > 0 && (
						<SummaryStat
							label="Challenge"
							value={`${resolution.challenge.progressAfter} / ${resolution.challenge.cost}`}
							icon={<Shield className="size-4" />}
						/>
					)}
				</div>

				{resolution.route && (
					<DetailRow label="Route selected" value={`${label(resolution.route.optionKey)} · ${resolution.route.reason}`} />
				)}

				{resolution.navigation?.mode === 'safe-autopilot' && (
					<DetailRow
						label="Automatic expedition"
						value={`${navigationPolicyLabel(resolution.navigation.policy)} · ${resolution.navigation.steps} tile steps · ${resolution.navigation.retreating ? 'retreating to safety' : navigationHaltLabel(resolution.navigation.haltedReason)}`}
					/>
				)}

				{resolution.challenge.cost > 0 && (
					<DetailRow
						label="Challenge contribution"
						value={`${resolution.challenge.contribution} today · ${resolution.challenge.cleared ? 'cleared' : 'in progress'}`}
					/>
				)}

				{resolution.event && (
					<DetailRow
						label={`${label(resolution.event.eventType)} event`}
						value={`${label(resolution.event.outcome)}${resolution.event.selectedChoiceKey ? ` · ${label(resolution.event.selectedChoiceKey)}` : ''}`}
					/>
				)}

				{resolution.combats.map((combat, index) => (
					<div key={'encounter-' + String(index)} className="game-inset game-inset-muted space-y-3 p-4">
						<div className="flex items-center gap-2">
							<Swords className="size-4 text-[var(--danger)]" aria-hidden="true" />
							<p className="game-pixel-label text-[var(--ink-soft)]">
								{resolution.combats.length > 1 ? 'Encounter ' + String(index + 1) + ' recap' : 'Encounter recap'}
							</p>
						</div>
						<div className="space-y-2">
							{combat.members.map((member) => (
								<div key={member.userId} className="battle-recap-combatant flex flex-wrap items-center justify-between gap-2 text-sm">
									<div className="flex min-w-0 items-center gap-2">
										<BattleArt
											art={battlePartyArtForClass(member.classKey)}
											label={member.displayName}
											variant={battleArtVariant(member.healthAfter, member.maxHealth)}
											className="battle-recap-art battle-recap-party-art"
											testId={`daily-recap-member-art-${member.userId}`}
										/>
										<span className="font-extrabold text-[var(--indigo)]">{member.displayName}</span>
									</div>
									<span className="text-[var(--ink-soft)]">
										{member.cards.length > 0 ? member.cards.map((card) => card.displayName).join(', ') : 'No cards recorded'} ·{' '}
										{signedHealth(member.recovery)} recovery
										{member.cardHealing > 0 && <> · +{member.cardHealing} healing</>}
										{member.damageTaken > 0 && <> · -{member.damageTaken} damage</>} · {member.healthAfter}/{member.maxHealth} HP
									</span>
								</div>
							))}
						</div>
						<div className="border-t border-[var(--line)] pt-3">
							{combat.enemies.map((enemy) => (
								<div key={enemy.id} className="battle-recap-combatant flex flex-wrap items-center justify-between gap-2 text-sm">
									<div className="flex min-w-0 items-center gap-2">
										<BattleArt
											art={battleEnemyArtForArchetype(enemy.archetypeKey)}
											label={enemy.displayName}
											variant={enemy.defeated ? 'defeated' : battleArtVariant(enemy.healthAfter, enemy.maxHealth)}
											className="battle-recap-art battle-recap-enemy-art"
											testId={`daily-recap-enemy-art-${enemy.id}`}
										/>
										<span className="font-extrabold text-[var(--indigo)]">{enemy.displayName}</span>
									</div>
									<span className="text-[var(--ink-soft)]">
										{enemy.damageTaken > 0 ? `-${enemy.damageTaken} damage` : 'No damage'} · {enemy.healthAfter}/{enemy.maxHealth} HP
										{enemy.defeated ? ' · defeated' : ''}
									</span>
								</div>
							))}
						</div>
					</div>
				))}

				{resolution.rewards.length > 0 && (
					<div className="game-inset game-inset-teal p-4">
						<p className="game-pixel-label text-[var(--teal-deep)]">Rewards</p>
						<ul className="mt-2 space-y-1 text-sm font-bold text-[var(--teal-deep)]">
							{resolution.rewards.map((reward) => {
								const summary = rewardSummary(reward);
								const visuals = rewardVisuals(reward);

								return (
									<li key={rewardKey(reward)} className="flex items-center gap-3">
										{visuals.length > 0 && (
											<span className="flex shrink-0 gap-1" aria-hidden="true">
												{visuals.map((visual) => (
													<InventoryItemSprite
														key={`${visual.kind}-${visual.itemKey}`}
														itemKey={visual.itemKey}
														kind={visual.kind}
														size="sm"
														className="bg-[var(--surface)]"
													/>
												))}
											</span>
										)}
										<span>{summary}</span>
									</li>
								);
							})}
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
		<div className="game-inset game-inset-muted p-3">
			<div className="flex items-center justify-between gap-2 text-[var(--ink-soft)]">
				<span className="game-pixel-label">{statLabel}</span>
				<span aria-hidden="true">{icon}</span>
			</div>
			<p className="mt-2 font-mono text-lg font-bold text-[var(--indigo)]">{value}</p>
		</div>
	);
}

function DetailRow({ label: detailLabel, value }: { label: string; value: string }) {
	return (
		<div className="game-inset game-inset-muted flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
			<span className="font-extrabold text-[var(--indigo)]">{detailLabel}</span>
			<span className="text-[var(--ink-soft)]">{value}</span>
		</div>
	);
}
