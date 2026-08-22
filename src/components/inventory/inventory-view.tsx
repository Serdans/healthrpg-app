import { useState } from 'react';
import { Shield, Sparkles, Sword, UsersRound } from 'lucide-react';

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

const slots: EquipmentSlot[] = ['weapon', 'armor', 'accessory'];
const slotLabels: Record<EquipmentSlot, string> = {
	weapon: 'Weapon',
	armor: 'Armor',
	accessory: 'Accessory',
};

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
	const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot>('weapon');
	const [unequipSlot, setUnequipSlot] = useState<EquipmentSlot | null>(null);
	const [useItemKey, setUseItemKey] = useState<string | null>(null);
	const useItem = inventory.items.find((item) => item.key === useItemKey) ?? null;
	const canUseItems = Boolean(onUseItem && selectedPartyId && roster && !partyLoading);

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
							value={selectedPartyId ?? activeParties.at(0)?.id ?? ''}
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
						<CardDescription>Equip owned gear into its matching combat slot.</CardDescription>
					</CardHeader>
					<CardContent>
						{slots.map((slot) => {
							const equipped = loadout[slot];
							return (
								<div key={slot} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											{equipped ? (
												<InventoryItemSprite itemKey={equipped.key} kind="equipment" size="md" />
											) : (
												<span className="grid size-10 place-items-center rounded-xl bg-[var(--indigo)] text-[var(--gold)]">
													{slot === 'weapon' ? (
														<Sword className="size-5" />
													) : slot === 'armor' ? (
														<Shield className="size-5" />
													) : (
														<Sparkles className="size-5" />
													)}
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
							{[...inventory.items, ...inventory.equipment].map((item) => (
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
										{item.kind === 'item' && onUseItem && (
											<Button
												size="sm"
												variant="secondary"
												disabled={!canUseItems || itemUsePending}
												onClick={() => setUseItemKey(item.key)}
											>
												Use on traveler
											</Button>
										)}
									</div>
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
										<Button key={item.key} size="sm" disabled={isBusy} onClick={() => onEquip(selectedSlot, item.key)}>
											<InventoryItemSprite itemKey={item.key} kind={item.kind} size="xs" className="bg-[var(--indigo-light)]" />
											Equip {item.displayName}
										</Button>
									))}
								</div>
							</div>
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

function isEquipmentSlot(value: string): value is EquipmentSlot {
	return slots.some((slot) => slot === value);
}
