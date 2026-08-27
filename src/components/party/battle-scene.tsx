import { Check, GripVertical, HeartPulse, Shield, Sparkles, Swords, Target } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';

import { Button } from '#/components/ui/button';
import { Progress } from '#/components/ui/progress';
import { InventoryItemSprite } from '#/components/inventory/inventory-item-sprite';
import type { Encounter, Inventory } from '#/lib/api';
import { battleActorStageSize, createBattleCamera, projectBattleFloorSlot } from '#/lib/battle-camera';
import type { BattleScreenPlacement, BattleViewportSize } from '#/lib/battle-camera';
import { battleFloorSlots } from '#/lib/battle-arena';
import { battleFloorCalibrationFor } from '#/lib/battle-terrain';
import type { BattleTerrain } from '#/lib/battle-terrain';
import { cardsForPlanFan } from '#/lib/battle-cards';
import type { CombatCommandState } from '#/lib/combat-command-state';
import { battleTerrainWorldSize } from '#/lib/game-art';
import { BattlePixiScene } from './battle-pixi-scene';

type EncounterMember = Encounter['members'][number];
type EncounterCard = EncounterMember['cards'][number];
type CardPlay = EncounterMember['plan']['plays'][number];
type TargetMode = EncounterCard['targetMode'];
const CARD_CATEGORIES = ['all', 'class', 'equipment', 'item'] as const;
const EMPTY_PLAN_NOTE = 'Choose cards to build your plan. Empty plans use Basic Attack.';
const BATTLE_CARD_PREVIEW_CLOSE_GRACE_MS = 80;
const BATTLE_CARD_PREVIEW_TRANSITION_MS = 160;
const BATTLE_CARD_HAND_PAN_THRESHOLD_PX = 8;
const BATTLE_CARD_REORDER_THRESHOLD_PX = 6;
const BATTLE_FAN_MAX_ROTATION_DEGREES = 5;
const BATTLE_FAN_HORIZONTAL_STEP_REM = 0.75;
const BATTLE_FAN_MAX_DROP_REM = 0.75;
type CardCategory = (typeof CARD_CATEGORIES)[number];
type BattleCardPreviewPhase = 'opening' | 'closing';

interface BattleHandPointerState {
	pointerId: number;
	startX: number;
	startY: number;
	panning: boolean;
}

interface BattleReorderPointerState {
	pointerId: number;
	playIndex: number;
	startX: number;
	startY: number;
	active: boolean;
	dropIndex: number | null;
}

export interface BattleSceneProps {
	encounter: Encounter;
	currentMember: EncounterMember;
	battleTerrain: BattleTerrain;
	userId: string;
	readOnly: boolean;
	plays: CardPlay[];
	inventory: Inventory;
	selectedCardKey: string | null;
	selectedPlayIndex: number | null;
	targetEnemyId: string | null;
	selectedTargetUserId: string | null;
	actionPending: boolean;
	actionBusy: boolean;
	actionError: Error | null;
	commandState: CombatCommandState;
	partyMemberName: (memberUserId: string) => string;
	onCardActivate: (cardKey: string) => void;
	onPlayActivate: (playIndex: number) => void;
	onPlayFocus: (playIndex: number) => void;
	onPlayReorder: (fromIndex: number, toIndex: number) => void;
	onEnemySelect: (enemyId: string) => void;
	onAllySelect: (userId: string) => void;
	onSubmitPlan: () => void;
}

interface BattlefieldProps {
	encounter: Encounter;
	battleTerrain: BattleTerrain;
	userId: string;
	readOnly: boolean;
	actionBusy: boolean;
	targetEnemyId: string | null;
	selectedTargetUserId: string | null;
	targetMode: TargetMode | null;
	partyMemberName: (memberUserId: string) => string;
	onEnemySelect: (enemyId: string) => void;
	onAllySelect: (userId: string) => void;
}

interface BattleCommandTrayProps {
	encounter: Encounter;
	currentMember: EncounterMember;
	readOnly: boolean;
	plays: CardPlay[];
	inventory: Inventory;
	selectedCardKey: string | null;
	selectedPlayIndex: number | null;
	actionPending: boolean;
	actionBusy: boolean;
	onCardActivate: (cardKey: string) => void;
	onPlayActivate: (playIndex: number) => void;
	onPlayFocus: (playIndex: number) => void;
	onPlayReorder: (fromIndex: number, toIndex: number) => void;
	onSubmitPlan: () => void;
}

