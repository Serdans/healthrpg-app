import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Backpack, Shield, Sparkles, Sword } from 'lucide-react';

import { ErrorNotice, EmptyState, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { LabelledSelect } from '#/components/ui/select-field';
import type { EquipmentSlot } from '#/lib/api';
import { useEquipLoadout, useInventory, useLoadout, useUnequipLoadout } from '#/lib/queries';

export const Route = createFileRoute('/_app/inventory')({ component: InventoryPage });

const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
const slotLabels: Record<EquipmentSlot, string> = {
	weapon: 'Weapon',
	armor: 'Armor',
	accessory: 'Accessory',
};

function InventoryPage() {
	const inventoryQuery = useInventory();
	const loadoutQuery = useLoadout();
	const equipMutation = useEquipLoadout();
	const unequipMutation = useUnequipLoadout();
	const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('weapon');

	if (inventoryQuery.isPending || loadoutQuery.isPending) return <LoadingState label="Opening your satchel…" />;
	if (inventoryQuery.isError)
		return (
			<ErrorNotice message={inventoryQuery.error.message} onRetry={() => void inventoryQuery.refetch()} retryLabel="Retry inventory" />
		);
	if (loadoutQuery.isError)
		return <ErrorNotice message={loadoutQuery.error.message} onRetry={() => void loadoutQuery.refetch()} retryLabel="Retry loadout" />;

	const inventory = inventoryQuery.data;
	const loadout = loadoutQuery.data;
	const mutationError = equipMutation.error ?? unequipMutation.error;

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Traveler kit</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">What are you carrying?</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					Gold, useful supplies, and a few pieces of gear that make the next encounter feel possible.
				</p>
			</div>

			{mutationError && <ErrorNotice message={mutationError.message} />}

			<section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
				<Card>
					<CardHeader>
						<Badge>Current loadout</Badge>
						<CardTitle className="mt-3">Ready for the trail</CardTitle>
						<CardDescription>Equip owned gear into its matching combat slot.</CardDescription>
					</CardHeader>
					<CardContent>
						{slots.map((slot) => {
							const equipped = loadout[slot];
							return (
								<div key={slot} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<span className="grid size-10 place-items-center rounded-xl bg-[var(--indigo)] text-[var(--gold)]">
												{slot === 'weapon' ? (
													<Sword className="size-5" />
												) : slot === 'armor' ? (
													<Shield className="size-5" />
												) : (
													<Sparkles className="size-5" />
												)}
											</span>
											<div>
												<p className="eyebrow">{slotLabels[slot]}</p>
												<p className="mt-1 font-extrabold text-[var(--indigo)]">{equipped?.displayName ?? 'Empty slot'}</p>
											</div>
										</div>
										{equipped && (
											<Button variant="ghost" size="sm" disabled={unequipMutation.isPending} onClick={() => unequipMutation.mutate(slot)}>
												Unequip
											</Button>
										)}
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<Badge className="border-[color-mix(in_srgb,var(--amethyst)_30%,transparent)] bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
							Inventory
						</Badge>
						<CardTitle className="mt-3">The satchel</CardTitle>
						<CardDescription>Items earned from events and purchased in villages appear here.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid gap-3 sm:grid-cols-3">
							{inventory.currencies.map((item) => (
								<div key={item.key} className="rounded-2xl bg-[var(--gold-wash)] p-4">
									<p className="eyebrow">Currency</p>
									<p className="mt-2 text-lg font-extrabold text-[var(--indigo)]">{item.displayName}</p>
									<p className="mt-1 font-mono text-2xl text-[var(--gold-deep)]">{item.quantity}</p>
								</div>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							{[...inventory.items, ...inventory.equipment].map((item) => (
								<div
									key={item.key}
									className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
								>
									<div className="flex min-w-0 items-center gap-3">
										<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
											<Backpack className="size-4" />
										</span>
										<span className="truncate font-bold text-[var(--indigo)]">{item.displayName}</span>
									</div>
									<span className="font-mono text-sm text-[var(--ink-soft)]">×{item.quantity}</span>
								</div>
							))}
						</div>

						{inventory.items.length === 0 && inventory.equipment.length === 0 && (
							<EmptyState title="The satchel is light." copy="Complete events and visit villages to find useful things." />
						)}

						{inventory.equipment.length > 0 && (
							<div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4">
								<LabelledSelect
									label="Equip an item"
									value={selectedSlot}
									options={slots.map((slot) => ({ value: slot, label: slotLabels[slot] }))}
									onChange={(value) => {
										if (isEquipmentSlot(value)) setSelectedSlot(value);
									}}
								/>
								<div className="mt-3 flex flex-wrap gap-2">
									{inventory.equipment.map((item) => (
										<Button
											key={item.key}
											size="sm"
											disabled={equipMutation.isPending}
											onClick={() => equipMutation.mutate({ slot: selectedSlot, catalogKey: item.key })}
										>
											Equip {item.displayName}
										</Button>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}

function isEquipmentSlot(value: string): value is EquipmentSlot {
	return slots.some((slot) => slot === value);
}
