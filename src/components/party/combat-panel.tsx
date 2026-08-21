import { useState } from 'react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { BattleScene } from '#/components/party/battle-scene';
import type { DailyProgress, Encounter, Party } from '#/lib/api';
import { useInventory, useSetEncounterAction, useUsePartyItem } from '#/lib/queries';

type ActionKey = Encounter['members'][number]['signatureAction']['key'];

export function CombatPanel({
	partyId,
	userId,
	party,
	daily,
	encounter,
	readOnly = false,
}: {
	partyId: string;
	userId: string;
	party: Party;
	daily?: DailyProgress;
	encounter: Encounter;
	readOnly?: boolean;
}) {
	const actionMutation = useSetEncounterAction(partyId);
	const itemMutation = useUsePartyItem(partyId);
	const inventoryQuery = useInventory();
	const currentMember = encounter.members.find((member) => member.userId === userId);
	const [actionKeyOverride, setActionKeyOverride] = useState<ActionKey | null | undefined>(undefined);
	const [targetEnemyOverride, setTargetEnemyOverride] = useState<string | undefined>(undefined);
	const [actionTargetUserOverride, setActionTargetUserOverride] = useState<string | undefined>(undefined);
	const [itemTargetUserOverride, setItemTargetUserOverride] = useState<string | undefined>(undefined);
	const [itemKey, setItemKey] = useState('');

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

	const standingEnemies = encounter.enemies.filter((enemy) => enemy.currentHealth > 0);
	const actionKey = actionKeyOverride === undefined ? currentMember.selectedActionKey : actionKeyOverride;
	const targetEnemyId =
		targetEnemyOverride && standingEnemies.some((enemy) => enemy.id === targetEnemyOverride)
			? targetEnemyOverride
			: currentMember.targetEnemyId && standingEnemies.some((enemy) => enemy.id === currentMember.targetEnemyId)
				? currentMember.targetEnemyId
				: (standingEnemies[0]?.id ?? '');
	const selectedAction = actionKey ? currentMember.signatureAction : null;
	const targetMode = selectedAction?.targetMode ?? 'enemy';
	const selectedActionTargetUserId = actionTargetUserOverride ?? currentMember.targetUserId ?? userId;
	const selectedItemTargetUserId = itemTargetUserOverride ?? userId;
	const usableItems = inventoryQuery.data.items.filter((item) => item.quantity > 0);
	const actionError = actionMutation.error ?? itemMutation.error;
	const combatBusy = actionMutation.isPending || itemMutation.isPending;
	const partyMemberName = (memberUserId: string) =>
		party.members.find((member) => member.userId === memberUserId)?.displayName ?? 'Traveler';

	const submitAction = () => {
		actionMutation.mutate({
			actionKey,
			targetEnemyId: targetMode === 'enemy' ? targetEnemyId || null : null,
			targetUserId: targetMode === 'ally' ? selectedActionTargetUserId : null,
		});
	};

	return (
		<BattleScene
			encounter={encounter}
			currentMember={currentMember}
			daily={daily}
			userId={userId}
			readOnly={readOnly}
			actionKey={actionKey}
			targetEnemyId={targetEnemyId}
			selectedActionTargetUserId={selectedActionTargetUserId}
			selectedItemTargetUserId={selectedItemTargetUserId}
			targetMode={targetMode}
			usableItems={usableItems}
			itemKey={itemKey}
			actionPending={actionMutation.isPending}
			itemPending={itemMutation.isPending}
			actionBusy={combatBusy}
			actionError={actionError}
			actionSuccess={actionMutation.isSuccess}
			itemResult={itemMutation.data}
			partyMemberName={partyMemberName}
			onActionKeyChange={(nextActionKey) => setActionKeyOverride(nextActionKey)}
			onEnemySelect={(enemyId) => setTargetEnemyOverride(enemyId)}
			onAllySelect={(memberUserId) => setActionTargetUserOverride(memberUserId)}
			onItemKeyChange={setItemKey}
			onItemTargetChange={(memberUserId) => setItemTargetUserOverride(memberUserId)}
			onSubmitAction={submitAction}
			onUseItem={() =>
				itemMutation.mutate({
					itemKey: itemKey || usableItems[0]?.key || '',
					targetUserId: selectedItemTargetUserId,
				})
			}
		/>
	);
}
