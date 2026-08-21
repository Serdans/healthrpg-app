import { Check, Crosshair, HeartPulse, PackageOpen, Shield, Sparkles, Swords, Target } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Progress } from '#/components/ui/progress';
import { InventoryItemSprite } from '#/components/inventory/inventory-item-sprite';
import type { DailyProgress, Encounter, Inventory, PartyItemUse } from '#/lib/api';
import type { CombatCommandState } from '#/lib/combat-command-state';
import { battleEnemyArtForArchetype, battlePartyArtForClass, gameplayBackgroundArt } from '#/lib/game-art';
import type { CSSProperties } from 'react';
import { GameplayMechanics } from './gameplay-mechanics';

type EncounterMember = Encounter['members'][number];
type ActionKey = EncounterMember['signatureAction']['key'];
type TargetMode = EncounterMember['signatureAction']['targetMode'];
type InventoryItem = Inventory['items'][number];

export interface BattleSceneProps {
	encounter: Encounter;
	currentMember: EncounterMember;
	daily?: DailyProgress;
	userId: string;
	readOnly: boolean;
	actionKey: ActionKey | null;
	targetEnemyId: string;
	selectedActionTargetUserId: string;
	selectedItemTargetUserId: string;
	targetMode: TargetMode;
	usableItems: InventoryItem[];
	itemKey: string;
	actionPending: boolean;
	itemPending: boolean;
	actionBusy: boolean;
	actionError: Error | null;
	commandState: CombatCommandState;
	itemResult: PartyItemUse | undefined;
	partyMemberName: (memberUserId: string) => string;
	onActionKeyChange: (actionKey: ActionKey | null) => void;
	onEnemySelect: (enemyId: string) => void;
	onAllySelect: (userId: string) => void;
	onItemKeyChange: (itemKey: string) => void;
	onItemTargetChange: (userId: string) => void;
	onSubmitAction: () => void;
	onUseItem: () => void;
}

interface BattlefieldProps {
	encounter: Encounter;
	userId: string;
	readOnly: boolean;
	actionBusy: boolean;
	targetEnemyId: string;
	selectedActionTargetUserId: string;
	targetMode: TargetMode;
	partyMemberName: (memberUserId: string) => string;
	onEnemySelect: (enemyId: string) => void;
	onAllySelect: (userId: string) => void;
}

interface BattleCommandTrayProps {
	encounter: Encounter;
	currentMember: EncounterMember;
	readOnly: boolean;
	actionKey: ActionKey | null;
	targetEnemyId: string;
	selectedActionTargetUserId: string;
	selectedItemTargetUserId: string;
	targetMode: TargetMode;
	usableItems: InventoryItem[];
	itemKey: string;
	actionPending: boolean;
	itemPending: boolean;
	actionBusy: boolean;
	commandState: CombatCommandState;
	partyMemberName: (memberUserId: string) => string;
	onActionKeyChange: (actionKey: ActionKey | null) => void;
	onItemKeyChange: (itemKey: string) => void;
	onItemTargetChange: (userId: string) => void;
	onSubmitAction: () => void;
	onUseItem: () => void;
}

function label(value: string) {
	return value
		.split('-')
		.map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
		.join(' ');
}

function healthPercent(currentHealth: number, maxHealth: number) {
	return maxHealth > 0 ? (currentHealth / maxHealth) * 100 : 0;
}

function actionName(member: EncounterMember) {
	return member.selectedActionKey ? member.signatureAction.displayName : 'Basic attack';
}

function targetLabel(targetMode: TargetMode) {
	if (targetMode === 'enemy') return 'Enemy target';
	if (targetMode === 'ally') return 'Ally target';
	return 'No target';
}

