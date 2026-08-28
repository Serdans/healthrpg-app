import { useState } from 'react';
import { CircleDot, Footprints, Shield, Shirt, Sword, UsersRound } from 'lucide-react';

import { EmptyState, ErrorNotice, SuccessNotice } from '#/components/app-state';
import { InventoryItemSprite } from '#/components/inventory/inventory-item-sprite';
import { InventoryItemUseDialog } from '#/components/inventory/inventory-item-use-dialog';
import { ConfirmActionDialog } from '#/components/ui/alert-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { LabelledSelect } from '#/components/ui/select-field';
import type { EquipmentSlot, Inventory, Loadout, PartyRoster } from '#/lib/api';
import { itemEffectLabel, itemKindLabel } from '#/lib/item-details';

const slots: EquipmentSlot[] = ['weapon', 'body', 'head', 'arm', 'boots', 'ring', 'shirt'];
const slotLabels: Record<EquipmentSlot, string> = {
	weapon: 'Weapon',
	body: 'Body',
	head: 'Head',
	arm: 'Arms',
	boots: 'Boots',
	ring: 'Ring',
	shirt: 'Shirt',
};

const slotGroups: { label: string; slots: EquipmentSlot[] }[] = [
	{ label: 'Weapons', slots: ['weapon'] },
	{ label: 'Protection', slots: ['body', 'head', 'arm'] },
	{ label: 'Travel gear', slots: ['boots', 'ring', 'shirt'] },
];

export type InventoryViewProps = {
	inventory: Inventory;
	loadout: Loadout;
	activeParties?: { id: string; name: string }[];
	selectedPartyId?: string | null;
	roster?: PartyRoster | null;
	partyLoading?: boolean;
	partyError?: Error | null;
	itemUsePending?: boolean;
	itemUseError?: Error | null;
	isBusy?: boolean;
	isUnequipPending?: boolean;
	error?: Error | null;
	status?: string | null;
	onEquip: (slot: EquipmentSlot, catalogKey: string) => void;
	onUnequip: (slot: EquipmentSlot) => void;
	onPartyChange?: (partyId: string) => void;
	onUseItem?: (itemKey: string, targetUserId: string) => void;
};

