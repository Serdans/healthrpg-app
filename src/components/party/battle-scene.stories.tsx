import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import type { DailyProgress, Encounter, Inventory, Party, PartyItemUse } from '#/lib/api';

import { BattleScene } from './battle-scene';

const party: Party = {
	id: 'party-1',
	name: 'Lantern Walkers',
	status: 'active',
	memberCapacity: 6,
	currentNode: {
		id: 'node-1',
		chapterNo: 1,
		regionNo: 1,
		name: 'Mossway Crossing',
		nodeType: 'combat',
		templateKey: 'combat-v1',
		config: { movementCost: 10, challengeCost: 0, event: { eventType: 'combat' } },
	},
	challengeProgress: 12,
	decisionStartedAt: '2026-08-20T00:00:00.000Z',
	members: [
		{ userId: 'user-1', role: 'leader', displayName: 'Hero' },
		{ userId: 'user-2', role: 'member', displayName: 'Mira' },
		{ userId: 'user-3', role: 'member', displayName: 'Rook' },
	],
};

const activeEncounter: Encounter = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	status: 'active',
	enemies: [
		{ id: 'enemy-1', archetypeKey: 'moss-wolf', displayName: 'Moss Wolf', maxHealth: 30, currentHealth: 30, pressure: 2 },
		{ id: 'enemy-2', archetypeKey: 'moss-wolf', displayName: 'Moss Wolf Alpha', maxHealth: 42, currentHealth: 23, pressure: 4 },
	],
	members: [
		{
			userId: 'user-1',
			currentHealth: 20,
			maxHealth: 20,
			classKey: 'warrior',
			signatureAction: {
				key: 'shield-wall',
				displayName: 'Shield Wall',
				description: 'Guard the party from incoming pressure.',
				targetMode: 'enemy',
			},
			selectedActionKey: null,
			actionMode: 'basic',
			targetEnemyId: null,
			targetUserId: null,
			targetMode: 'none',
		},
		{
			userId: 'user-2',
			currentHealth: 18,
			maxHealth: 20,
			classKey: 'cleric',
			signatureAction: { key: 'mend', displayName: 'Mend', description: 'Restore health to an ally.', targetMode: 'ally' },
			selectedActionKey: 'mend',
			actionMode: 'ability',
			targetEnemyId: null,
			targetUserId: 'user-1',
			targetMode: 'manual',
		},
		{
			userId: 'user-3',
			currentHealth: 12,
			maxHealth: 24,
			classKey: 'rogue',
			signatureAction: {
				key: 'ambush',
				displayName: 'Ambush',
				description: 'Slip behind a foe and strike where it is weakest.',
				targetMode: 'enemy',
			},
			selectedActionKey: null,
			actionMode: 'basic',
			targetEnemyId: null,
			targetUserId: null,
			targetMode: 'none',
		},
	],
};

const daily: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	movementUnits: 8,
	movementCost: 10,
	movementSatisfied: false,
	recoveryPoints: 4,
	challengeContribution: 0,
	challengeProgress: 0,
	challengeCost: 0,
	challengeCleared: true,
	status: 'provisional',
	members: [
		{ userId: 'user-1', movementUnits: 8, recoveryPoints: 4, status: 'provisional' },
		{ userId: 'user-2', movementUnits: 6, recoveryPoints: 3, status: 'provisional' },
		{ userId: 'user-3', movementUnits: 0, recoveryPoints: 2, status: 'provisional' },
	],
};

const completedEncounter: Encounter = {
	...activeEncounter,
	status: 'completed',
	enemies: activeEncounter.enemies.map((enemy, index) => ({ ...enemy, currentHealth: index === 0 ? 0 : enemy.currentHealth })),
};

const noStandingFoeEncounter: Encounter = {
	...activeEncounter,
	enemies: activeEncounter.enemies.map((enemy) => ({ ...enemy, currentHealth: 0 })),
};

const inventory: Inventory = {
	currencies: [{ key: 'gold', kind: 'currency', displayName: 'Gold', quantity: 120 }],
	items: [{ key: 'field-herb', kind: 'item', displayName: 'Field Herb', quantity: 2 }],
	equipment: [{ key: 'trail-blade', kind: 'equipment', displayName: 'Trail Blade', quantity: 1 }],
};

