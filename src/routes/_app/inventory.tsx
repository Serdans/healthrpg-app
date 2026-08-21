import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { InventoryView } from '#/components/inventory/inventory-view';
import type { EquipmentSlot } from '#/lib/api';
import { useEquipLoadout, useInventory, useLoadout, useUnequipLoadout } from '#/lib/queries';

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
	const equipMutation = useEquipLoadout();
	const unequipMutation = useUnequipLoadout();
	const [status, setStatus] = useState<string | null>(null);

	if (inventoryQuery.isPending || loadoutQuery.isPending) return <LoadingState label="Opening your satchel…" />;
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

	const inventory = inventoryQuery.data;
	const loadout = loadoutQuery.data;
	const mutationError = equipMutation.error ?? unequipMutation.error;
	const loadoutBusy = equipMutation.isPending || unequipMutation.isPending;

	return (
		<InventoryView
			inventory={inventory}
			loadout={loadout}
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
		/>
	);
}