export function InventoryView({
	inventory,
	loadout,
	activeParties = [],
	selectedPartyId = null,
	roster = null,
	partyLoading = false,
	partyError = null,
	itemUsePending = false,
	itemUseError = null,
	isBusy = false,
	isUnequipPending = false,
	error = null,
	status = null,
	onEquip,
	onUnequip,
	onPartyChange,
	onUseItem,
}: InventoryViewProps) {
	const [unequipSlot, setUnequipSlot] = useState<EquipmentSlot | null>(null);
	const [useItemKey, setUseItemKey] = useState<string | null>(null);
	const useItem = inventory.items.find((item) => item.key === useItemKey) ?? null;
	const selectedParty = activeParties.find((party) => party.id === selectedPartyId) ?? activeParties.at(0) ?? null;
	const canUseItems = Boolean(onUseItem && selectedPartyId && roster && !partyLoading);
	const defense = Object.values(loadout).reduce((total, item) => total + modifierFor(item, 'defense'), 0);

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Traveler kit</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">What are you carrying?</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					Gold, useful supplies, and a few pieces of gear that make the next encounter feel possible.
				</p>
			</div>

			{error && <ErrorNotice error={error} message={error instanceof Error ? error.message : undefined} />}
			{itemUseError && <ErrorNotice error={itemUseError} message={itemUseError.message} />}
			{status && <SuccessNotice>{status}</SuccessNotice>}

			{activeParties.length > 0 && (
				<Card variant="game" tone="village">
					<CardHeader>
						<div className="flex items-start justify-between gap-3">
							<div>
								<Badge className="border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)] text-[var(--teal-deep)]">
									Party supplies
								</Badge>
								<CardTitle className="mt-3">Who needs a hand?</CardTitle>
								<CardDescription>Use restorative items on any traveler in an active expedition.</CardDescription>
							</div>
							<UsersRound className="size-6 text-[var(--gold)]" aria-hidden="true" />
						</div>
					</CardHeader>
					<CardContent>
						<LabelledSelect
							label="Active expedition"
							value={selectedParty?.id ?? null}
							options={activeParties.map((party) => ({ value: party.id, label: party.name }))}
							onChange={(partyId) => onPartyChange?.(partyId)}
						/>
						{partyError && <ErrorNotice error={partyError} message={partyError.message} />}
						{partyLoading ? (
							<p className="text-sm font-bold text-[var(--ink-soft)]">Calling up the party roster…</p>
						) : roster ? (
							<p className="text-sm font-bold text-[var(--ink-soft)]">
								{roster.members.length} traveler{roster.members.length === 1 ? '' : 's'} ready to receive supplies.
							</p>
						) : (
							<p className="text-sm font-bold text-[var(--ink-soft)]">Choose an active expedition to use supplies.</p>
						)}
					</CardContent>
				</Card>
			)}
			{activeParties.length === 0 && onUseItem && inventory.items.length > 0 && (
				<Card variant="game" tone="history">
					<CardHeader>
						<Badge>No active expedition</Badge>
						<CardTitle className="mt-3">Your supplies are safe for now.</CardTitle>
						<CardDescription>Join or create an active expedition to use restorative items on a traveler.</CardDescription>
					</CardHeader>
				</Card>
			)}

			<section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
				<Card>
					<CardHeader>
						<Badge>Current loadout</Badge>
						<CardTitle className="mt-3">Ready for the trail</CardTitle>
						<CardDescription>Your equipped gear, organized by combat slot.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.65fr)]">
							<div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4">
								<p className="eyebrow">Physical defense</p>
								<p className="mt-2 font-mono text-3xl font-bold text-[var(--indigo)]">{defense}</p>
								<p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">Reduces incoming enemy attacks.</p>
							</div>
							<div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
								<p className="eyebrow">Loadout</p>
								<p className="mt-2 font-extrabold text-[var(--indigo)]">
									{slots.filter((slot) => loadout[slot]).length} / {slots.length} slots filled
								</p>
							</div>
						</div>
						{slotGroups.map((group) => (
							<section key={group.label} className="mb-5 last:mb-0">
								<p className="eyebrow mb-2">{group.label}</p>
								<div className="grid gap-3 sm:grid-cols-2">
									{group.slots.map((slot) => {
										const equipped = loadout[slot];
										return (
											<div key={slot} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
												<div className="flex items-center justify-between gap-3">
													<div className="flex items-center gap-3">
														{equipped ? (
															<InventoryItemSprite itemKey={equipped.key} kind="equipment" size="md" />
														) : (
															<span className="grid size-10 place-items-center rounded-xl bg-[var(--indigo)] text-[var(--gold)]">
																<SlotIcon slot={slot} />
															</span>
														)}
														<div>
															<p className="eyebrow">{slotLabels[slot]}</p>
															<p className="mt-1 font-extrabold text-[var(--indigo)]">{equipped?.displayName ?? 'Empty slot'}</p>
															{equipped && <ItemDetailLine item={equipped} />}
														</div>
													</div>
													{equipped && (
														<Button variant="ghost" size="sm" disabled={isBusy} onClick={() => setUnequipSlot(slot)}>
															Unequip
														</Button>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</section>
						))}
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
						<div className="flex flex-wrap gap-3">
							{inventory.currencies.map((item) => (
								<div key={item.key} className="w-fit max-w-full rounded-2xl bg-[var(--gold-wash)] p-4">
									<div className="flex items-center gap-3">
										<InventoryItemSprite itemKey={item.key} kind={item.kind} size="lg" className="bg-[var(--gold-wash)]" />
										<div className="min-w-0">
											<p className="eyebrow">Currency</p>
											<p className="mt-2 text-lg font-extrabold text-[var(--indigo)]">{item.displayName}</p>
											<p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{item.details.description}</p>
										</div>
									</div>
									<p className="mt-1 font-mono text-2xl text-[var(--gold-deep)]">{item.quantity}</p>
								</div>
							))}
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
							{[...inventory.items, ...inventory.equipment].map((item) => {
								const equipmentSlot =
									item.kind === 'equipment' && isEquipmentSlot(item.details.equipmentSlot) ? item.details.equipmentSlot : null;
								const isEquipped = equipmentSlot !== null && loadout[equipmentSlot]?.key === item.key;
								const usableOutsideCombat = item.kind === 'item' && item.details.effect?.kind === 'heal';

								return (
									<div key={item.key} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<InventoryItemSprite itemKey={item.key} kind={item.kind} size="sm" className="bg-[var(--amethyst-wash)]" />
												<div className="min-w-0">
													<p className="eyebrow">{itemKindLabel(item.kind)}</p>
													<p className="truncate font-bold text-[var(--indigo)]">{item.displayName}</p>
												</div>
											</div>
											<span className="shrink-0 font-mono text-sm text-[var(--ink-soft)]">×{item.quantity}</span>
										</div>
										<p className="mt-3 text-xs leading-5 text-[var(--ink-soft)]">{item.details.description}</p>
										<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
											{itemEffectLabel(item.details) ? (
												<span className="rounded-full bg-[var(--gold-wash)] px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[var(--gold-deep)]">
													{itemEffectLabel(item.details)}
												</span>
											) : (
												<span />
											)}
											{equipmentSlot && (
												<Button
													size="sm"
													variant="secondary"
													disabled={isBusy || isEquipped}
													onClick={() => onEquip(equipmentSlot, item.key)}
												>
													{isEquipped ? 'Equipped' : 'Equip'}
												</Button>
											)}
											{item.kind === 'item' && onUseItem && usableOutsideCombat && (
												<Button
													size="sm"
													variant="secondary"
													disabled={!canUseItems || itemUsePending}
													onClick={() => setUseItemKey(item.key)}
												>
													Use on traveler
												</Button>
											)}
											{item.kind === 'item' && !usableOutsideCombat && (
												<span className="text-xs font-bold text-[var(--ink-soft)]">Combat only</span>
											)}
										</div>
									</div>
								);
							})}
						</div>

						{inventory.items.length === 0 && inventory.equipment.length === 0 && (
							<EmptyState title="The satchel is light." copy="Complete events and visit villages to find useful things." />
						)}
					</CardContent>
				</Card>
			</section>
			<ConfirmActionDialog
				open={unequipSlot !== null}
				onOpenChange={(open) => {
					if (!open) setUnequipSlot(null);
				}}
				title={`Unequip ${unequipSlot ? slotLabels[unequipSlot].toLowerCase() : 'this item'}?`}
				description="The item will return to your inventory and no longer affect your current loadout."
				confirmLabel="Unequip"
				pending={isUnequipPending}
				onConfirm={() => {
					if (unequipSlot) onUnequip(unequipSlot);
				}}
			/>
			<InventoryItemUseDialog
				open={useItem !== null}
				item={useItem}
				roster={roster}
				pending={itemUsePending}
				onOpenChange={(open) => {
					if (!open) setUseItemKey(null);
				}}
				onConfirm={(targetUserId) => {
					if (useItem) onUseItem?.(useItem.key, targetUserId);
				}}
			/>
		</div>
	);
}

function ItemDetailLine({ item }: { item: Loadout[EquipmentSlot] }) {
	if (!item) return null;
	const effect = itemEffectLabel(item.details);
	return (
		<p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
			{effect ? `${effect} · ` : ''}
			{item.details.description}
		</p>
	);
}

function isEquipmentSlot(value: string | null): value is EquipmentSlot {
	return value !== null && slots.some((slot) => slot === value);
}

function modifierFor(item: Loadout[EquipmentSlot], key: 'defense') {
	const effect = item?.details.effect;
	return effect?.kind === 'stat-modifiers' ? (effect.modifiers[key] ?? 0) : 0;
}

function SlotIcon({ slot }: { slot: EquipmentSlot }) {
	if (slot === 'weapon') return <Sword className="size-5" />;
	if (slot === 'boots') return <Footprints className="size-5" />;
	if (slot === 'ring') return <CircleDot className="size-5" />;
	if (slot === 'shirt') return <Shirt className="size-5" />;
	return <Shield className="size-5" />;
}