type ActionKey = Encounter['members'][number]['signatureAction']['key'];

interface BattlePreviewProps {
	encounter?: Encounter;
	userId?: string;
	initialActionKey?: ActionKey | null;
	initialActionTargetUserId?: string;
	initialItemTargetUserId?: string;
	initialActionSaved?: boolean;
	readOnly?: boolean;
	usableItems?: Inventory['items'];
	actionErrorMessage?: string;
}

function BattlePreview({
	encounter = activeEncounter,
	userId = 'user-1',
	initialActionKey,
	initialActionTargetUserId,
	initialItemTargetUserId,
	initialActionSaved = false,
	readOnly = false,
	usableItems = inventory.items,
	actionErrorMessage,
}: BattlePreviewProps) {
	const currentMember = encounter.members.find((member) => member.userId === userId) ?? encounter.members[0];
	const [actionKey, setActionKey] = useState<ActionKey | null>(initialActionKey ?? currentMember.selectedActionKey);
	const [targetEnemyId, setTargetEnemyId] = useState(encounter.enemies.find((enemy) => enemy.currentHealth > 0)?.id ?? '');
	const [actionTargetUserId, setActionTargetUserId] = useState(initialActionTargetUserId ?? currentMember.targetUserId ?? userId);
	const [itemTargetUserId, setItemTargetUserId] = useState(initialItemTargetUserId ?? userId);
	const [itemKey, setItemKey] = useState('');
	const [actionSaved, setActionSaved] = useState(initialActionSaved);
	const [itemResult, setItemResult] = useState<PartyItemUse>();
	const selectedAction = actionKey ? currentMember.signatureAction : null;
	const targetMode = selectedAction?.targetMode ?? 'enemy';
	const selectedActionTargetUserId = actionTargetUserId || userId;
	const selectedItemTargetUserId = itemTargetUserId || userId;

	return (
		<div className="gameplay-surface mx-auto max-w-[1280px] p-4 sm:p-8">
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
				actionPending={false}
				itemPending={false}
				actionBusy={false}
				actionError={actionErrorMessage ? new Error(actionErrorMessage) : null}
				actionSuccess={actionSaved}
				itemResult={itemResult}
				partyMemberName={(memberUserId) => party.members.find((member) => member.userId === memberUserId)?.displayName ?? 'Traveler'}
				onActionKeyChange={(nextActionKey) => {
					setActionKey(nextActionKey);
					setActionSaved(false);
				}}
				onEnemySelect={setTargetEnemyId}
				onAllySelect={setActionTargetUserId}
				onItemKeyChange={setItemKey}
				onItemTargetChange={setItemTargetUserId}
				onSubmitAction={() => setActionSaved(true)}
				onUseItem={() =>
					setItemResult({
						itemKey: itemKey || usableItems[0]?.key || inventory.items[0].key,
						targetUserId: selectedItemTargetUserId,
						healedAmount: 10,
						currentHealth: 20,
						maxHealth: 20,
						remainingQuantity: 1,
					})
				}
			/>
		</div>
	);
}

const meta = {
	title: 'Party/BattleScene',
	parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActiveEncounter: Story = {
	render: () => <BattlePreview />,
};

export const ResolvedEncounter: Story = {
	render: () => <BattlePreview encounter={completedEncounter} initialActionKey="shield-wall" />,
};

export const AllyTargeting: Story = {
	render: () => (
		<BattlePreview userId="user-2" initialActionKey="mend" initialActionTargetUserId="user-1" initialItemTargetUserId="user-3" />
	),
};

export const ReadOnlyEncounter: Story = {
	render: () => <BattlePreview readOnly />,
};

export const WithoutFieldKit: Story = {
	render: () => <BattlePreview usableItems={[]} />,
};

export const SavedCommand: Story = {
	render: () => <BattlePreview initialActionKey="shield-wall" initialActionSaved />,
};

export const CommandError: Story = {
	render: () => <BattlePreview actionErrorMessage="The chronicle could not record this command." />,
};

export const WithoutStandingFoe: Story = {
	render: () => <BattlePreview encounter={noStandingFoeEncounter} />,
};