function Battlefield({
	encounter,
	userId,
	readOnly,
	actionBusy,
	targetEnemyId,
	selectedActionTargetUserId,
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
						const enemyArt = battleEnemyArtForArchetype(enemy.archetypeKey);
						return (
							<button
								key={enemy.id}
								type="button"
								className={`battle-enemy ${selected ? 'battle-enemy-selected' : ''} ${defeated ? 'battle-enemy-defeated' : ''}`}
								data-testid="battle-enemy"
								data-enemy-id={enemy.id}
								data-selected={selected}
								aria-label={`${enemy.displayName}, ${defeated ? 'defeated' : 'standing'}, ${enemy.currentHealth} of ${enemy.maxHealth} health, pressure ${enemy.pressure}`}
								aria-pressed={selected}
								disabled={interactionDisabled || defeated}
								onClick={() => onEnemySelect(enemy.id)}
							>
								<span
									className="battle-enemy-art"
									aria-hidden="true"
									style={{ backgroundImage: `url('${enemyArt.src}')`, backgroundSize: enemyArt.backgroundSize }}
								/>
								<span className="battle-enemy-nameplate">
									<strong>{enemy.displayName}</strong>
									<span>{defeated ? 'Defeated' : `Pressure ${enemy.pressure}`}</span>
								</span>
								<span className="battle-combatant-health">
									<span>
										{enemy.currentHealth}/{enemy.maxHealth} HP
									</span>
									<Progress value={healthPercent(enemy.currentHealth, enemy.maxHealth)} />
								</span>
								<span className="battle-pressure-pips" aria-label={`${enemy.pressure} pressure`}>
									{Array.from({ length: 5 }, (_, index) => (
										<i key={index} className={index < enemy.pressure ? 'battle-pressure-pip-active' : ''} />
									))}
								</span>
								{selected && <Crosshair className="battle-target-reticle" aria-hidden="true" />}
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
						const selected = selectedActionTargetUserId === member.userId && targetMode === 'ally';
						const memberArt = battlePartyArtForClass(member.classKey);
						const isCurrentUser = member.userId === userId;
						return (
							<button
								key={member.userId}
								type="button"
								className={`battle-party-member ${selected ? 'battle-party-member-selected' : ''} ${isCurrentUser ? 'battle-party-member-current' : ''}`}
								data-testid="battle-party-member"
								data-member-id={member.userId}
								data-selected={selected}
								aria-label={`${memberName}${isCurrentUser ? ', you' : ''}, ${label(member.classKey)}, ${member.currentHealth} of ${member.maxHealth} health, ${actionName(member)}`}
								aria-pressed={selected}
								disabled={interactionDisabled || targetMode !== 'ally'}
								onClick={() => onAllySelect(member.userId)}
							>
								<span
									className="battle-party-art"
									aria-hidden="true"
									style={{
										backgroundImage: `url('${memberArt.src}')`,
										backgroundPosition: memberArt.position,
										backgroundSize: memberArt.backgroundSize,
									}}
								/>
								<span className="battle-party-nameplate">
									<strong>
										{memberName}
										{isCurrentUser ? <small>YOU</small> : null}
									</strong>
									<span>
										{label(member.classKey)} · {actionName(member)}
									</span>
								</span>
								<span className="battle-combatant-health">
									<span>
										{member.currentHealth}/{member.maxHealth} HP
									</span>
									<Progress value={healthPercent(member.currentHealth, member.maxHealth)} />
								</span>
								{selected && <Target className="battle-target-reticle" aria-hidden="true" />}
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
	actionKey,
	targetEnemyId,
	selectedActionTargetUserId,
	selectedItemTargetUserId,
	targetMode,
	usableItems,
	itemKey,
	actionPending,
	itemPending,
	actionBusy,
	commandState,
	partyMemberName,
	onActionKeyChange,
	onItemKeyChange,
	onItemTargetChange,
	onSubmitAction,
	onUseItem,
}: BattleCommandTrayProps) {
	const signature = currentMember.signatureAction;
	const selectedEnemy = encounter.enemies.find((enemy) => enemy.id === targetEnemyId);
	const selectedAlly = encounter.members.find((member) => member.userId === selectedActionTargetUserId);
	const selectedTargetName =
		targetMode === 'enemy'
			? (selectedEnemy?.displayName ?? 'Choose an enemy')
			: targetMode === 'ally'
				? selectedAlly
					? partyMemberName(selectedAlly.userId)
					: 'Choose an ally'
				: 'No target required';
	const commandName = actionKey ? signature.displayName : 'Basic attack';
	const commandDescription = actionKey ? signature.description : 'A reliable strike against a selected enemy.';
	const interactionDisabled = readOnly || encounter.status === 'completed' || actionBusy;
	const selectedItem = usableItems.find((item) => item.key === itemKey) ?? usableItems[0];
	const hasRequiredTarget = targetMode !== 'enemy' || Boolean(targetEnemyId);
	const targetNote =
		targetMode === 'enemy'
			? hasRequiredTarget
				? 'Select a foe on the battlefield.'
				: 'No standing foe is available for this command.'
			: targetMode === 'ally'
				? 'Select an ally on the battlefield.'
				: 'This ability needs no target.';
	const commandStepState = 'complete';
	const targetStepState = hasRequiredTarget ? 'complete' : 'current';
	const saveStepState = commandState === 'saved' ? 'complete' : 'current';

	return (
		<div className="battle-command-tray" data-testid="battle-command-tray">
			<ol className="battle-command-steps" aria-label="Battle command steps">
				<li className={`battle-command-step-${commandStepState}`}>
					<span>1</span> Choose command
				</li>
				<li className={`battle-command-step-${targetStepState}`}>
					<span>2</span> Choose target
				</li>
				<li className={`battle-command-step-${saveStepState}`}>
					<span>3</span> Save command
				</li>
			</ol>
			<div className="battle-command-summary">
				<div className="battle-command-heading">
					<div>
						<p className="game-pixel-label">Your command</p>
						<h3>{partyMemberName(currentMember.userId)}</h3>
					</div>
					<Badge className="battle-command-target-badge">{targetLabel(targetMode)}</Badge>
				</div>
				<div className="battle-command-selected">
					<div>
						<span>Command</span>
						<strong>{commandName}</strong>
					</div>
					<div>
						<span>Target</span>
						<strong>{selectedTargetName}</strong>
					</div>
				</div>
				<p className="battle-command-description">{commandDescription}</p>
			</div>

			<div className="battle-command-options">
				<p className="game-pixel-label">Choose command</p>
				<div className="battle-action-options">
					<button
						type="button"
						className={`battle-action-option ${actionKey === null ? 'battle-action-option-selected' : ''}`}
						data-testid="battle-action-basic"
						aria-pressed={actionKey === null}
						disabled={interactionDisabled}
						onClick={() => onActionKeyChange(null)}
					>
						<Swords className="size-5" aria-hidden="true" />
						<span>
							<strong>Attack</strong>
							<small>Basic strike</small>
						</span>
						{actionKey === null && <Check className="battle-action-check size-4" aria-hidden="true" />}
					</button>
					<button
						type="button"
						className={`battle-action-option ${actionKey === signature.key ? 'battle-action-option-selected' : ''}`}
						data-testid="battle-action-signature"
						aria-pressed={actionKey === signature.key}
						disabled={interactionDisabled}
						onClick={() => onActionKeyChange(signature.key)}
					>
						<Shield className="size-5" aria-hidden="true" />
						<span>
							<strong>Ability</strong>
							<small>{signature.displayName}</small>
						</span>
						{actionKey === signature.key && <Check className="battle-action-check size-4" aria-hidden="true" />}
					</button>
				</div>
			</div>

			<div className="battle-field-kit">
				<div className="battle-command-heading">
					<div>
						<p className="game-pixel-label">Field kit</p>
						<h3>Keep someone standing</h3>
					</div>
					<PackageOpen className="size-5 text-[var(--game-gold)]" aria-hidden="true" />
				</div>
				{usableItems.length > 0 ? (
					<div className="battle-item-controls">
						<div className="battle-selected-item" data-testid="battle-selected-item">
							<InventoryItemSprite itemKey={selectedItem.key} kind={selectedItem.kind} size="sm" />
							<span>
								<strong>{selectedItem.displayName}</strong>
								<small>{selectedItem.quantity} available</small>
							</span>
						</div>
						<label>
							<span>Item</span>
							<select
								data-testid="battle-item-select"
								value={itemKey || usableItems[0]?.key}
								disabled={interactionDisabled}
								onChange={(event) => onItemKeyChange(event.target.value)}
							>
								{usableItems.map((item) => (
									<option key={item.key} value={item.key}>
										{item.displayName} ×{item.quantity}
									</option>
								))}
							</select>
						</label>
						<label>
							<span>Target</span>
							<select
								data-testid="battle-item-target"
								value={selectedItemTargetUserId}
								disabled={interactionDisabled}
								onChange={(event) => onItemTargetChange(event.target.value)}
							>
								{encounter.members.map((member) => (
									<option key={member.userId} value={member.userId}>
										{partyMemberName(member.userId)}
									</option>
								))}
							</select>
						</label>
						<Button game disabled={interactionDisabled || itemPending} onClick={onUseItem}>
							<HeartPulse className="size-4" aria-hidden="true" /> {itemPending ? 'Using…' : 'Use item'}
						</Button>
					</div>
				) : (
					<p className="battle-empty-kit">No usable items are currently in your field kit.</p>
				)}
			</div>

			<div className="battle-command-footer">
				<div className={`battle-command-target-note ${hasRequiredTarget ? '' : 'battle-command-target-note-missing'}`}>
					<Target className="size-4" aria-hidden="true" />
					<span>{targetNote}</span>
				</div>
				<Button
					game
					data-testid="battle-save-command"
					disabled={interactionDisabled || actionPending || !hasRequiredTarget}
					onClick={onSubmitAction}
				>
					<Sparkles className="size-4" aria-hidden="true" /> {actionPending ? 'Saving command…' : 'Save command'}
				</Button>
			</div>
		</div>
	);
}

export function BattleScene({
	encounter,
	currentMember,
	daily,
	userId,
	readOnly,
	actionKey,
	targetEnemyId,
	selectedActionTargetUserId,
	selectedItemTargetUserId,
	targetMode,
	usableItems,
	itemKey,
	actionPending,
	itemPending,
	actionBusy,
	actionError,
	commandState,
	itemResult,
	partyMemberName,
	onActionKeyChange,
	onEnemySelect,
	onAllySelect,
	onItemKeyChange,
	onItemTargetChange,
	onSubmitAction,
	onUseItem,
}: BattleSceneProps) {
	return (
		<section
			className="battle-scene"
			data-testid="combat-scene"
			aria-labelledby="battle-scene-heading"
			style={{ '--battlefield-art': `url('${gameplayBackgroundArt.battlefield}')` } as CSSProperties}
		>
			<div className="battle-scene-header">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge className="battle-scene-badge">
							<Swords className="size-3" aria-hidden="true" /> Encounter · {encounter.worldDate}
						</Badge>
						<Badge className={encounter.status === 'completed' ? 'battle-scene-status-complete' : 'battle-scene-status-active'}>
							{encounter.status === 'completed' ? 'Resolved' : 'Active'}
						</Badge>
					</div>
					<h2 id="battle-scene-heading">Hold the line together.</h2>
					<p>Each traveler chooses one command before the day closes. The chronicle resolves the clash together.</p>
				</div>
				<div className="battle-scene-sigil" aria-hidden="true">
					<Swords className="size-7" />
				</div>
			</div>

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
						<Sparkles className="size-4" aria-hidden="true" /> Saving your command for today’s resolution…
					</>
				) : commandState === 'edited' ? (
					<>
						<Sparkles className="size-4" aria-hidden="true" /> Review your changes and save this command for today’s resolution.
					</>
				) : commandState === 'saved' ? (
					<>
						<Check className="size-4" aria-hidden="true" /> Your command is locked in for today’s resolution.
					</>
				) : (
					<>
						<Sparkles className="size-4" aria-hidden="true" /> Daily command phase ·{' '}
						{encounter.members.filter((member) => member.selectedActionKey).length}/{encounter.members.length} signature commands chosen
					</>
				)}
			</div>

			<GameplayMechanics daily={daily} currentMemberUserId={currentMember.userId} compact />

			<div className={`battle-command-ribbon battle-command-ribbon-${commandState}`} aria-label="Current battle command">
				<span className="game-pixel-label">Commanding</span>
				<strong>{partyMemberName(currentMember.userId)}</strong>
				<span>
					{actionKey ? currentMember.signatureAction.displayName : 'Basic attack'} · {targetLabel(targetMode)}
				</span>
			</div>

			<Battlefield
				encounter={encounter}
				userId={userId}
				readOnly={readOnly}
				actionBusy={actionBusy}
				targetEnemyId={targetEnemyId}
				selectedActionTargetUserId={selectedActionTargetUserId}
				targetMode={targetMode}
				partyMemberName={partyMemberName}
				onEnemySelect={onEnemySelect}
				onAllySelect={onAllySelect}
			/>

			<BattleCommandTray
				encounter={encounter}
				currentMember={currentMember}
				readOnly={readOnly}
				actionKey={actionKey}
				targetEnemyId={targetEnemyId}
				selectedActionTargetUserId={selectedActionTargetUserId}
				selectedItemTargetUserId={selectedItemTargetUserId}
				targetMode={targetMode}
				usableItems={usableItems}
				itemKey={itemKey}
				actionPending={actionPending}
				itemPending={itemPending}
				actionBusy={actionBusy}
				commandState={commandState}
				partyMemberName={partyMemberName}
				onActionKeyChange={onActionKeyChange}
				onItemKeyChange={onItemKeyChange}
				onItemTargetChange={onItemTargetChange}
				onSubmitAction={onSubmitAction}
				onUseItem={onUseItem}
			/>

			{actionError && (
				<p className="battle-error" role="alert">
					{actionError.message}
				</p>
			)}
			{itemResult && (
				<p className="battle-success" role="status">
					Restored {itemResult.healedAmount} health for {partyMemberName(itemResult.targetUserId)}.
				</p>
			)}
		</section>
	);
}
