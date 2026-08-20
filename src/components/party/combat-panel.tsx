import { useEffect, useState } from 'react';
import { Check, HeartPulse, Shield, Sparkles, Swords } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Progress } from '#/components/ui/progress';
import type { Encounter, Party } from '#/lib/api';
import { useInventory, useSetEncounterAction, useUsePartyItem } from '#/lib/queries';

type ActionKey = Encounter['members'][number]['signatureAction']['key'];

export function CombatPanel({
	partyId,
	userId,
	party,
	encounter,
	readOnly = false,
}: {
	partyId: string;
	userId: string;
	party: Party;
	encounter: Encounter;
	readOnly?: boolean;
}) {
	const actionMutation = useSetEncounterAction(partyId);
	const itemMutation = useUsePartyItem(partyId);
	const inventoryQuery = useInventory();
	const currentMember = encounter.members.find((member) => member.userId === userId);
	const [actionKey, setActionKey] = useState<ActionKey | null>(null);
	const [targetEnemyId, setTargetEnemyId] = useState(() => encounter.enemies.find((enemy) => enemy.currentHealth > 0)?.id ?? '');
	const [targetUserId, setTargetUserId] = useState('');
	const [itemKey, setItemKey] = useState('');

	useEffect(() => {
		setActionKey(currentMember?.selectedActionKey ?? null);
	}, [currentMember?.selectedActionKey]);

	if (!currentMember) return <ErrorNotice message="Your traveler is not present in this encounter." />;
	if (inventoryQuery.isPending) return <LoadingState label="Checking your field kit…" />;
	if (inventoryQuery.isError)
		return (
			<ErrorNotice
				error={inventoryQuery.error}
				message={inventoryQuery.error.message}
				onRetry={() => void inventoryQuery.refetch()}
				retrying={inventoryQuery.isFetching}
				retryLabel="Retry field kit"
			/>
		);

	const signature = currentMember.signatureAction;
	const selectedAction = actionKey ? signature : null;
	const targetMode = selectedAction?.targetMode ?? 'enemy';
	const selectedTargetUserId = targetUserId || userId;
	const usableItems = inventoryQuery.data.items.filter((item) => item.quantity > 0);
	const actionError = actionMutation.error ?? itemMutation.error;
	const partyMemberName = (memberUserId: string) =>
		party.members.find((member) => member.userId === memberUserId)?.displayName ?? 'Traveler';

	const submitAction = () => {
		actionMutation.mutate({
			actionKey,
			targetEnemyId: targetMode === 'enemy' ? targetEnemyId || null : null,
			targetUserId: targetMode === 'ally' ? selectedTargetUserId : null,
		});
	};

	return (
		<div className="space-y-5">
			{readOnly && (
				<p role="status" className="rounded-xl bg-[var(--surface)] p-3 text-sm font-bold text-[var(--ink-soft)]">
					This expedition is no longer active. The encounter record is available to view, but new actions are closed.
				</p>
			)}
			{actionError && <ErrorNotice error={actionError} message={actionError.message} />}
			<Card>
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<Badge className="border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)]">
								Combat encounter
							</Badge>
							<CardTitle className="mt-4 text-3xl">Hold the line together.</CardTitle>
							<CardDescription>
								{encounter.status === 'completed'
									? 'This encounter has resolved. The record remains open for the party to read.'
									: 'Choose one action before the UTC day closes.'}
							</CardDescription>
						</div>
						<Swords className="size-7 text-[var(--gold-deep)]" />
					</div>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="grid gap-3 sm:grid-cols-2">
						{encounter.enemies.map((enemy) => {
							const selected = targetEnemyId === enemy.id;
							return (
								<button
									key={enemy.id}
									type="button"
									className="choice-card rounded-2xl p-4 text-left"
									data-selected={selected && targetMode === 'enemy'}
									aria-pressed={selected && targetMode === 'enemy'}
									disabled={readOnly || encounter.status === 'completed' || enemy.currentHealth === 0}
									onClick={() => setTargetEnemyId(enemy.id)}
								>
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="eyebrow">Enemy pressure {enemy.pressure}</p>
											<p className="mt-2 font-extrabold text-[var(--indigo)]">{enemy.displayName}</p>
										</div>
										{selected && targetMode === 'enemy' && <Check className="size-5 text-[var(--amethyst)]" />}
									</div>
									<div className="mt-4 flex items-center justify-between gap-3 text-xs font-mono text-[var(--ink-soft)]">
										<span>
											{enemy.currentHealth} / {enemy.maxHealth} health
										</span>
										<span>{enemy.currentHealth === 0 ? 'Defeated' : 'Standing'}</span>
									</div>
									<Progress value={(enemy.currentHealth / enemy.maxHealth) * 100} className="mt-2" />
								</button>
							);
						})}
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						{encounter.members.map((member) => {
							const selected = selectedTargetUserId === member.userId;
							return (
								<div key={member.userId} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<span className="grid size-9 place-items-center rounded-xl bg-[var(--teal)]/15 text-[var(--teal-deep)]">
												<HeartPulse className="size-4" />
											</span>
											<div>
												<p className="font-extrabold text-[var(--indigo)]">
													{partyMemberName(member.userId)}
													{member.userId === userId ? ' · you' : ''}
												</p>
												<p className="mt-1 text-xs capitalize text-[var(--ink-soft)]">{member.classKey}</p>
											</div>
										</div>
										<span className="font-mono text-xs text-[var(--ink-soft)]">
											{member.currentHealth} / {member.maxHealth}
										</span>
									</div>
									<Progress value={(member.currentHealth / member.maxHealth) * 100} className="mt-3" />
									{targetMode === 'ally' && (
										<Button
											variant={selected ? 'secondary' : 'ghost'}
											size="sm"
											className="mt-3"
											disabled={readOnly || encounter.status === 'completed'}
											onClick={() => setTargetUserId(member.userId)}
										>
											{selected ? 'Ally selected' : 'Select ally'}
										</Button>
									)}
								</div>
							);
						})}
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<button
							type="button"
							className="choice-card rounded-2xl p-4 text-left"
							data-selected={actionKey === null}
							aria-pressed={actionKey === null}
							disabled={readOnly || encounter.status === 'completed' || actionMutation.isPending}
							onClick={() => setActionKey(null)}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="eyebrow">Basic action</p>
									<p className="mt-2 font-extrabold text-[var(--indigo)]">Basic attack</p>
								</div>
								{actionKey === null && <Check className="size-5 text-[var(--amethyst)]" />}
							</div>
						</button>
						<button
							type="button"
							className="choice-card rounded-2xl p-4 text-left"
							data-selected={actionKey === signature.key}
							aria-pressed={actionKey === signature.key}
							disabled={readOnly || encounter.status === 'completed' || actionMutation.isPending}
							onClick={() => setActionKey(signature.key)}
						>
							<div className="flex items-center justify-between gap-3">
								<div>
									<p className="eyebrow">Class signature</p>
									<p className="mt-2 font-extrabold text-[var(--indigo)]">{signature.displayName}</p>
								</div>
								{actionKey === signature.key ? (
									<Check className="size-5 text-[var(--amethyst)]" />
								) : (
									<Shield className="size-5 text-[var(--gold-deep)]" />
								)}
							</div>
							<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{signature.description}</p>
						</button>
					</div>

					<Button disabled={readOnly || encounter.status === 'completed' || actionMutation.isPending} onClick={submitAction}>
						<Sparkles className="size-4" />{' '}
						{actionMutation.isPending ? 'Saving action…' : currentMember.selectedActionKey ? 'Update action' : 'Choose action'}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<Badge>Field kit</Badge>
					<CardTitle className="mt-3 text-2xl">Keep someone standing</CardTitle>
					<CardDescription>Use an owned item on a party member before the day resolves.</CardDescription>
				</CardHeader>
				<CardContent>
					{usableItems.length === 0 ? (
						<p className="text-sm text-[var(--ink-soft)]">No usable items are currently in your inventory.</p>
					) : (
						<div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
							<label className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
								Item
								<select
									className="mt-2 h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-3 text-sm font-bold normal-case tracking-normal text-[var(--indigo)]"
									value={itemKey || usableItems[0]?.key}
									disabled={readOnly}
									onChange={(event) => setItemKey(event.target.value)}
								>
									{usableItems.map((item) => (
										<option key={item.key} value={item.key}>
											{item.displayName} ×{item.quantity}
										</option>
									))}
								</select>
							</label>
							<label className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
								Target
								<select
									className="mt-2 h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-3 text-sm font-bold normal-case tracking-normal text-[var(--indigo)]"
									value={selectedTargetUserId}
									disabled={readOnly}
									onChange={(event) => setTargetUserId(event.target.value)}
								>
									{encounter.members.map((member) => (
										<option key={member.userId} value={member.userId}>
											{partyMemberName(member.userId)}
										</option>
									))}
								</select>
							</label>
							<Button
								disabled={readOnly || encounter.status === 'completed' || itemMutation.isPending}
								onClick={() => itemMutation.mutate({ itemKey: itemKey || usableItems[0]?.key || '', targetUserId: selectedTargetUserId })}
							>
								<HeartPulse className="size-4" /> {itemMutation.isPending ? 'Using…' : 'Use item'}
							</Button>
						</div>
					)}
					{itemMutation.data && (
						<p role="status" className="text-sm font-bold text-[var(--teal-deep)]">
							Restored {itemMutation.data.healedAmount} health for {partyMemberName(itemMutation.data.targetUserId)}.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
