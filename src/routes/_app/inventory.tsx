import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { InventoryView } from '#/components/inventory/inventory-view';
import type { EquipmentSlot } from '#/lib/api';
import { useEquipLoadout, useInventory, useLoadout, useParties, usePartyRoster, useUnequipLoadout, useUsePartyItem } from '#/lib/queries';

export const Route = createFileRoute('/_app/inventory')({
	head: () => ({ meta: [{ title: 'Kit · HealthRPG' }] }),
	component: InventoryPage,
});

const slotLabels: Record<EquipmentSlot, string> = {
	weapon: 'Weapon',
	armor: 'Armor',
	accessory: 'Accessory',
};

function InventoryPage() {
	const inventoryQuery = useInventory();
	const loadoutQuery = useLoadout();
	const partiesQuery = useParties();
	const equipMutation = useEquipLoadout();
	const unequipMutation = useUnequipLoadout();
	const activeParties = partiesQuery.data?.filter((party) => party.status === 'active') ?? [];
	const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
	const activeParty = activeParties.find((party) => party.id === selectedPartyId) ?? activeParties.at(0);
	const activePartyId = activeParty?.id ?? '';
	const rosterQuery = usePartyRoster(activePartyId, Boolean(activePartyId));
	const itemUseMutation = useUsePartyItem(activePartyId);
	const [status, setStatus] = useState<string | null>(null);

	if (inventoryQuery.isPending || loadoutQuery.isPending || partiesQuery.isPending) return <LoadingState label="Opening your satchel…" />;
	if (inventoryQuery.isError)
		return (
			<ErrorNotice
				error={inventoryQuery.error}
				message={inventoryQuery.error.message}
				onRetry={() => void inventoryQuery.refetch()}
				retrying={inventoryQuery.isFetching}
				retryLabel="Retry inventory"
			/>
		);
	if (loadoutQuery.isError)
		return (
			<ErrorNotice
				error={loadoutQuery.error}
				message={loadoutQuery.error.message}
				onRetry={() => void loadoutQuery.refetch()}
				retrying={loadoutQuery.isFetching}
				retryLabel="Retry loadout"
			/>
		);
	if (partiesQuery.isError)
		return (
			<ErrorNotice
				error={partiesQuery.error}
				message={partiesQuery.error.message}
				onRetry={() => void partiesQuery.refetch()}
				retrying={partiesQuery.isFetching}
				retryLabel="Retry expeditions"
			/>
		);

	const inventory = inventoryQuery.data;
	const loadout = loadoutQuery.data;
	const mutationError = equipMutation.error ?? unequipMutation.error;
	const loadoutBusy = equipMutation.isPending || unequipMutation.isPending;

	return (
		<InventoryView
			inventory={inventory}
			loadout={loadout}
			activeParties={activeParties.map((party) => ({ id: party.id, name: party.name }))}
			selectedPartyId={activePartyId || null}
			roster={rosterQuery.data ?? null}
			partyLoading={rosterQuery.isPending}
			partyError={rosterQuery.error}
			itemUsePending={itemUseMutation.isPending}
			itemUseError={itemUseMutation.error}
			isBusy={loadoutBusy}
			isUnequipPending={unequipMutation.isPending}
			error={mutationError}
			status={status}
			onEquip={(slot, catalogKey) => {
				const item = inventory.equipment.find((entry) => entry.key === catalogKey);
				setStatus(null);
				equipMutation.mutate(
					{ slot, catalogKey },
					{
						onSuccess: () => setStatus(`${item?.displayName ?? catalogKey} equipped as ${slotLabels[slot]}.`),
					},
				);
			}}
			onUnequip={(slot) => {
				setStatus(null);
				unequipMutation.mutate(slot, {
					onSuccess: () => setStatus(`${slotLabels[slot]} unequipped.`),
				});
			}}
			onPartyChange={setSelectedPartyId}
			onUseItem={(itemKey, targetUserId) => {
				const item = inventory.items.find((entry) => entry.key === itemKey);
				const target = rosterQuery.data?.members.find((member) => member.userId === targetUserId);
				setStatus(null);
				itemUseMutation.mutate(
					{ itemKey, targetUserId },
					{
						onSuccess: (result) => {
							const targetName = target?.character?.name ?? target?.displayName ?? 'your traveler';
							setStatus(
								`${item?.displayName ?? itemKey} used on ${targetName}${result.healedAmount > 0 ? `, restoring ${result.healedAmount} HP.` : '.'}`,
							);
						},
					},
				);
			}}
		/>
	);
}
