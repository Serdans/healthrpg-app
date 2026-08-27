import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { BattleScene } from '#/components/party/battle-scene';
import type { Encounter, Inventory, Party } from '#/lib/api';
import type { BattleTerrain } from '#/lib/battle-terrain';
import { cardPlanAdditionIssue, reviewCardPlan } from '#/lib/battle-cards';
import { combatCommandState } from '#/lib/combat-command-state';
import { useInventory, useSetEncounterPlan } from '#/lib/queries';

type EncounterMember = Encounter['members'][number];
type EncounterCard = EncounterMember['cards'][number];
type CardPlay = EncounterMember['plan']['plays'][number];

interface CombatDraft {
	plays: CardPlay[];
	selectedCardKey: string | null;
	selectedPlayIndex: number | null;
}

function planFingerprint(member: EncounterMember, encounter: Encounter): string {
	return JSON.stringify({
		nodeId: encounter.nodeId,
		worldDate: encounter.worldDate,
		userId: member.userId,
		plan: member.plan,
	});
}

function clearUnavailableTargets(plays: CardPlay[], standingEnemyIds: ReadonlySet<string>, memberIds: ReadonlySet<string>): CardPlay[] {
	const nextPlays = plays.map((play) => {
		const targetEnemyId = play.targetEnemyId !== null && !standingEnemyIds.has(play.targetEnemyId) ? null : play.targetEnemyId;
		const targetUserId = play.targetUserId !== null && !memberIds.has(play.targetUserId) ? null : play.targetUserId;
		if (targetEnemyId === play.targetEnemyId && targetUserId === play.targetUserId) return play;
		return { ...play, targetEnemyId, targetUserId };
	});
	return nextPlays.some((play, index) => play !== plays[index]) ? nextPlays : plays;
}

function selectedIndexAfterReorder(currentIndex: number | null, fromIndex: number, toIndex: number): number | null {
	if (currentIndex === null) return null;
	if (currentIndex === fromIndex) return toIndex;
	if (fromIndex < toIndex && currentIndex > fromIndex && currentIndex <= toIndex) return currentIndex - 1;
	if (fromIndex > toIndex && currentIndex >= toIndex && currentIndex < fromIndex) return currentIndex + 1;
	return currentIndex;
}

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

