import { Check, ChevronLeft, ChevronRight, HeartPulse, LockKeyhole, Shield, Sparkles, Swords, Target } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';

import { Button } from '#/components/ui/button';
import { Progress } from '#/components/ui/progress';
import { InventoryItemSprite } from '#/components/inventory/inventory-item-sprite';
import type { Encounter, Inventory } from '#/lib/api';
import type { CombatCommandState } from '#/lib/combat-command-state';
import { battleEnemyArtForArchetype, battlePartyArtForClass, gameplayBackgroundArt } from '#/lib/game-art';
import { BattleArt } from './battle-art';

type EncounterMember = Encounter['members'][number];
type EncounterCard = EncounterMember['cards'][number];
type CardPlay = EncounterMember['plan']['plays'][number];
type TargetMode = EncounterCard['targetMode'];
const CARD_CATEGORIES = ['all', 'class', 'equipment', 'item'] as const;
type CardCategory = (typeof CARD_CATEGORIES)[number];

export interface BattleSceneProps {
	encounter: Encounter;
	currentMember: EncounterMember;
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
	onPlayReorder: (fromIndex: number, toIndex: number) => void;
	onEnemySelect: (enemyId: string) => void;
	onAllySelect: (userId: string) => void;
	onSubmitPlan: () => void;
}

interface BattlefieldProps {
	encounter: Encounter;
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
			<span className="battle-card-copy">
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
				<small>{card.description}</small>
				<span>{cardMeta}</span>
			</span>
		</span>
	);
}

function cardSourceLabel(card: EncounterCard): string {
	if (card.sourceKind === 'class') return 'Skill';
	if (card.sourceKind === 'item') return 'Item';
	return 'Equipped';
}

function targetInstruction(card: EncounterCard | undefined): string {
	if (!card) return 'Choose a card from your hand to begin.';
	if (card.targetMode === 'none') return 'This card resolves without a target.';
	if (card.targetMode === 'enemy') {
		return 'Highlighted foes can receive this card. Leave the target untouched to use auto-targeting.';
	}
	return 'Highlighted travelers can receive this card. Leave the target untouched to use the lowest-health ally.';
}

function hasAvailableTarget(card: EncounterCard | undefined, standingEnemies: boolean, partyMemberCount: number): boolean {
	if (!card || card.targetMode === 'none') return true;
	if (card.targetMode === 'enemy') return standingEnemies;
	return partyMemberCount > 0;
}

function centeredFanPosition(index: number, cardCount: number, maxRotation: number, horizontalStep: number, verticalStep: number) {
	const centeredIndex = index - (cardCount - 1) / 2;
	const maxIndex = Math.max((cardCount - 1) / 2, 1);
	const normalizedIndex = centeredIndex / maxIndex;

	return {
		centeredIndex,
		rotation: cardCount > 1 ? normalizedIndex * maxRotation : 0,
		offset: cardCount > 1 ? centeredIndex * horizontalStep : 0,
		drop: cardCount > 1 ? Math.abs(centeredIndex) * verticalStep : 0,
	};
}

function fanCardStyle(index: number, cardCount: number, queued: boolean): CSSProperties {
	const { centeredIndex, rotation, offset, drop } = centeredFanPosition(index, cardCount, cardCount === 2 ? 5 : 7, 1.35, 0.55);
	const baseZIndex = Math.max(1, cardCount - Math.round(Math.abs(centeredIndex)));

	return {
		'--fan-offset': `${offset}rem`,
		'--fan-rotation': `${rotation}deg`,
		'--fan-drop': `${drop}rem`,
		zIndex: queued ? cardCount + 10 : baseZIndex,
	} as CSSProperties;
}

function queueCardStyle(index: number, cardCount: number, focused: boolean): CSSProperties {
	const { centeredIndex, rotation, offset, drop } = centeredFanPosition(index, cardCount, cardCount === 2 ? 3 : 4, 0.22, 0.12);
	const baseZIndex = Math.max(1, cardCount - Math.round(Math.abs(centeredIndex)));

	return {
		'--queue-fan-offset': `${offset}rem`,
		'--queue-fan-rotation': `${rotation}deg`,
		'--queue-fan-drop': `${drop}rem`,
		zIndex: focused ? cardCount + 1 : baseZIndex,
	} as CSSProperties;
}

