import { useState } from 'react';
import { Coins, DoorOpen, ShoppingBag, Sparkles } from 'lucide-react';

import { ErrorNotice } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { FieldError } from '#/components/ui/field-error';
import type { Village } from '#/lib/api';
import { formatDateTime, formatTimeRemaining } from '#/lib/dates';
import { usePurchaseVillage, useStartVillageDeparture } from '#/lib/queries';
import { purchaseQuantitySchema } from '#/lib/validation';

export function VillagePanel({
	partyId,
	village,
	departureOpen,
	timeZone,
	readOnly = false,
}: {
	partyId: string;
	village: Village;
	departureOpen: boolean;
	timeZone: string;
	readOnly?: boolean;
}) {
	const purchaseMutation = usePurchaseVillage(partyId);
	const departureMutation = useStartVillageDeparture(partyId);
	const [quantities, setQuantities] = useState<Record<string, string>>({});
	const [quantityErrors, setQuantityErrors] = useState<Record<string, string | undefined>>({});

	const mutationError = purchaseMutation.error ?? departureMutation.error;
	const villageBusy = purchaseMutation.isPending || departureMutation.isPending;
	const setQuantity = (key: string, value: string) => {
		setQuantities((current) => ({ ...current, [key]: value }));
		setQuantityErrors((current) => ({ ...current, [key]: undefined }));
	};

	return (
		<div className="space-y-5">
			{readOnly && (
				<p role="status" className="rounded-xl bg-[var(--surface)] p-3 text-sm font-bold text-[var(--ink-soft)]">
					This expedition is no longer active. Village details are available to view, but purchases and departure are closed.
				</p>
			)}
			{mutationError && <ErrorNotice error={mutationError} message={mutationError.message} />}
			<Card variant="game" tone="village">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<Badge className="border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[var(--teal)]/10 text-[var(--teal-deep)]">
								Village
							</Badge>
							<CardTitle className="mt-4 text-3xl">{village.settlement.displayName}</CardTitle>
							<CardDescription>{village.settlement.description}</CardDescription>
						</div>
						<span className="grid size-12 place-items-center rounded-2xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">
							<ShoppingBag className="size-6" />
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--gold-wash)] p-4">
						<div className="flex items-center gap-3">
							<Coins className="size-5 text-[var(--gold-deep)]" />
							<div>
								<p className="eyebrow">Your balance</p>
								<p className="mt-1 font-extrabold text-[var(--indigo)]">{village.currency.displayName}</p>
							</div>
						</div>
						<span className="font-mono text-2xl text-[var(--gold-deep)]">{village.currency.balance}</span>
					</div>
					{purchaseMutation.data && (
						<p role="status" className="rounded-xl bg-[var(--teal)]/10 p-3 text-sm font-bold text-[var(--teal-deep)]">
							Bought {purchaseMutation.data.quantity} × {purchaseMutation.data.displayName} for {purchaseMutation.data.totalPrice}{' '}
							{purchaseMutation.data.currency.key}. Remaining balance: {purchaseMutation.data.currency.remainingBalance}.
						</p>
					)}

					<div className="grid gap-3 md:grid-cols-2">
						{village.offers.map((offer) => {
							const quantityInput = quantities[offer.key] ?? '1';
							const quantityResult = purchaseQuantitySchema.safeParse(quantityInput);
							const quantity = quantityResult.success ? quantityResult.data : 1;
							const quantityError = quantityErrors[offer.key];
							const quantityErrorId = `${offer.key}-quantity-error`;
							return (
								<div key={offer.key} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="eyebrow">{offer.kind}</p>
											<p className="mt-2 font-extrabold text-[var(--indigo)]">{offer.displayName}</p>
											<p className="mt-1 text-xs text-[var(--ink-soft)]">Owned: {offer.ownedQuantity}</p>
										</div>
										<Sparkles className="size-5 text-[var(--amethyst)]" />
									</div>
									<div className="mt-4 flex items-end gap-3">
										<label className="block flex-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
											Quantity
											<input
												className="mt-2 h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-3 font-mono text-[var(--indigo)] outline-none focus:border-[var(--gold)]"
												type="number"
												min={1}
												max={offer.kind === 'equipment' ? 1 : 99}
												disabled={readOnly}
												value={quantityInput}
												aria-invalid={Boolean(quantityError)}
												aria-describedby={quantityError ? quantityErrorId : undefined}
												onChange={(event) => setQuantity(offer.key, event.target.value)}
											/>
											<FieldError id={quantityErrorId} errors={quantityError ? [quantityError] : []} />
										</label>
										<div className="pb-1 text-right">
											<p className="font-mono text-sm text-[var(--gold-deep)]">{offer.unitPrice} each</p>
											<p className="mt-1 text-xs text-[var(--ink-soft)]">{offer.unitPrice * quantity} total</p>
										</div>
									</div>
									<Button
										game
										className="mt-3 w-full"
										disabled={readOnly || villageBusy}
										onClick={() => {
											if (!quantityResult.success) {
												setQuantityErrors((current) => ({
													...current,
													[offer.key]: quantityResult.error.issues[0]?.message ?? 'Enter a valid quantity.',
												}));
												return;
											}
											if (offer.kind === 'equipment' && quantityResult.data !== 1) {
												setQuantityErrors((current) => ({ ...current, [offer.key]: 'Equipment can only be purchased one at a time.' }));
												return;
											}
											purchaseMutation.mutate({ catalogKey: offer.key, quantity: quantityResult.data });
										}}
									>
										{purchaseMutation.isPending ? 'Purchasing…' : 'Purchase'}
									</Button>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			<Card variant="game" tone="village">
				<CardHeader>
					<Badge>Departure</Badge>
					<CardTitle className="mt-3 text-2xl">Choose the road out</CardTitle>
					<CardDescription>When the party is ready, start a vote for the next route beyond the village.</CardDescription>
				</CardHeader>
				<CardContent>
					<Button game disabled={readOnly || departureOpen || villageBusy} onClick={() => departureMutation.mutate()}>
						<DoorOpen className="size-4" />
						{departureMutation.isPending ? 'Opening the route…' : departureOpen ? 'Departure vote open' : 'Start departure vote'}
					</Button>
					{departureMutation.data && (
						<div role="status" className="mt-3 rounded-xl bg-[var(--teal)]/10 p-3 text-sm text-[var(--teal-deep)]">
							<p className="font-bold">Departure vote opened. The party can now choose its next branch.</p>
							<p className="mt-1 text-xs">
								{departureMutation.data.votes.length} vote{departureMutation.data.votes.length === 1 ? '' : 's'} ·{' '}
								{formatTimeRemaining(departureMutation.data.deadlineAt)} · closes{' '}
								{formatDateTime(departureMutation.data.deadlineAt, timeZone)}
							</p>
						</div>
					)}
					{departureOpen && !departureMutation.data && (
						<p className="mt-3 text-sm font-bold text-[var(--teal-deep)]">Departure vote is open. Choose a route below.</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
