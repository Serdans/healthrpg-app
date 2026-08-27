import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { BattleScene } from '#/components/party/battle-scene';
import type { Encounter, Inventory, Party } from '#/lib/api';
import type { BattleTerrain } from '#/lib/battle-terrain';
import { combatCommandState } from '#/lib/combat-command-state';
import { useInventory, useSetEncounterPlan } from '#/lib/queries';

type EncounterMember = Encounter['members'][number];
type EncounterCard = EncounterMember['cards'][number];
type CardPlay = EncounterMember['plan']['plays'][number];

function cardForItem(item: Inventory['items'][number]): EncounterCard {
	const preview =
		item.details.effect?.kind === 'heal'
			? {
					effects: [
						{
							kind: 'heal' as const,
							baseAmount: item.details.effect.amount,
							manualTargetBonus: null,
							rallyBonus: null,
							targetCount: null,
							distribution: null,
						},
					],
				}
			: null;

	return {
		key: `item:${item.key}`,
		sourceKind: 'item',
		sourceKey: item.key,
		classKey: null,
		unlockLevel: 1,
		displayName: item.displayName,
		description: item.details.description,
		targetMode: 'ally',
		repeatable: true,
		locked: false,
		selectedCount: 0,
		preview,
	};
}

function itemLoadoutKeysForPlays(plays: CardPlay[], cards: EncounterCard[]): string[] {
	const cardByKey = new Map(cards.map((card) => [card.key, card]));
	return [
		...new Set(
			plays.flatMap((play) => {
				const card = cardByKey.get(play.cardKey);
				return card?.sourceKind === 'item' ? [card.sourceKey] : [];
			}),
		),
	].slice(0, 2);
}