function Battlefield({
	encounter,
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

	return (
		<div className="battlefield" data-testid="battlefield" role="region" aria-label="Battlefield">
			<div className="battlefield-light" aria-hidden="true" />
			<div className="battlefield-enemy-side" aria-label="Enemies">
				<div className="battlefield-side-label">
					<Shield className="size-3" aria-hidden="true" /> Foes
				</div>
				<div className="battle-enemy-formation">
					{encounter.enemies.map((enemy) => {
						const selected = targetEnemyId === enemy.id && targetMode === 'enemy';
						const defeated = enemy.currentHealth === 0;
						const targetable = !interactionDisabled && targetMode === 'enemy' && !defeated;
						const enemyArt = battleEnemyArtForArchetype(enemy.archetypeKey);
						return (
							<button
								key={enemy.id}
								type="button"
								className={classNames('battle-enemy', defeated && 'battle-enemy-defeated', targetable && 'battle-targetable')}
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
								<span className="battle-entity-stage battle-entity-stage-enemy">
									<BattleArt
										art={enemyArt}
										label={enemy.displayName}
										selected={selected}
										className="battle-enemy-art"
										testId={`battle-enemy-art-${enemy.archetypeKey}`}
									/>
									{selected ? <span className="battle-target-ellipse" data-testid="battle-target-ellipse" aria-hidden="true" /> : null}
								</span>
								<span className="battle-enemy-nameplate">
									<strong>{enemy.displayName}</strong>
									{defeated && <span>Defeated</span>}
								</span>
								<span className="battle-combatant-health">
									<span>
										{enemy.currentHealth}/{enemy.maxHealth} HP
									</span>
									<Progress value={healthPercent(enemy.currentHealth, enemy.maxHealth)} aria-label={`${enemy.displayName} health`} />
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="battlefield-party-side" aria-label="Party formation">
				<div className="battlefield-side-label">
					<Swords className="size-3" aria-hidden="true" /> Party
				</div>
				<div className="battle-party-formation">
					{encounter.members.map((member) => {
						const memberName = partyMemberName(member.userId);
						const selected = selectedTargetUserId === member.userId && targetMode === 'ally';
						const targetable = !interactionDisabled && targetMode === 'ally';
						const memberArt = battlePartyArtForClass(member.classKey);
						const isCurrentUser = member.userId === userId;
						return (
							<button
								key={member.userId}
								type="button"
								className={classNames('battle-party-member', targetable && 'battle-targetable')}
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
								<span className="battle-entity-stage battle-entity-stage-party">
									<BattleArt art={memberArt} label={memberName} selected={selected} className="battle-party-art" />
									{selected ? <span className="battle-target-ellipse" data-testid="battle-target-ellipse" aria-hidden="true" /> : null}
								</span>
								<span className="battle-party-nameplate">
									<strong>
										{memberName}
										{isCurrentUser ? <small>YOU</small> : null}
									</strong>
									<span>
										{label(member.classKey)} · {plannedCardName(member)}
									</span>
								</span>
								<span className="battle-combatant-health">
									<span>
										{member.currentHealth}/{member.maxHealth} HP
									</span>
									<Progress value={healthPercent(member.currentHealth, member.maxHealth)} aria-label={`${memberName} health`} />
								</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="battlefield-ground-line" aria-hidden="true" />
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
	onPlayReorder,
	onSubmitPlan,
}: BattleCommandTrayProps) {
	const [category, setCategory] = useState<CardCategory>('all');
	const selectedCard = currentMember.cards.find((card) => card.key === selectedCardKey);
	const playableCards = currentMember.cards.filter((card) => !card.locked);
	const handCards = playableCards.filter((card) => category === 'all' || cardCategory(card) === category);
	const interactionDisabled = readOnly || encounter.status === 'completed' || actionBusy;
	const standingEnemies = encounter.enemies.some((enemy) => enemy.currentHealth > 0);
	const hasTarget = hasAvailableTarget(selectedCard, standingEnemies, encounter.members.length);
	const targetNote = targetInstruction(selectedCard);
	const selectedPreview = selectedCard?.preview?.effects ?? [];
	const selectedPreviewLabel = selectedPreview.length > 0 ? selectedPreview.map(previewEffectLabel).join(' · ') : null;
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
	const reorderFromDrop = (event: DragEvent<HTMLElement>, targetIndex: number) => {
		event.preventDefault();
		const fromIndex = Number(event.dataTransfer.getData('text/plain'));
		if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= plays.length) return;
		if (fromIndex !== targetIndex) onPlayReorder(fromIndex, targetIndex);
	};

	return (
		<div className="battle-command-tray" data-testid="battle-command-tray">
			<div className="battle-command-center" data-testid="battle-command-center">
				<div className="battle-card-command-layout" data-queue-state={plays.length === 0 ? 'collapsed' : 'expanded'}>
					<aside
						className="battle-play-queue"
						data-testid="battle-play-queue"
						data-queue-state={plays.length === 0 ? 'collapsed' : 'expanded'}
						aria-label="Planned cards to play"
					>
						<div className="battle-play-queue-heading">
							<div className="battle-play-queue-title">
								<Check className="battle-play-queue-title-icon size-3" aria-hidden="true" />
								<span className="game-pixel-label">
									Plan · {plays.length}/{currentMember.playSlots}
								</span>
							</div>
							<div className="battle-queue-controls">
								{selectedPlayIndex !== null && selectedCard ? (
									<div className="battle-queue-order-controls" aria-label="Focused card order controls">
										<button
											type="button"
											className="battle-queue-control"
											aria-label={'Move ' + selectedCard.displayName + ' earlier'}
											disabled={interactionDisabled || selectedPlayIndex === 0}
											onClick={() => onPlayReorder(selectedPlayIndex, selectedPlayIndex - 1)}
										>
											<ChevronLeft className="size-4" aria-hidden="true" />
										</button>
										<button
											type="button"
											className="battle-queue-control"
											aria-label={'Move ' + selectedCard.displayName + ' later'}
											disabled={interactionDisabled || selectedPlayIndex === plays.length - 1}
											onClick={() => onPlayReorder(selectedPlayIndex, selectedPlayIndex + 1)}
										>
											<ChevronRight className="size-4" aria-hidden="true" />
										</button>
									</div>
								) : null}
							</div>
						</div>
						{plays.length > 0 ? (
							<div className="battle-play-queue-list" tabIndex={0} aria-label="Planned play order">
								{plays.map((play, index) => {
									const card = cardForPlay(currentMember, play);
									if (!card) return null;
									const focused = selectedPlayIndex === index;
									return (
										<div key={`${play.cardKey}-${index}`} style={queueCardStyle(index, plays.length, focused)}>
											<button
												type="button"
												className={classNames('battle-queued-card', focused && 'battle-queued-card-focused')}
												data-testid={`battle-queued-card-${index + 1}`}
												data-card-key={card.key}
												data-category={cardCategory(card)}
												data-focused={focused}
												data-play-order={index + 1}
												aria-label={[
													`${focused ? 'Remove' : 'Focus'} queued ${card.displayName}`,
													previewEffectAnnouncement(card),
													`play ${index + 1}`,
												]
													.filter((value): value is string => value !== null)
													.join(', ')}
												aria-pressed={focused}
												disabled={interactionDisabled}
												draggable={!interactionDisabled}
												onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
												onDragOver={(event) => event.preventDefault()}
												onDrop={(event) => reorderFromDrop(event, index)}
												onClick={() => onPlayActivate(index)}
											>
												<BattleCardFace card={card} inventory={inventory} playOrder={index + 1} />
											</button>
										</div>
									);
								})}
							</div>
						) : null}
					</aside>

					<div className="battle-hand-column">
						<div className="battle-hand-header">
							<div className="battle-hand-heading">
								<span className="game-pixel-label">Your hand</span>
								<span>{handCards.length} available</span>
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

						<div className="battle-card-hand-viewport" tabIndex={0} aria-label="Available card hand">
							<div className="battle-card-hand" data-testid="battle-card-fan" aria-label={`${cardCategoryLabel(category)} cards in hand`}>
								{handCards.length > 0 ? (
									handCards.map((card, index) => {
										const queuedCount = plays.filter((play) => play.cardKey === card.key).length;
										const queuedOrders = plays.flatMap((play, playIndex) => (play.cardKey === card.key ? [playIndex + 1] : []));
										const queuedOrderLabel = queuedOrders.length > 0 ? queuedOrders.join(',') : null;
										const itemEntry = card.sourceKind === 'item' ? inventoryEntryForCard(card, inventory) : undefined;
										const itemTypeBlocked = card.sourceKind === 'item' && !queuedItemKeys.has(card.sourceKey) && queuedItemKeys.size >= 2;
										const quantityBlocked = card.sourceKind === 'item' && itemEntry !== undefined && queuedCount >= itemEntry.quantity;
										const capacityBlocked = plays.length >= currentMember.playSlots && queuedCount === 0;
										const alreadyQueued = queuedCount > 0;
										const disabled = interactionDisabled || capacityBlocked || itemTypeBlocked || quantityBlocked;
										const cardMeta = [targetLabel(card.targetMode), card.repeatable ? 'add again' : null]
											.filter((value): value is string => value !== null)
											.join(' · ');
										const effectAnnouncement = previewEffectAnnouncement(card);
										const disabledReason = itemTypeBlocked
											? 'Two item types are already queued.'
											: quantityBlocked
												? 'You do not have another copy of this item.'
												: capacityBlocked
													? 'All play slots are full.'
													: null;
										const ariaLabel = [
											card.displayName,
											effectAnnouncement,
											card.description,
											cardMeta,
											queuedOrderLabel ? `selected for play ${queuedOrderLabel}` : null,
											disabledReason,
										]
											.filter((value): value is string => value !== null)
											.join(', ');
										return (
											<button
												key={card.key}
												type="button"
												className="battle-fan-card"
												data-testid={'battle-card-' + card.key.replaceAll(':', '-')}
												data-category={cardCategory(card)}
												data-queued={alreadyQueued}
												data-queued-count={queuedCount > 0 ? queuedCount : null}
												data-queued-order={queuedOrderLabel}
												aria-label={ariaLabel}
												disabled={disabled}
												title={disabledReason ?? undefined}
												style={fanCardStyle(index, handCards.length, alreadyQueued)}
												onMouseDown={(event) => event.preventDefault()}
												onClick={() => onCardActivate(card.key)}
											>
												{alreadyQueued ? (
													<span className="battle-fan-card-queued-badge" aria-hidden="true">
														<Check className="size-3" />
														<span>{queuedOrderLabel}</span>
													</span>
												) : null}
												<BattleCardFace card={card} inventory={inventory} />
											</button>
										);
									})
								) : (
									<p className="battle-card-hand-empty">No cards in this category yet.</p>
								)}
							</div>
						</div>

						<p className={classNames('battle-fan-target-note', !hasTarget && 'battle-command-target-note-missing')}>
							<Target className="size-3.5" aria-hidden="true" />
							<span className="battle-fan-target-note-copy">
								{selectedPreviewLabel ? <strong data-testid="battle-card-preview-detail">{selectedPreviewLabel}</strong> : null}
								<span>
									{plays.length === 0
										? 'Click cards to build your plan. Saving without selections still resolves a Basic Attack.'
										: targetNote}
								</span>
							</span>
						</p>
					</div>
				</div>

				<div className="battle-plan-footer">
					<div className="battle-plan-action">
						<Button
							game
							size="sm"
							className="battle-save-plan-button"
							data-testid="battle-save-plan"
							disabled={interactionDisabled || actionPending || !hasTarget}
							onClick={onSubmitPlan}
						>
							<LockKeyhole className="size-3.5" aria-hidden="true" /> {actionPending ? 'Locking…' : 'Lock plan'}
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
	onPlayReorder,
	onEnemySelect,
	onAllySelect,
	onSubmitPlan,
}: BattleSceneProps) {
	const selectedCard = currentMember.cards.find((card) => card.key === selectedCardKey);

	return (
		<section
			className="battle-scene"
			data-testid="combat-scene"
			aria-labelledby="battle-scene-heading"
			style={{ '--battlefield-art': `url('${gameplayBackgroundArt.battlefield}')` } as CSSProperties}
		>
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