function cardsForCombatDraft(
	memberCards: readonly EncounterCard[],
	inventoryItems: readonly Inventory['items'][number][],
): EncounterCard[] {
	const cardsByKey = new Map(memberCards.map((card) => [card.key, card]));
	for (const item of inventoryItems) {
		if (item.quantity > 0) {
			const card = cardForItem(item);
			cardsByKey.set(card.key, card);
		}
	}
	return [...cardsByKey.values()];
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
	const [draft, setDraft] = useState<CombatDraft>(() => ({
		plays: currentMember?.plan.plays ?? [],
		selectedCardKey: currentMember?.plan.plays[0]?.cardKey ?? null,
		selectedPlayIndex: currentMember?.plan.plays.length ? 0 : null,
	}));
	const [commandDirty, setCommandDirty] = useState(false);
	const pageScrollYRef = useRef<number | null>(null);
	const pageScrollRestoreFrameRef = useRef<number | null>(null);
	const { plays, selectedCardKey, selectedPlayIndex } = draft;

	const savedPlanFingerprint = currentMember ? planFingerprint(currentMember, encounter) : null;
	useEffect(() => {
		if (!currentMember) return;
		setDraft({
			plays: currentMember.plan.plays,
			selectedCardKey: currentMember.plan.plays[0]?.cardKey ?? null,
			selectedPlayIndex: currentMember.plan.plays.length > 0 ? 0 : null,
		});
		setCommandDirty(false);
	}, [savedPlanFingerprint]);
	useEffect(() => {
		if (!currentMember) return;
		const standingEnemyIds = new Set(encounter.enemies.filter((enemy) => enemy.currentHealth > 0).map((enemy) => enemy.id));
		const memberIds = new Set(encounter.members.map((member) => member.userId));
		setDraft((currentDraft) => {
			const nextPlays = clearUnavailableTargets(currentDraft.plays, standingEnemyIds, memberIds);
			return nextPlays === currentDraft.plays ? currentDraft : { ...currentDraft, plays: nextPlays };
		});
	}, [currentMember, encounter.enemies, encounter.members]);
	useLayoutEffect(() => {
		const pageScrollY = pageScrollYRef.current;
		if (pageScrollY === null) return;
		pageScrollYRef.current = null;
		window.scrollTo(window.scrollX, pageScrollY);
		const frameId = window.requestAnimationFrame(() => {
			pageScrollRestoreFrameRef.current = null;
			window.scrollTo(window.scrollX, pageScrollY);
		});
		pageScrollRestoreFrameRef.current = frameId;
		return () => {
			window.cancelAnimationFrame(frameId);
			if (pageScrollRestoreFrameRef.current === frameId) pageScrollRestoreFrameRef.current = null;
		};
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
	const draftCards = cardsForCombatDraft(currentMember.cards, inventoryItems);
	const draftMember: EncounterMember = { ...currentMember, cards: draftCards };
	const planReview = reviewCardPlan({
		plays,
		cards: draftCards,
		inventory: inventoryQuery.data,
		playSlots: currentMember.playSlots,
	});
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
		const addIssue = cardPlanAdditionIssue({
			card,
			plays,
			cards: draftCards,
			inventory: inventoryQuery.data,
			playSlots: currentMember.playSlots,
		});
		if (addIssue !== null) {
			if (existingIndexes.length > 0 && (addIssue === 'duplicate' || addIssue === 'capacity')) {
				const focusIndex = card.repeatable ? existingIndexes.at(-1) : existingIndexes[0];
				if (focusIndex !== undefined) {
					setDraft((currentDraft) => ({
						...currentDraft,
						selectedCardKey: cardKey,
						selectedPlayIndex: focusIndex,
					}));
				}
			}
			return;
		}

		const nextPlay: CardPlay = {
			cardKey,
			targetEnemyId: card.targetMode === 'enemy' ? standingEnemyId : null,
			targetUserId: card.targetMode === 'ally' ? userId : null,
		};
		setDraft((currentDraft) => {
			const nextPlays = [...currentDraft.plays, nextPlay];
			return {
				plays: nextPlays,
				selectedCardKey: cardKey,
				selectedPlayIndex: nextPlays.length - 1,
			};
		});
		markDirty();
	};

	const removePlay = (playIndex: number) => {
		preservePageScroll();
		setDraft((currentDraft) => {
			if (!currentDraft.plays[playIndex]) return currentDraft;
			const nextPlays = currentDraft.plays.filter((_, index) => index !== playIndex);
			const nextPlayIndex = nextPlays.length > 0 ? Math.min(playIndex, nextPlays.length - 1) : null;
			return {
				plays: nextPlays,
				selectedPlayIndex: nextPlayIndex,
				selectedCardKey: nextPlayIndex === null ? null : (nextPlays[nextPlayIndex]?.cardKey ?? null),
			};
		});
		markDirty();
	};

	const focusPlay = (playIndex: number) => {
		setDraft((currentDraft) => {
			if (playIndex < 0 || playIndex >= currentDraft.plays.length) return currentDraft;
			return {
				...currentDraft,
				selectedPlayIndex: playIndex,
				selectedCardKey: currentDraft.plays[playIndex]?.cardKey ?? null,
			};
		});
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

		setDraft((currentDraft) => {
			if (
				fromIndex === toIndex ||
				fromIndex < 0 ||
				toIndex < 0 ||
				fromIndex >= currentDraft.plays.length ||
				toIndex >= currentDraft.plays.length
			) {
				return currentDraft;
			}

			const nextPlays = [...currentDraft.plays];
			const [movedPlay] = nextPlays.splice(fromIndex, 1);
			nextPlays.splice(toIndex, 0, movedPlay);
			const currentIndex = currentDraft.selectedPlayIndex;
			const nextSelectedPlayIndex = selectedIndexAfterReorder(currentIndex, fromIndex, toIndex);
			return {
				plays: nextPlays,
				selectedPlayIndex: nextSelectedPlayIndex,
				selectedCardKey: nextSelectedPlayIndex === null ? null : (nextPlays[nextSelectedPlayIndex]?.cardKey ?? null),
			};
		});
		markDirty();
	};

	const updateSelectedPlay = (update: (play: CardPlay) => CardPlay) => {
		setDraft((currentDraft) => {
			const currentIndex = currentDraft.selectedPlayIndex;
			if (currentIndex === null || !currentDraft.plays[currentIndex]) return currentDraft;
			return {
				...currentDraft,
				plays: currentDraft.plays.map((play, index) => (index === currentIndex ? update(play) : play)),
			};
		});
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
		if (!planReview.valid) return;
		const standingEnemyIds = new Set(encounter.enemies.filter((enemy) => enemy.currentHealth > 0).map((enemy) => enemy.id));
		const memberIds = new Set(encounter.members.map((member) => member.userId));
		const playsForSubmission = clearUnavailableTargets(plays, standingEnemyIds, memberIds);
		planMutation.mutate(
			{ itemLoadoutKeys: itemLoadoutKeysForPlays(playsForSubmission, draftCards), plays: playsForSubmission },
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