export function CombatPanel({
	partyId,
	userId,
	party,
	encounter,
	battleTerrain,
	readOnly = false,
}: {
	partyId: string;
	userId: string;
	party: Party;
	encounter: Encounter;
	battleTerrain: BattleTerrain;
	readOnly?: boolean;
}) {
	const planMutation = useSetEncounterPlan(partyId);
	const inventoryQuery = useInventory();
	const currentMember = encounter.members.find((member) => member.userId === userId);
	const [plays, setPlays] = useState<CardPlay[]>(() => currentMember?.plan.plays ?? []);
	const [selectedCardKey, setSelectedCardKey] = useState<string | null>(() => currentMember?.plan.plays[0]?.cardKey ?? null);
	const [selectedPlayIndex, setSelectedPlayIndex] = useState<number | null>(() => (currentMember?.plan.plays.length ? 0 : null));
	const [commandDirty, setCommandDirty] = useState(false);
	const pageScrollYRef = useRef<number | null>(null);

	const savedPlanFingerprint: string | null = currentMember
		? `${encounter.nodeId}:${encounter.worldDate}:${currentMember.userId}:${JSON.stringify(currentMember.plan)}`
		: null;
	useEffect(() => {
		if (!currentMember) return;
		setPlays(currentMember.plan.plays);
		setSelectedPlayIndex(currentMember.plan.plays.length > 0 ? 0 : null);
		setSelectedCardKey(currentMember.plan.plays[0]?.cardKey ?? null);
		setCommandDirty(false);
	}, [savedPlanFingerprint]);
	useLayoutEffect(() => {
		const pageScrollY = pageScrollYRef.current;
		if (pageScrollY === null) return;
		window.scrollTo(window.scrollX, pageScrollY);
		window.requestAnimationFrame(() => window.scrollTo(window.scrollX, pageScrollY));
	}, [plays, selectedCardKey, selectedPlayIndex]);

	if (!currentMember) return <ErrorNotice message="Your traveler is not present in this encounter." />;
	if (inventoryQuery.isPending) return <LoadingState label="Checking your combat loadout…" />;
	if (inventoryQuery.isError) {
		return (
			<ErrorNotice
				error={inventoryQuery.error}
				message={inventoryQuery.error.message}
				onRetry={() => void inventoryQuery.refetch()}
				retrying={inventoryQuery.isFetching}
				retryLabel="Retry combat loadout"
			/>
		);
	}

	const inventoryItems = inventoryQuery.data.items;
	const usableItems = inventoryItems.filter((item) => item.quantity > 0);
	const draftCards = [...new Map([...currentMember.cards, ...usableItems.map(cardForItem)].map((card) => [card.key, card])).values()];
	const draftMember: EncounterMember = { ...currentMember, cards: draftCards };
	const actionError = planMutation.error;
	const actionBusy = planMutation.isPending;
	const partyMemberName = (memberUserId: string) =>
		party.members.find((member) => member.userId === memberUserId)?.displayName ?? 'Traveler';
	const selectedPlay = selectedPlayIndex === null ? undefined : plays[selectedPlayIndex];
	const selectedCard = draftCards.find((card) => card.key === selectedCardKey);
	const standingEnemyId = encounter.enemies.find((enemy) => enemy.currentHealth > 0)?.id ?? null;

	const markDirty = () => setCommandDirty(true);
	const preservePageScroll = () => {
		if (pageScrollYRef.current === null) pageScrollYRef.current = window.scrollY;
	};

	const activateCard = (cardKey: string) => {
		const card = draftCards.find((candidate) => candidate.key === cardKey);
		if (!card || card.locked || readOnly || encounter.status === 'completed' || actionBusy) return;
		preservePageScroll();

		const existingIndexes = plays.flatMap((play, index) => (play.cardKey === cardKey ? [index] : []));
		if (existingIndexes.length > 0 && !card.repeatable) {
			setSelectedCardKey(cardKey);
			setSelectedPlayIndex(existingIndexes[0]);
			return;
		}
		if (plays.length >= currentMember.playSlots) {
			if (existingIndexes.length > 0) {
				setSelectedCardKey(cardKey);
				setSelectedPlayIndex(existingIndexes[existingIndexes.length - 1]);
			}
			return;
		}
		const quantity = inventoryItems.find((item) => item.key === card.sourceKey)?.quantity;
		const selectedQuantity = plays.filter((play) => play.cardKey === card.key).length;
		if (card.sourceKind === 'item' && quantity !== undefined && selectedQuantity >= quantity) return;
		if (
			card.sourceKind === 'item' &&
			!plays.some((play) => draftCards.find((candidate) => candidate.key === play.cardKey)?.sourceKey === card.sourceKey) &&
			new Set(
				plays.flatMap((play) => {
					const queuedCard = draftCards.find((candidate) => candidate.key === play.cardKey);
					return queuedCard?.sourceKind === 'item' ? [queuedCard.sourceKey] : [];
				}),
			).size >= 2
		) {
			return;
		}

		setSelectedCardKey(cardKey);
		const nextPlay: CardPlay = {
			cardKey,
			targetEnemyId: card.targetMode === 'enemy' ? standingEnemyId : null,
			targetUserId: card.targetMode === 'ally' ? userId : null,
		};
		setPlays((currentPlays) => [...currentPlays, nextPlay]);
		setSelectedPlayIndex(plays.length);
		markDirty();
	};

	const removePlay = (playIndex: number) => {
		if (!plays[playIndex]) return;
		preservePageScroll();
		const nextPlays = plays.filter((_, index) => index !== playIndex);
		const nextPlayIndex = nextPlays.length > 0 ? Math.min(playIndex, nextPlays.length - 1) : null;
		setPlays(nextPlays);
		setSelectedPlayIndex(nextPlayIndex);
		setSelectedCardKey(nextPlayIndex === null ? null : nextPlays[nextPlayIndex].cardKey);
		markDirty();
	};

	const focusPlay = (playIndex: number) => {
		if (playIndex < 0 || playIndex >= plays.length) return;
		setSelectedPlayIndex(playIndex);
		setSelectedCardKey(plays[playIndex].cardKey);
	};

	const activatePlay = (playIndex: number) => {
		if (playIndex < 0 || playIndex >= plays.length || readOnly || encounter.status === 'completed' || actionBusy) return;
		removePlay(playIndex);
	};

	const reorderPlay = (fromIndex: number, toIndex: number) => {
		if (
			fromIndex === toIndex ||
			fromIndex < 0 ||
			toIndex < 0 ||
			fromIndex >= plays.length ||
			toIndex >= plays.length ||
			readOnly ||
			encounter.status === 'completed' ||
			actionBusy
		) {
			return;
		}

		setPlays((currentPlays) => {
			const nextPlays = [...currentPlays];
			const [movedPlay] = nextPlays.splice(fromIndex, 1);
			nextPlays.splice(toIndex, 0, movedPlay);
			return nextPlays;
		});
		setSelectedPlayIndex((currentIndex) => {
			if (currentIndex === null || currentIndex === fromIndex) return currentIndex === null ? null : toIndex;
			if (fromIndex < toIndex && currentIndex > fromIndex && currentIndex <= toIndex) return currentIndex - 1;
			if (fromIndex > toIndex && currentIndex >= toIndex && currentIndex < fromIndex) return currentIndex + 1;
			return currentIndex;
		});
		markDirty();
	};

	const updateSelectedPlay = (update: (play: CardPlay) => CardPlay) => {
		if (selectedPlayIndex === null) return;
		setPlays((currentPlays) => currentPlays.map((play, index) => (index === selectedPlayIndex ? update(play) : play)));
		markDirty();
	};

	const selectEnemy = (enemyId: string) => {
		if (selectedCard?.targetMode !== 'enemy') return;
		updateSelectedPlay((play) => ({ ...play, targetEnemyId: enemyId, targetUserId: null }));
	};

	const selectAlly = (memberUserId: string) => {
		if (selectedCard?.targetMode !== 'ally') return;
		updateSelectedPlay((play) => ({ ...play, targetEnemyId: null, targetUserId: memberUserId }));
	};

	const submitPlan = () => {
		planMutation.mutate(
			{ itemLoadoutKeys: itemLoadoutKeysForPlays(plays, draftCards), plays },
			{
				onError: () => setCommandDirty(true),
				onSuccess: () => setCommandDirty(false),
			},
		);
	};

	const commandState = combatCommandState({
		readOnly,
		encounterCompleted: encounter.status === 'completed',
		actionPending: planMutation.isPending,
		actionSuccess: planMutation.isSuccess,
		commandDirty,
	});

	return (
		<BattleScene
			encounter={encounter}
			battleTerrain={battleTerrain}
			currentMember={draftMember}
			userId={userId}
			readOnly={readOnly}
			plays={plays}
			inventory={inventoryQuery.data}
			selectedCardKey={selectedCardKey}
			selectedPlayIndex={selectedPlayIndex}
			targetEnemyId={selectedPlay?.targetEnemyId ?? null}
			selectedTargetUserId={selectedPlay?.targetUserId ?? null}
			actionPending={planMutation.isPending}
			actionBusy={actionBusy}
			actionError={actionError}
			commandState={commandState}
			partyMemberName={partyMemberName}
			onCardActivate={activateCard}
			onPlayActivate={activatePlay}
			onPlayFocus={focusPlay}
			onPlayReorder={reorderPlay}
			onEnemySelect={selectEnemy}
			onAllySelect={selectAlly}
			onSubmitPlan={submitPlan}
		/>
	);
}