function label(value: string) {
	return value
		.split('-')
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

function classNames(...values: Array<string | false | null>): string {
	return values.filter((value): value is string => Boolean(value)).join(' ');
}

function healthPercent(currentHealth: number, maxHealth: number) {
	return maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;
}

function targetLabel(targetMode: TargetMode | null) {
	if (targetMode === 'enemy') return 'Enemy target';
	if (targetMode === 'ally') return 'Ally target';
	return 'No target';
}

function cardDisabledReason({
	itemTypeBlocked,
	quantityBlocked,
	capacityBlocked,
}: {
	itemTypeBlocked: boolean;
	quantityBlocked: boolean;
	capacityBlocked: boolean;
}): string | null {
	if (itemTypeBlocked) return 'Two item types are already queued.';
	if (quantityBlocked) return 'You do not have another copy of this item.';
	if (capacityBlocked) return 'All play slots are full.';
	return null;
}

function cardForPlay(member: EncounterMember, play: CardPlay | undefined) {
	return play ? member.cards.find((card) => card.key === play.cardKey) : undefined;
}

function plannedCardName(member: EncounterMember) {
	return cardForPlay(member, member.plan.plays[0])?.displayName ?? 'Basic Attack';
}

function CardSourceIcon({ card }: { card: EncounterCard }) {
	if (card.sourceKind === 'item') return <HeartPulse className="size-4" />;
	if (card.sourceKind === 'class') return <Sparkles className="size-4" />;
	return <Swords className="size-4" />;
}

function cardCategory(card: EncounterCard): Exclude<CardCategory, 'all'> {
	if (card.sourceKind === 'class') return 'class';
	if (card.sourceKind === 'item') return 'item';
	return 'equipment';
}

function cardCategoryLabel(category: CardCategory): string {
	if (category === 'class') return 'Skills';
	if (category === 'equipment') return 'Equipment';
	if (category === 'item') return 'Items';
	return 'All';
}

function categoryAfterKey(category: CardCategory, key: string): CardCategory | null {
	const currentIndex = CARD_CATEGORIES.indexOf(category);
	if (currentIndex < 0) return null;

	switch (key) {
		case 'ArrowRight':
		case 'ArrowDown':
			return CARD_CATEGORIES[(currentIndex + 1) % CARD_CATEGORIES.length];
		case 'ArrowLeft':
		case 'ArrowUp':
			return CARD_CATEGORIES[(currentIndex - 1 + CARD_CATEGORIES.length) % CARD_CATEGORIES.length];
		case 'Home':
			return CARD_CATEGORIES[0];
		case 'End':
			return CARD_CATEGORIES.at(-1) ?? null;
		default:
			return null;
	}
}

type PreviewEffect = NonNullable<EncounterCard['preview']>['effects'][number];

function previewEffectBaseLabel(effect: PreviewEffect): string {
	switch (effect.kind) {
		case 'damage':
			return `Damage ${effect.baseAmount}`;
		case 'heal':
			return `Heal up to ${effect.baseAmount}`;
		case 'guard':
			return `Guard ${effect.baseAmount}`;
		case 'rally':
			return `Rally +${effect.baseAmount}`;
	}
}

function previewDamageTargetSummary(effect: PreviewEffect): string | null {
	if (effect.kind !== 'damage' || effect.distribution !== 'split' || effect.targetCount === null) return null;
	const targetWord = effect.targetCount === 1 ? 'target' : 'targets';
	return `total · ${effect.targetCount} ${targetWord}`;
}

function previewEffectLabel(effect: PreviewEffect): string {
	const targetSummary = previewDamageTargetSummary(effect);
	const conditionalLabels = [
		effect.manualTargetBonus !== null ? `+${effect.manualTargetBonus} manual` : null,
		effect.rallyBonus !== null ? `+${effect.rallyBonus} rally` : null,
	].filter((value): value is string => value !== null);

	return [previewEffectBaseLabel(effect), targetSummary, ...conditionalLabels].filter((value): value is string => value !== null).join(' ');
}

function previewEffectAnnouncement(card: EncounterCard): string | null {
	const effects = card.preview?.effects ?? [];
	return effects.length > 0 ? effects.map(previewEffectLabel).join(', ') : null;
}

function inventoryEntryForCard(card: EncounterCard, inventory: Inventory) {
	if (card.sourceKind === 'item') return inventory.items.find((item) => item.key === card.sourceKey);
	if (card.sourceKind === 'weapon' || card.sourceKind === 'gear') {
		return inventory.equipment.find((item) => item.key === card.sourceKey);
	}
	return undefined;
}

function CardArtwork({ card, inventory }: { card: EncounterCard; inventory: Inventory }) {
	const inventoryEntry = inventoryEntryForCard(card, inventory);
	if (card.sourceKind === 'class' || !inventoryEntry) {
		return (
			<span className="battle-card-art battle-card-art-icon" aria-hidden="true">
				<CardSourceIcon card={card} />
			</span>
		);
	}

	return (
		<span className="battle-card-art" aria-hidden="true">
			<InventoryItemSprite
				itemKey={card.sourceKey}
				kind={card.sourceKind === 'item' ? 'item' : 'equipment'}
				size="md"
				className="battle-card-art-sprite"
			/>
		</span>
	);
}

function BattleCardFace({ card, inventory, playOrder = null }: { card: EncounterCard; inventory: Inventory; playOrder?: number | null }) {
	const inventoryEntry = inventoryEntryForCard(card, inventory);
	const sourceDetail = inventoryEntry ? `${cardSourceLabel(card)} · ${inventoryEntry.displayName}` : `${cardSourceLabel(card)} card`;
	const cardMeta = [
		card.sourceKind === 'item' && inventoryEntry ? `${inventoryEntry.quantity} owned` : targetLabel(card.targetMode),
		card.repeatable ? 'repeatable' : null,
	]
		.filter((value): value is string => value !== null)
		.join(' · ');
	const previewEffects = card.preview?.effects ?? [];

	return (
		<span className="battle-card-face">
			<span className="battle-card-face-topline">
				<span>{sourceDetail}</span>
				{playOrder !== null ? <span className="battle-card-play-number">{playOrder}</span> : null}
			</span>
			<CardArtwork card={card} inventory={inventory} />
			<span className={classNames('battle-card-copy', previewEffects.length > 0 && 'battle-card-copy-with-effects')}>
				<strong>{card.displayName}</strong>
				{previewEffects.length > 0 ? (
					<span className="battle-card-effect-list" aria-label="Projected effects">
						{previewEffects.map((effect, index) => (
							<span
								key={`${effect.kind}-${index}`}
								className={`battle-card-effect-chip battle-card-effect-${effect.kind}`}
								data-effect-kind={effect.kind}
							>
								{previewEffectLabel(effect)}
							</span>
						))}
					</span>
				) : null}
				<small className="battle-card-description">{card.description}</small>
				<span className="battle-card-meta">{cardMeta}</span>
			</span>
		</span>
	);
}

type BattleFanCardEntry = {
	card: EncounterCard;
	queuedOrder: number | null;
	playIndex: number | null;
};

function battleFanCardInstanceId({ card, playIndex }: Pick<BattleFanCardEntry, 'card' | 'playIndex'>): string {
	return playIndex === null ? card.key : `${card.key}-play-${playIndex}`;
}

function BattleFanCardSurface({ card, inventory, queuedOrder }: { card: EncounterCard; inventory: Inventory; queuedOrder: number | null }) {
	return (
		<span className="battle-fan-card-surface">
			{queuedOrder !== null ? (
				<span className="battle-fan-card-queued-badge" aria-hidden="true">
					<Check className="size-3" />
					<span>{queuedOrder}</span>
				</span>
			) : null}
			<BattleCardFace card={card} inventory={inventory} />
		</span>
	);
}

function cardSourceLabel(card: EncounterCard): string {
	if (card.sourceKind === 'class') return 'Skill';
	if (card.sourceKind === 'item') return 'Item';
	return 'Equipped';
}

function targetInstruction(card: EncounterCard | undefined): string {
	if (!card) return EMPTY_PLAN_NOTE;
	if (card.targetMode === 'none') return 'Resolves without a target.';
	if (card.targetMode === 'enemy') {
		return 'Select a highlighted foe or use auto-target.';
	}
	return 'Select a highlighted ally or use lowest-health targeting.';
}

function hasAvailableTarget(card: EncounterCard | undefined, standingEnemies: boolean, partyMemberCount: number): boolean {
	if (!card || card.targetMode === 'none') return true;
	if (card.targetMode === 'enemy') return standingEnemies;
	return partyMemberCount > 0;
}

function prefersReducedMotion(): boolean {
	return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function centeredFanPosition(index: number, cardCount: number, maxRotation: number, horizontalStep: number, maxDrop: number) {
	const centeredIndex = index - (cardCount - 1) / 2;
	const maxIndex = Math.max((cardCount - 1) / 2, 1);
	const normalizedIndex = centeredIndex / maxIndex;
	const edgeFactor = cardCount > 1 ? normalizedIndex ** 2 : 0;

	return {
		centeredIndex,
		rotation: cardCount > 1 ? normalizedIndex * maxRotation : 0,
		offset: cardCount > 1 ? centeredIndex * horizontalStep : 0,
		drop: edgeFactor * maxDrop,
	};
}

function fanCardStyle(index: number, cardCount: number, queued: boolean, focused: boolean): CSSProperties {
	const { centeredIndex, rotation, offset, drop } = centeredFanPosition(
		index,
		cardCount,
		BATTLE_FAN_MAX_ROTATION_DEGREES,
		BATTLE_FAN_HORIZONTAL_STEP_REM,
		BATTLE_FAN_MAX_DROP_REM,
	);
	const baseZIndex = Math.max(1, cardCount - Math.round(Math.abs(centeredIndex)));
	const stackOrder = focused ? cardCount + 30 : queued ? cardCount + 10 : baseZIndex;

	return {
		'--fan-offset': `${offset}rem`,
		'--fan-rotation': `${rotation}deg`,
		'--fan-drop': `${drop}rem`,
		'--fan-stack-order': `${stackOrder}`,
	} as CSSProperties;
}

type CardEdgeFade = {
	leftBoundary?: number;
	rightBoundary?: number;
};

function clampPercentage(value: number): number {
	return Math.min(100, Math.max(0, value));
}

function clearCardEdgeFade(card: HTMLElement): void {
	delete card.dataset.edgeFadeLeft;
	delete card.dataset.edgeFadeRight;
	card.style.removeProperty('--battle-card-mask-left-transparent');
	card.style.removeProperty('--battle-card-mask-left-soft');
	card.style.removeProperty('--battle-card-mask-left-opaque');
	card.style.removeProperty('--battle-card-mask-right-opaque');
	card.style.removeProperty('--battle-card-mask-right-soft');
	card.style.removeProperty('--battle-card-mask-right-transparent');
}

function updateHandCardEdgeFades(viewport: HTMLElement): void {
	const viewportRect = viewport.getBoundingClientRect();
	const cards = [...viewport.querySelectorAll<HTMLElement>('.battle-fan-card')];
	const edgeFades = new Map<HTMLElement, CardEdgeFade>();

	for (const card of cards) clearCardEdgeFade(card);

	const leftEdgeCard = cards.find((card) => {
		const rect = card.getBoundingClientRect();
		return rect.left < viewportRect.left && rect.right > viewportRect.left;
	});
	const rightEdgeCard = [...cards].reverse().find((card) => {
		const rect = card.getBoundingClientRect();
		return rect.left < viewportRect.right && rect.right > viewportRect.right;
	});

	if (leftEdgeCard) {
		const rect = leftEdgeCard.getBoundingClientRect();
		const boundary = clampPercentage(((viewportRect.left - rect.left) / rect.width) * 100);
		edgeFades.set(leftEdgeCard, { leftBoundary: boundary });
	}

	if (rightEdgeCard) {
		const rect = rightEdgeCard.getBoundingClientRect();
		const boundary = clampPercentage(((viewportRect.right - rect.left) / rect.width) * 100);
		edgeFades.set(rightEdgeCard, { ...edgeFades.get(rightEdgeCard), rightBoundary: boundary });
	}

	for (const [card, fade] of edgeFades) {
		const rect = card.getBoundingClientRect();
		const fadeWidth = Math.min(48, Math.max(30, rect.width * 0.32));
		const fadeWidthPercentage = (fadeWidth / Math.max(rect.width, 1)) * 100;
		const softStopWidthPercentage = fadeWidthPercentage * 0.5;
		let leftTransparent = 0;
		let leftSoft = 0;
		let leftOpaque = 0;
		let rightOpaque = 100;
		let rightSoft = 100;
		let rightTransparent = 100;

		if (fade.leftBoundary !== undefined) {
			leftTransparent = fade.leftBoundary;
			leftSoft = clampPercentage(fade.leftBoundary + softStopWidthPercentage);
			leftOpaque = clampPercentage(fade.leftBoundary + fadeWidthPercentage);
			card.dataset.edgeFadeLeft = 'true';
		}

		if (fade.rightBoundary !== undefined) {
			rightOpaque = clampPercentage(fade.rightBoundary - fadeWidthPercentage);
			rightSoft = clampPercentage(fade.rightBoundary - softStopWidthPercentage);
			rightTransparent = fade.rightBoundary;
			card.dataset.edgeFadeRight = 'true';
		}

		if (leftOpaque > rightOpaque) {
			const midpoint = (leftOpaque + rightOpaque) / 2;
			leftSoft = Math.min(leftSoft, midpoint);
			leftOpaque = midpoint;
			rightOpaque = midpoint;
			rightSoft = Math.max(rightSoft, midpoint);
		}

		card.style.setProperty('--battle-card-mask-left-transparent', `${leftTransparent}%`);
		card.style.setProperty('--battle-card-mask-left-soft', `${leftSoft}%`);
		card.style.setProperty('--battle-card-mask-left-opaque', `${leftOpaque}%`);
		card.style.setProperty('--battle-card-mask-right-opaque', `${rightOpaque}%`);
		card.style.setProperty('--battle-card-mask-right-soft', `${rightSoft}%`);
		card.style.setProperty('--battle-card-mask-right-transparent', `${rightTransparent}%`);
	}
}

function BattleArenaMeta({
	side,
	displayName,
	secondaryLabel,
	currentHealth,
	maxHealth,
	isCurrentUser = false,
}: {
	side: 'enemy' | 'party';
	displayName: string;
	secondaryLabel: string | null;
	currentHealth: number;
	maxHealth: number;
	isCurrentUser?: boolean;
}) {
	return (
		<div className={classNames('battle-arena-meta', `battle-arena-meta-${side}`)} data-testid="battle-arena-meta">
			<span className={side === 'enemy' ? 'battle-enemy-nameplate' : 'battle-party-nameplate'}>
				<strong>
					{displayName}
					{isCurrentUser ? <small className="battle-arena-meta-current-user">YOU</small> : null}
				</strong>
				{secondaryLabel ? <span className="battle-arena-meta-secondary">{secondaryLabel}</span> : null}
			</span>
			<span className="battle-combatant-health">
				<span>
					<span className="battle-combatant-health-value">
						{currentHealth}/{maxHealth}
					</span>
					<span className="battle-combatant-health-unit"> HP</span>
				</span>
				<Progress value={healthPercent(currentHealth, maxHealth)} />
			</span>
		</div>
	);
}

function arenaSlotStyle(placement: BattleScreenPlacement, stageSize: number): CSSProperties {
	return {
		left: `${placement.x}px`,
		top: `${placement.groundY}px`,
		width: `${stageSize}px`,
		height: `${stageSize}px`,
		'--battle-arena-depth': placement.depth,
		'--battle-arena-z': placement.zIndex,
	} as CSSProperties;
}

function arenaLabelStyle(placement: BattleScreenPlacement, stageSize: number, row: 'back' | 'front'): CSSProperties {
	return {
		left: `${placement.x}px`,
		top: `${row === 'front' ? placement.groundY + 6 : Math.max(8, placement.groundY - stageSize - 6)}px`,
		width: `${Math.min(7.2 * 16, Math.max(4.2 * 16, stageSize * 1.15))}px`,
		'--battle-arena-depth': placement.depth,
	} as CSSProperties;
}

function Battlefield({
	encounter,
	battleTerrain,
	userId,
	readOnly,
	actionBusy,
	targetEnemyId,
	selectedTargetUserId,
	targetMode,
	partyMemberName,
	onEnemySelect,
	onAllySelect,
}: BattlefieldProps) {
	const interactionDisabled = readOnly || encounter.status === 'completed' || actionBusy;
	const viewportRef = useRef<HTMLDivElement>(null);
	const [viewportSize, setViewportSize] = useState<BattleViewportSize>({ width: 1, height: 1 });
	const [battleGraphicsError, setBattleGraphicsError] = useState<string | null>(null);
	const calibration = battleFloorCalibrationFor(battleTerrain);
	const camera = createBattleCamera(viewportSize, battleTerrainWorldSize);
	const enemySlots = battleFloorSlots('enemy', encounter.enemies.length);
	const partySlots = battleFloorSlots('party', encounter.members.length);
	const enemyPlacements = enemySlots.map((slot) => projectBattleFloorSlot(camera, calibration, slot, 'enemy', enemySlots.length));
	const partyPlacements = partySlots.map((slot) => projectBattleFloorSlot(camera, calibration, slot, 'party', partySlots.length));

	useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;

		const updateViewport = () => {
			const rect = viewport.getBoundingClientRect();
			const width = Math.max(1, viewport.clientWidth || rect.width);
			const height = Math.max(1, viewport.clientHeight || rect.height);
			setViewportSize((current) => (current.width === width && current.height === height ? current : { width, height }));
		};

		updateViewport();
		const resizeObserver = new ResizeObserver(updateViewport);
		resizeObserver.observe(viewport);
		return () => resizeObserver.disconnect();
	}, []);

	return (
		<div
			ref={viewportRef}
			className="battlefield"
			data-battle-terrain={battleTerrain}
			data-battle-camera-ready={viewportSize.width > 1 && viewportSize.height > 1 ? 'true' : 'false'}
			data-testid="battlefield"
			role="region"
			aria-label="Battlefield"
		>
			<BattlePixiScene
				battleTerrain={battleTerrain}
				encounter={encounter}
				targetEnemyId={targetEnemyId}
				selectedTargetUserId={selectedTargetUserId}
				targetMode={targetMode}
				viewportRef={viewportRef}
				viewportSize={viewportSize}
				camera={camera}
				enemyPlacements={enemyPlacements}
				partyPlacements={partyPlacements}
				onError={setBattleGraphicsError}
			/>
			<div className="battlefield-arena" data-testid="battlefield-arena">
				<div className="battlefield-arena-row battlefield-arena-enemy-row" role="group" aria-label="Enemies">
					{encounter.enemies.map((enemy, index) => {
						const slot = enemySlots[index];
						const placement = enemyPlacements[index];
						const selected = targetEnemyId === enemy.id && targetMode === 'enemy';
						const defeated = enemy.currentHealth === 0;
						const targetable = !interactionDisabled && targetMode === 'enemy' && !defeated;
						const stageSize = battleActorStageSize(viewportSize, 'enemy', enemySlots.length, placement.scale);
						return (
							<div
								key={enemy.id}
								className={classNames('battle-arena-actor', 'battle-arena-actor-enemy', defeated && 'battle-arena-actor-defeated')}
								style={arenaSlotStyle(placement, stageSize)}
								data-testid="battle-arena-actor"
								data-arena-side="enemy"
								data-arena-row={slot.row}
								data-arena-count={encounter.enemies.length}
								data-arena-depth={slot.depth}
								data-enemy-id={enemy.id}
							>
								<button
									type="button"
									className={classNames('battle-enemy', 'battle-arena-target', targetable && 'battle-targetable')}
									data-testid="battle-enemy"
									data-enemy-id={enemy.id}
									data-selected={selected}
									aria-label={[
										enemy.displayName,
										defeated ? 'defeated' : 'standing',
										`${enemy.currentHealth} of ${enemy.maxHealth} health`,
										targetable ? 'targetable' : null,
									]
										.filter((value): value is string => value !== null)
										.join(', ')}
									aria-pressed={selected}
									disabled={interactionDisabled || defeated || targetMode !== 'enemy'}
									onClick={() => onEnemySelect(enemy.id)}
								>
									<span className="sr-only">{enemy.displayName}</span>
								</button>
								{selected ? <span className="battle-target-ellipse" data-testid="battle-target-ellipse" aria-hidden="true" /> : null}
							</div>
						);
					})}
				</div>

				<div className="battlefield-arena-row battlefield-arena-party-row" role="group" aria-label="Party formation">
					{encounter.members.map((member, index) => {
						const slot = partySlots[index];
						const placement = partyPlacements[index];
						const memberName = partyMemberName(member.userId);
						const selected = selectedTargetUserId === member.userId && targetMode === 'ally';
						const targetable = !interactionDisabled && targetMode === 'ally';
						const stageSize = battleActorStageSize(viewportSize, 'party', partySlots.length, placement.scale);
						const isCurrentUser = member.userId === userId;
						return (
							<div
								key={member.userId}
								className="battle-arena-actor battle-arena-actor-party"
								style={arenaSlotStyle(placement, stageSize)}
								data-testid="battle-arena-actor"
								data-arena-side="party"
								data-arena-row={slot.row}
								data-arena-count={encounter.members.length}
								data-arena-depth={slot.depth}
								data-member-id={member.userId}
							>
								<button
									type="button"
									className={classNames('battle-party-member', 'battle-arena-target', targetable && 'battle-targetable')}
									data-testid="battle-party-member"
									data-member-id={member.userId}
									data-selected={selected}
									aria-label={[
										memberName,
										isCurrentUser ? 'you' : null,
										label(member.classKey),
										`${member.currentHealth} of ${member.maxHealth} health`,
										plannedCardName(member),
										targetable ? 'targetable' : null,
									]
										.filter((value): value is string => value !== null)
										.join(', ')}
									aria-pressed={selected}
									disabled={interactionDisabled || targetMode !== 'ally'}
									onClick={() => onAllySelect(member.userId)}
								>
									<span className="sr-only">{memberName}</span>
								</button>
								{selected ? <span className="battle-target-ellipse" data-testid="battle-target-ellipse" aria-hidden="true" /> : null}
							</div>
						);
					})}
				</div>
				<div className="battlefield-arena-label-layer" data-testid="battlefield-arena-label-layer" aria-hidden="true">
					{encounter.enemies.map((enemy, index) => {
						const slot = enemySlots[index];
						const placement = enemyPlacements[index];
						const stageSize = battleActorStageSize(viewportSize, 'enemy', enemySlots.length, placement.scale);
						const defeated = enemy.currentHealth === 0;
						return (
							<div
								key={enemy.id}
								className="battle-arena-label battle-arena-label-enemy"
								style={arenaLabelStyle(placement, stageSize, slot.row)}
								data-arena-side="enemy"
								data-arena-row={slot.row}
								data-arena-count={encounter.enemies.length}
								data-enemy-id={enemy.id}
							>
								<BattleArenaMeta
									side="enemy"
									displayName={enemy.displayName}
									secondaryLabel={defeated ? 'Defeated' : null}
									currentHealth={enemy.currentHealth}
									maxHealth={enemy.maxHealth}
								/>
							</div>
						);
					})}
					{encounter.members.map((member, index) => {
						const slot = partySlots[index];
						const placement = partyPlacements[index];
						const stageSize = battleActorStageSize(viewportSize, 'party', partySlots.length, placement.scale);
						const memberName = partyMemberName(member.userId);
						return (
							<div
								key={member.userId}
								className="battle-arena-label battle-arena-label-party"
								style={arenaLabelStyle(placement, stageSize, slot.row)}
								data-arena-side="party"
								data-arena-row={slot.row}
								data-arena-count={encounter.members.length}
								data-member-id={member.userId}
							>
								<BattleArenaMeta
									side="party"
									displayName={memberName}
									secondaryLabel={label(member.classKey)}
									currentHealth={member.currentHealth}
									maxHealth={member.maxHealth}
									isCurrentUser={member.userId === userId}
								/>
							</div>
						);
					})}
				</div>
			</div>
			{battleGraphicsError ? (
				<p className="battle-pixi-error" role="status">
					Battlefield visuals could not load. Targeting controls remain available.
				</p>
			) : null}

			<div className="battlefield-vignette" aria-hidden="true" />
		</div>
	);
}

