export type CombatCommandState = 'active' | 'edited' | 'saving' | 'saved' | 'resolved' | 'readonly';

export function combatCommandState({
	readOnly,
	encounterCompleted,
	actionPending,
	actionSuccess,
	commandDirty,
}: {
	readOnly: boolean;
	encounterCompleted: boolean;
	actionPending: boolean;
	actionSuccess: boolean;
	commandDirty: boolean;
}): CombatCommandState {
	if (readOnly) return 'readonly';
	if (encounterCompleted) return 'resolved';
	if (actionPending) return 'saving';
	if (commandDirty) return 'edited';
	if (actionSuccess) return 'saved';
	return 'active';
}