function BattleCommandTray({
	encounter,
	currentMember,
	readOnly,
	plays,
	inventory,
	selectedCardKey,
	selectedPlayIndex,
	actionPending,
	actionBusy,
	onCardActivate,
	onPlayActivate,
	onPlayFocus,
	onPlayReorder,
	onSubmitPlan,
}: BattleCommandTrayProps) {
	const [category, setCategory] = useState<CardCategory>('all');
	const [handScrollState, setHandScrollState] = useState({ atStart: true, atEnd: true });
	const [hoveredFanCardId, setHoveredFanCardId] = useState<string | null>(null);
	const [focusedFanCardId, setFocusedFanCardId] = useState<string | null>(null);
	const [touchPreviewId, setTouchPreviewId] = useState<string | null>(null);
	const [renderedPreviewId, setRenderedPreviewId] = useState<string | null>(null);
	const [previewPhase, setPreviewPhase] = useState<BattleCardPreviewPhase | null>(null);
	const [previewAnchor, setPreviewAnchor] = useState<{ left: number; bottom: number } | null>(null);
	const handFrameRef = useRef<HTMLDivElement>(null);
	const handViewportRef = useRef<HTMLDivElement>(null);
	const handScrollLeftRef = useRef<number | null>(null);
	const fanCardSlotRefs = useRef(new Map<string, HTMLDivElement>());
	const previewCloseTimerRef = useRef<number | null>(null);
	const handPointerRef = useRef<BattleHandPointerState | null>(null);
	const reorderPointerRef = useRef<BattleReorderPointerState | null>(null);
	const suppressCardClickRef = useRef(false);
	const lastPointerTypeRef = useRef('mouse');
	const [draggedPlayIndex, setDraggedPlayIndex] = useState<number | null>(null);
	const [reorderDropIndex, setReorderDropIndex] = useState<number | null>(null);
	const selectedCard = currentMember.cards.find((card) => card.key === selectedCardKey);
	const playableCards = currentMember.cards.filter((card) => !card.locked);
	const queuedCardKeys = new Set(plays.map((play) => play.cardKey));
	const categoryCards = playableCards.filter((card) => category === 'all' || cardCategory(card) === category);
	const categoryCardKeys = new Set(categoryCards.map((card) => card.key));
	const visibleCards = playableCards.filter((card) => queuedCardKeys.has(card.key) || categoryCardKeys.has(card.key));
	const availableCardKeys = new Set(
		categoryCards.filter((card) => !queuedCardKeys.has(card.key) || card.repeatable).map((card) => card.key),
	);
	const handCards: BattleFanCardEntry[] = cardsForPlanFan(visibleCards, plays, availableCardKeys);
	const firstAvailableIndex = handCards.findIndex(({ playIndex }) => playIndex === null);
	const interactionDisabled = readOnly || encounter.status === 'completed' || actionBusy;
	const standingEnemies = encounter.enemies.some((enemy) => enemy.currentHealth > 0);
	const hasTarget = hasAvailableTarget(selectedCard, standingEnemies, encounter.members.length);
	const targetNote = plays.length === 0 ? EMPTY_PLAN_NOTE : targetInstruction(selectedCard);
	const selectedCardEffects = selectedCard?.preview?.effects ?? [];
	const selectedCardEffectLabel = selectedCardEffects.length > 0 ? selectedCardEffects.map(previewEffectLabel).join(' · ') : null;
	const queuedItemKeys = new Set(
		plays.flatMap((play) => {
			const card = cardForPlay(currentMember, play);
			return card?.sourceKind === 'item' ? [card.sourceKey] : [];
		}),
	);
	const categoryCounts = playableCards.reduce<Record<Exclude<CardCategory, 'all'>, number>>(
		(counts, card) => ({ ...counts, [cardCategory(card)]: counts[cardCategory(card)] + 1 }),
		{ class: 0, equipment: 0, item: 0 },
	);
	const cardInteractionState = (entry: BattleFanCardEntry) => {
		const { card, playIndex } = entry;
		const queuedCount = plays.filter((play) => play.cardKey === card.key).length;
		const isQueuedCard = playIndex !== null;
		const itemEntry = card.sourceKind === 'item' ? inventoryEntryForCard(card, inventory) : undefined;
		const itemTypeBlocked = !isQueuedCard && card.sourceKind === 'item' && !queuedItemKeys.has(card.sourceKey) && queuedItemKeys.size >= 2;
		const quantityBlocked = !isQueuedCard && card.sourceKind === 'item' && itemEntry !== undefined && queuedCount >= itemEntry.quantity;
		const capacityBlocked = !isQueuedCard && plays.length >= currentMember.playSlots;
		const disabled = interactionDisabled || (!isQueuedCard && (capacityBlocked || itemTypeBlocked || quantityBlocked));

		return {
			queuedCount,
			disabled,
			disabledReason: cardDisabledReason({ itemTypeBlocked, quantityBlocked, capacityBlocked }),
		};
	};
	const fanCardIds = handCards.map(battleFanCardInstanceId).join('|');
	const intentPreviewId = hoveredFanCardId ?? focusedFanCardId ?? touchPreviewId;
	const intentPreviewEntry = intentPreviewId ? handCards.find((entry) => battleFanCardInstanceId(entry) === intentPreviewId) : undefined;
	const intentPreviewState = intentPreviewEntry ? cardInteractionState(intentPreviewEntry) : null;
	const intentPreviewCanShow = intentPreviewEntry !== undefined && intentPreviewState !== null && !intentPreviewState.disabled;
	const previewId = renderedPreviewId;
	const previewEntry = previewId ? handCards.find((entry) => battleFanCardInstanceId(entry) === previewId) : undefined;
	const previewState = previewEntry ? cardInteractionState(previewEntry) : null;
	const previewCanShow = previewEntry !== undefined && previewState !== null && (!previewState.disabled || previewPhase === 'closing');
	const previewRender =
		previewEntry !== undefined && previewState !== null && previewAnchor !== null && (!previewState.disabled || previewPhase === 'closing')
			? { entry: previewEntry, anchor: previewAnchor }
			: null;

	const clearPreviewCloseTimer = () => {
		if (previewCloseTimerRef.current === null) return;
		window.clearTimeout(previewCloseTimerRef.current);
		previewCloseTimerRef.current = null;
	};
	const clearPreviewIntent = () => {
		clearPreviewCloseTimer();
		setHoveredFanCardId(null);
		setFocusedFanCardId(null);
		setTouchPreviewId(null);
	};
	const scheduleHoverPreview = (instanceId: string, disabled: boolean) => {
		clearPreviewCloseTimer();
		if (disabled) return;
		setHoveredFanCardId(instanceId);
	};
	const schedulePreviewClose = () => {
		clearPreviewCloseTimer();
		if (prefersReducedMotion()) {
			setHoveredFanCardId(null);
			return;
		}
		previewCloseTimerRef.current = window.setTimeout(() => {
			previewCloseTimerRef.current = null;
			setHoveredFanCardId(null);
		}, BATTLE_CARD_PREVIEW_CLOSE_GRACE_MS);
	};
	const activateFanCard = (entry: BattleFanCardEntry) => {
		clearPreviewIntent();
		if (entry.playIndex !== null) {
			onPlayActivate(entry.playIndex);
			return;
		}
		onCardActivate(entry.card.key);
	};
	const handleFanCardClick = (entry: BattleFanCardEntry) => {
		if (suppressCardClickRef.current) {
			suppressCardClickRef.current = false;
			return;
		}

		if (entry.playIndex !== null) {
			activateFanCard(entry);
			return;
		}

		const instanceId = battleFanCardInstanceId(entry);
		if (lastPointerTypeRef.current === 'touch' && touchPreviewId !== instanceId) {
			clearPreviewIntent();
			setTouchPreviewId(instanceId);
			return;
		}

		activateFanCard(entry);
	};
	const handleReorderPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, playIndex: number) => {
		if (interactionDisabled) return;
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		onPlayFocus(playIndex);
		reorderPointerRef.current = {
			pointerId: event.pointerId,
			playIndex,
			startX: event.clientX,
			startY: event.clientY,
			active: false,
			dropIndex: null,
		};
		setDraggedPlayIndex(null);
		setReorderDropIndex(null);
		clearPreviewIntent();
	};
	const handleReorderPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		const pointer = reorderPointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId) return;

		if (!pointer.active) {
			const deltaX = Math.abs(event.clientX - pointer.startX);
			const deltaY = Math.abs(event.clientY - pointer.startY);
			if (Math.max(deltaX, deltaY) < BATTLE_CARD_REORDER_THRESHOLD_PX) return;
			pointer.active = true;
			setDraggedPlayIndex(pointer.playIndex);
		}

		const target = document
			.elementFromPoint(event.clientX, event.clientY)
			?.closest<HTMLElement>('.battle-fan-card-slot[data-queued="true"]');
		const targetIndex = target ? Number.parseInt(target.dataset.playIndex ?? '', 10) : Number.NaN;
		const nextDropIndex = Number.isInteger(targetIndex) && targetIndex !== pointer.playIndex ? targetIndex : null;
		if (pointer.dropIndex === nextDropIndex) return;
		pointer.dropIndex = nextDropIndex;
		setReorderDropIndex(nextDropIndex);
	};
	const handleReorderPointerEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		const pointer = reorderPointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		if (pointer.active && pointer.dropIndex !== null) onPlayReorder(pointer.playIndex, pointer.dropIndex);
		reorderPointerRef.current = null;
		setDraggedPlayIndex(null);
		setReorderDropIndex(null);
	};
	const handleReorderPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		const pointer = reorderPointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		reorderPointerRef.current = null;
		setDraggedPlayIndex(null);
		setReorderDropIndex(null);
	};
	const handleReorderKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, playIndex: number) => {
		if (interactionDisabled) return;
		const targetIndex = (() => {
			switch (event.key) {
				case 'ArrowLeft':
				case 'ArrowUp':
					return playIndex - 1;
				case 'ArrowRight':
				case 'ArrowDown':
					return playIndex + 1;
				case 'Home':
					return 0;
				case 'End':
					return plays.length - 1;
				default:
					return null;
			}
		})();
		if (targetIndex === null || targetIndex < 0 || targetIndex >= plays.length || targetIndex === playIndex) return;
		event.preventDefault();
		event.stopPropagation();
		onPlayReorder(playIndex, targetIndex);
	};
	const handleHandPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		lastPointerTypeRef.current = event.pointerType;
		suppressCardClickRef.current = false;
		handPointerRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			panning: false,
		};
	};
	const handleHandPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		const pointer = handPointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId || pointer.panning) return;

		const deltaX = Math.abs(event.clientX - pointer.startX);
		const deltaY = Math.abs(event.clientY - pointer.startY);
		if (deltaX < BATTLE_CARD_HAND_PAN_THRESHOLD_PX || deltaX <= deltaY) return;

		pointer.panning = true;
		suppressCardClickRef.current = true;
		clearPreviewIntent();
	};
	const handleHandPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
		const pointer = handPointerRef.current;
		if (pointer?.pointerId !== event.pointerId) return;

		handPointerRef.current = null;
		if (pointer.panning) {
			window.setTimeout(() => {
				suppressCardClickRef.current = false;
			}, 0);
		}
	};

	useEffect(() => {
		const viewport = handViewportRef.current;
		if (!viewport) return;
		let frameId: number | null = null;

		const updateScrollState = () => {
			// The hand is horizontally scrollable, but its bottom peek must never become a vertical scroll position.
			if (viewport.scrollTop !== 0) viewport.scrollTop = 0;
			const horizontalScrollChanged = handScrollLeftRef.current !== null && Math.abs(handScrollLeftRef.current - viewport.scrollLeft) > 1;
			handScrollLeftRef.current = viewport.scrollLeft;
			if (horizontalScrollChanged) clearPreviewIntent();
			if (frameId !== null) return;
			frameId = window.requestAnimationFrame(() => {
				frameId = null;
				const maximumScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
				const nextState = {
					atStart: viewport.scrollLeft <= 1,
					atEnd: viewport.scrollLeft >= maximumScroll - 1,
				};

				setHandScrollState((currentState) =>
					currentState.atStart === nextState.atStart && currentState.atEnd === nextState.atEnd ? currentState : nextState,
				);
				updateHandCardEdgeFades(viewport);
			});
		};

		updateScrollState();
		viewport.addEventListener('scroll', updateScrollState, { passive: true });
		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(viewport);
		if (viewport.firstElementChild instanceof HTMLElement) resizeObserver.observe(viewport.firstElementChild);

		return () => {
			if (frameId !== null) window.cancelAnimationFrame(frameId);
			viewport.removeEventListener('scroll', updateScrollState);
			resizeObserver.disconnect();
		};
	}, [category, handCards.length, plays.length, selectedCardKey, selectedPlayIndex]);

	useEffect(() => {
		const validCardIds = new Set(handCards.map(battleFanCardInstanceId));
		if (hoveredFanCardId !== null && !validCardIds.has(hoveredFanCardId)) setHoveredFanCardId(null);
		if (focusedFanCardId !== null && !validCardIds.has(focusedFanCardId)) setFocusedFanCardId(null);
		if (touchPreviewId !== null && !validCardIds.has(touchPreviewId)) setTouchPreviewId(null);
		if (renderedPreviewId !== null && !validCardIds.has(renderedPreviewId)) {
			setRenderedPreviewId(null);
			setPreviewPhase(null);
		}
	}, [fanCardIds, focusedFanCardId, hoveredFanCardId, renderedPreviewId, touchPreviewId]);

	useEffect(() => {
		if (intentPreviewId !== null && intentPreviewCanShow) {
			if (renderedPreviewId !== intentPreviewId) {
				setRenderedPreviewId(intentPreviewId);
				setPreviewPhase('opening');
			} else if (previewPhase === 'closing') {
				setPreviewPhase('opening');
			}
			return;
		}

		if (renderedPreviewId !== null && previewPhase !== 'closing') setPreviewPhase('closing');
	}, [intentPreviewCanShow, intentPreviewId, previewPhase, renderedPreviewId]);

	useEffect(() => {
		if (renderedPreviewId === null || previewPhase !== 'closing') return;

		const closeTimer = window.setTimeout(
			() => {
				setRenderedPreviewId(null);
				setPreviewPhase(null);
			},
			prefersReducedMotion() ? 0 : BATTLE_CARD_PREVIEW_TRANSITION_MS,
		);

		return () => window.clearTimeout(closeTimer);
	}, [previewPhase, renderedPreviewId]);

	useEffect(() => {
		return () => {
			clearPreviewCloseTimer();
		};
	}, []);

	useEffect(() => {
		if (touchPreviewId === null) return;

		const closeTouchPreview = (event: PointerEvent) => {
			if (event.pointerType !== 'touch') return;
			const target = event.target;
			if (target instanceof Element && target.closest('.battle-fan-card, .battle-card-preview')) return;
			setTouchPreviewId(null);
			setFocusedFanCardId(null);
			setHoveredFanCardId(null);
		};

		document.addEventListener('pointerdown', closeTouchPreview, true);
		return () => document.removeEventListener('pointerdown', closeTouchPreview, true);
	}, [touchPreviewId]);

	useEffect(() => {
		const frame = handFrameRef.current;
		const viewport = handViewportRef.current;
		const previewSlot = previewId ? fanCardSlotRefs.current.get(previewId) : undefined;
		if (!frame || !viewport || !previewId || !previewCanShow || !previewSlot) {
			if (!previewId || !previewCanShow) setPreviewAnchor(null);
			return;
		}

		let frameId: number | null = null;
		const updatePreviewAnchor = () => {
			if (frameId !== null) return;
			frameId = window.requestAnimationFrame(() => {
				frameId = null;
				const slotRect = previewSlot.getBoundingClientRect();
				const viewportRect = viewport.getBoundingClientRect();
				const frameRect = frame.getBoundingClientRect();
				const slotIsVisible = slotRect.right > viewportRect.left && slotRect.left < viewportRect.right;
				if (!slotIsVisible) {
					setPreviewAnchor(null);
					return;
				}

				const nextAnchor = {
					left: slotRect.left + slotRect.width / 2 - frameRect.left,
					bottom: Math.max(0, frameRect.bottom - slotRect.bottom),
				};
				setPreviewAnchor((currentAnchor) =>
					currentAnchor?.left === nextAnchor.left && currentAnchor.bottom === nextAnchor.bottom ? currentAnchor : nextAnchor,
				);
			});
		};

		updatePreviewAnchor();
		viewport.addEventListener('scroll', updatePreviewAnchor, { passive: true });
		window.addEventListener('resize', updatePreviewAnchor);
		const resizeObserver = new ResizeObserver(updatePreviewAnchor);
		resizeObserver.observe(frame);
		resizeObserver.observe(previewSlot);

		return () => {
			if (frameId !== null) window.cancelAnimationFrame(frameId);
			viewport.removeEventListener('scroll', updatePreviewAnchor);
			window.removeEventListener('resize', updatePreviewAnchor);
			resizeObserver.disconnect();
		};
	}, [fanCardIds, previewCanShow, previewId]);

	return (
		<div className="battle-command-tray" data-testid="battle-command-tray">
			<div className="battle-command-center" data-testid="battle-command-center">
				<div className="battle-card-command-layout" data-plan-state={plays.length === 0 ? 'empty' : 'queued'}>
					<div className="battle-hand-column">
						<div className="battle-hand-header">
							<div className="battle-hand-heading">
								<span className="game-pixel-label">Your hand</span>
								<span>{handCards.filter(({ playIndex }) => playIndex === null).length} available</span>
								<span className="battle-hand-plan" data-testid="battle-plan-summary">
									<Check className="size-3" aria-hidden="true" />
									<span>
										Plan {plays.length}/{currentMember.playSlots}
									</span>
								</span>
							</div>
							<div className="battle-card-filter-bar" role="tablist" aria-label="Card categories">
								{CARD_CATEGORIES.map((option) => {
									const count = option === 'all' ? playableCards.length : categoryCounts[option];
									const active = category === option;
									return (
										<button
											key={option}
											type="button"
											role="tab"
											className={classNames('battle-card-filter', active && 'battle-card-filter-active')}
											data-category={option}
											data-testid={`battle-card-filter-${option}`}
											aria-selected={active}
											tabIndex={active ? 0 : -1}
											onKeyDown={(event) => {
												const nextCategory = categoryAfterKey(option, event.key);
												if (nextCategory === null) return;
												event.preventDefault();
												setCategory(nextCategory);
												requestAnimationFrame(() => {
													document.querySelector<HTMLButtonElement>(`[data-testid="battle-card-filter-${nextCategory}"]`)?.focus();
												});
											}}
											onClick={() => setCategory(option)}
										>
											<span>{cardCategoryLabel(option)}</span>
											<span>{count}</span>
										</button>
									);
								})}
							</div>
						</div>

						<div
							ref={handFrameRef}
							className="battle-card-hand-frame"
							data-testid="battle-card-hand-frame"
							data-has-left-overflow={!handScrollState.atStart}
							data-has-right-overflow={!handScrollState.atEnd}
						>
							<p className={classNames('battle-fan-target-note', !hasTarget && 'battle-command-target-note-missing')}>
								<Target className="size-3.5" aria-hidden="true" />
								<span className="battle-fan-target-note-copy">
									{selectedCardEffectLabel ? <strong data-testid="battle-card-preview-detail">{selectedCardEffectLabel}</strong> : null}
									<span>{targetNote}</span>
								</span>
							</p>
							<div
								ref={handViewportRef}
								className="battle-card-hand-viewport"
								data-testid="battle-card-hand-viewport"
								data-has-left-overflow={!handScrollState.atStart}
								data-has-right-overflow={!handScrollState.atEnd}
								tabIndex={0}
								aria-label="Available card hand. Scroll horizontally to browse cards."
								onPointerDown={handleHandPointerDown}
								onPointerMove={handleHandPointerMove}
								onPointerUp={handleHandPointerEnd}
								onPointerCancel={handleHandPointerEnd}
							>
								<div className="battle-card-hand" data-testid="battle-card-fan" aria-label={`${cardCategoryLabel(category)} cards in hand`}>
									{handCards.length > 0 ? (
										<>
											{firstAvailableIndex > 0 ? (
												<div
													className="battle-fan-plan-boundary"
													data-testid="battle-plan-boundary"
													role="separator"
													aria-label="Available cards"
												>
													<span aria-hidden="true">Available</span>
												</div>
											) : null}
											{handCards.map((entry, index) => {
												const { card, queuedOrder, playIndex } = entry;
												const { queuedCount, disabled, disabledReason } = cardInteractionState(entry);
												const isQueuedCard = playIndex !== null;
												const focused = isQueuedCard && selectedPlayIndex === playIndex;
												const cardMeta = [targetLabel(card.targetMode), card.repeatable ? 'add again' : null]
													.filter((value): value is string => value !== null)
													.join(' · ');
												const effectAnnouncement = previewEffectAnnouncement(card);
												const instanceId = battleFanCardInstanceId(entry);
												const previewActive = previewRender !== null && battleFanCardInstanceId(previewRender.entry) === instanceId;
												const ariaLabel = [
													card.displayName,
													effectAnnouncement,
													card.description,
													cardMeta,
													isQueuedCard ? `queued play ${queuedOrder}` : 'available card',
													isQueuedCard
														? focused
															? 'focused for targeting; click to remove this play'
															: 'click to remove this play; use the reorder handle to move it'
														: 'click to add to plan',
													disabledReason,
												]
													.filter((value): value is string => value !== null)
													.join(', ');
												return (
													<div
														key={instanceId}
														className="battle-fan-card-slot"
														data-queued={isQueuedCard}
														data-focused={focused}
														data-preview-active={previewActive}
														data-play-index={playIndex === null ? undefined : playIndex}
														data-dragging={isQueuedCard && draggedPlayIndex === playIndex}
														data-drop-target={isQueuedCard && reorderDropIndex === playIndex}
														style={fanCardStyle(index, handCards.length, isQueuedCard, focused)}
														ref={(node) => {
															if (node) fanCardSlotRefs.current.set(instanceId, node);
															else fanCardSlotRefs.current.delete(instanceId);
														}}
														onMouseEnter={() => {
															scheduleHoverPreview(instanceId, disabled);
														}}
														onMouseMove={() => {
															scheduleHoverPreview(instanceId, disabled);
														}}
														onMouseLeave={schedulePreviewClose}
													>
														<button
															type="button"
															className={classNames('battle-fan-card', focused && 'battle-fan-card-focused')}
															data-testid={
																isQueuedCard ? `battle-queued-card-${queuedOrder}` : 'battle-card-' + card.key.replaceAll(':', '-')
															}
															data-card-key={card.key}
															data-category={cardCategory(card)}
															data-queued={isQueuedCard}
															data-queued-count={queuedCount > 0 ? queuedCount : null}
															data-queued-order={queuedOrder}
															data-play-index={playIndex}
															aria-label={ariaLabel}
															aria-pressed={isQueuedCard ? focused : undefined}
															disabled={disabled}
															title={disabledReason ?? undefined}
															onPointerDown={(event) => {
																lastPointerTypeRef.current = event.pointerType;
															}}
															onKeyDown={(event) => {
																if (event.key === 'Enter' || event.key === ' ') lastPointerTypeRef.current = 'keyboard';
															}}
															onFocus={() => {
																clearPreviewCloseTimer();
																if (!disabled) {
																	setFocusedFanCardId(instanceId);
																	if (playIndex !== null) onPlayFocus(playIndex);
																}
															}}
															onBlur={() => setFocusedFanCardId(null)}
															onClick={() => handleFanCardClick(entry)}
														>
															<BattleFanCardSurface card={card} inventory={inventory} queuedOrder={queuedOrder} />
														</button>
														{playIndex !== null ? (
															<button
																type="button"
																className="battle-fan-card-reorder-handle"
																data-testid={`battle-reorder-handle-${queuedOrder}`}
																data-play-index={playIndex}
																aria-label={`Reorder ${card.displayName}. Use arrow keys to move it.`}
																disabled={disabled}
																onPointerDown={(event) => handleReorderPointerDown(event, playIndex)}
																onPointerMove={handleReorderPointerMove}
																onPointerUp={handleReorderPointerEnd}
																onPointerCancel={handleReorderPointerCancel}
																onFocus={() => onPlayFocus(playIndex)}
																onKeyDown={(event) => handleReorderKeyDown(event, playIndex)}
																onClick={(event) => event.stopPropagation()}
															>
																<GripVertical className="size-3" aria-hidden="true" />
															</button>
														) : null}
													</div>
												);
											})}
										</>
									) : (
										<p className="battle-card-hand-empty">No cards in this category yet.</p>
									)}
								</div>
							</div>
							<div className="battle-card-preview-layer" data-testid="battle-card-preview-layer" aria-hidden="true">
								{previewRender ? (
									<div
										className="battle-card-preview"
										data-testid="battle-card-preview"
										data-card-key={previewRender.entry.card.key}
										data-category={cardCategory(previewRender.entry.card)}
										data-queued={previewRender.entry.playIndex !== null}
										data-preview-phase={previewPhase}
										style={
											{
												'--battle-card-preview-left': `${previewRender.anchor.left}px`,
												'--battle-card-preview-bottom': `${previewRender.anchor.bottom}px`,
											} as CSSProperties
										}
									>
										<BattleFanCardSurface
											card={previewRender.entry.card}
											inventory={inventory}
											queuedOrder={previewRender.entry.queuedOrder}
										/>
									</div>
								) : null}
							</div>
						</div>
					</div>
					<div className="battle-plan-action" data-testid="battle-plan-action">
						<Button
							game
							size="sm"
							className="battle-save-plan-button"
							data-testid="battle-save-plan"
							aria-label={actionPending ? 'Saving battle plan' : 'Ready — lock battle plan'}
							title="Lock this battle plan"
							disabled={interactionDisabled || actionPending || !hasTarget}
							onClick={onSubmitPlan}
						>
							<Check className="size-3.5" aria-hidden="true" /> {actionPending ? 'Saving…' : 'Ready'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

export function BattleScene({
	encounter,
	currentMember,
	battleTerrain,
	userId,
	readOnly,
	plays,
	inventory,
	selectedCardKey,
	selectedPlayIndex,
	targetEnemyId,
	selectedTargetUserId,
	actionPending,
	actionBusy,
	actionError,
	commandState,
	partyMemberName,
	onCardActivate,
	onPlayActivate,
	onPlayFocus,
	onPlayReorder,
	onEnemySelect,
	onAllySelect,
	onSubmitPlan,
}: BattleSceneProps) {
	const selectedCard = currentMember.cards.find((card) => card.key === selectedCardKey);

	return (
		<section className="battle-scene" data-testid="combat-scene" aria-labelledby="battle-scene-heading">
			<h2 id="battle-scene-heading" className="sr-only">
				Battle encounter
			</h2>

			<div className={`battle-status battle-status-${commandState}`} data-state={commandState} data-testid="battle-status" role="status">
				{commandState === 'readonly' ? (
					<>
						<Shield className="size-4" aria-hidden="true" /> This encounter is read-only because the expedition is closed.
					</>
				) : commandState === 'resolved' ? (
					<>
						<Check className="size-4" aria-hidden="true" /> This encounter has resolved. Review the daily chronicle for the outcome.
					</>
				) : commandState === 'saving' ? (
					<>
						<Sparkles className="size-4" aria-hidden="true" /> Saving your daily card plan…
					</>
				) : commandState === 'edited' ? (
					<>
						<Sparkles className="size-4" aria-hidden="true" /> Review your cards and save the updated plan.
					</>
				) : commandState === 'saved' ? (
					<>
						<Check className="size-4" aria-hidden="true" /> Your daily plan is locked in for resolution.
					</>
				) : (
					<>
						<Sparkles className="size-4" aria-hidden="true" /> Card hand phase · {plays.length}/{currentMember.playSlots} card slots queued
					</>
				)}
			</div>

			<div className="battle-stage">
				<Battlefield
					encounter={encounter}
					battleTerrain={battleTerrain}
					userId={userId}
					readOnly={readOnly}
					actionBusy={actionBusy}
					targetEnemyId={targetEnemyId}
					selectedTargetUserId={selectedTargetUserId}
					targetMode={selectedPlayIndex === null ? null : (selectedCard?.targetMode ?? null)}
					partyMemberName={partyMemberName}
					onEnemySelect={onEnemySelect}
					onAllySelect={onAllySelect}
				/>

				<BattleCommandTray
					encounter={encounter}
					currentMember={currentMember}
					readOnly={readOnly}
					plays={plays}
					inventory={inventory}
					selectedCardKey={selectedCardKey}
					selectedPlayIndex={selectedPlayIndex}
					actionPending={actionPending}
					actionBusy={actionBusy}
					onCardActivate={onCardActivate}
					onPlayActivate={onPlayActivate}
					onPlayFocus={onPlayFocus}
					onPlayReorder={onPlayReorder}
					onSubmitPlan={onSubmitPlan}
				/>
			</div>

			{actionError && (
				<p className="battle-error" role="alert">
					{actionError.message}
				</p>
			)}
		</section>
	);
}
