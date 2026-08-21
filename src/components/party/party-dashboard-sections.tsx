import { ChevronRight, Clock3, Compass, Map as MapIcon, ScrollText, Swords, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

import { ErrorNotice } from '#/components/app-state';
import { AdventurePanel } from '#/components/party/adventure-panel';
import { BranchDecision } from '#/components/party/branch-decision';
import { CombatPanel } from '#/components/party/combat-panel';
import { DailyResolutionRecap } from '#/components/party/daily-resolution-recap';
import { DailyStatus } from '#/components/party/daily-status';
import { EventDecision } from '#/components/party/event-decision';
import { GameplayPanelState } from '#/components/party/gameplay-panel-state';
import { LocationPanel } from '#/components/party/location-panel';
import { PartyManagement } from '#/components/party/party-management';
import { ProgressionHistory } from '#/components/party/progression-history';
import { Roster } from '#/components/party/roster';
import { VillagePanel } from '#/components/party/village-panel';
import { WorldMap } from '#/components/party/world-map';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { DailyProgress, Party, PartyEvent, PartyMap, PartyRoster, PartyVotes } from '#/lib/api';
import type {
	useAdventure,
	useCastVote,
	useChooseEvent,
	useDailyProgress,
	useEncounter,
	useEnterLocation,
	usePartyEvent,
	usePartyRecap,
	usePartyRoster,
	usePartyVotes,
	useVillage,
} from '#/lib/queries';

type AdventureQuery = ReturnType<typeof useAdventure>;
type DailyQuery = ReturnType<typeof useDailyProgress>;
type EncounterQuery = ReturnType<typeof useEncounter>;
type EventQuery = ReturnType<typeof usePartyEvent>;
type EnterLocationMutation = ReturnType<typeof useEnterLocation>;
type RosterQuery = ReturnType<typeof usePartyRoster>;
type RecapQuery = ReturnType<typeof usePartyRecap>;
type VotesQuery = ReturnType<typeof usePartyVotes>;
type VillageQuery = ReturnType<typeof useVillage>;
type CastVoteMutation = ReturnType<typeof useCastVote>;
type ChooseEventMutation = ReturnType<typeof useChooseEvent>;

function SectionHeading({
	eyebrow,
	title,
	description,
	icon,
	id,
}: {
	eyebrow: string;
	title: string;
	description: string;
	icon: ReactNode;
	id: string;
}) {
	return (
		<div className="game-section-heading">
			<div>
				<p className="eyebrow">{eyebrow}</p>
				<h2 id={id} className="display-title text-3xl text-[var(--indigo)]">
					{title}
				</h2>
				<p>{description}</p>
			</div>
			<span className="game-section-emblem" aria-hidden="true">
				{icon}
			</span>
		</div>
	);
}

export function PartyActionSection({
	partyId,
	userId,
	timeZone,
	party,
	map,
	readOnly,
	isCombat,
	isVillage,
	eventEnabled,
	hasBranchDecision,
	currentEdges,
	currentVotes,
	currentEvent,
	encounterQuery,
	votesQuery,
	eventQuery,
	castVoteMutation,
	chooseEventMutation,
}: {
	partyId: string;
	userId: string;
	timeZone: string;
	party: Party;
	map: PartyMap;
	readOnly: boolean;
	isCombat: boolean;
	isVillage: boolean;
	eventEnabled: boolean;
	hasBranchDecision: boolean;
	currentEdges: PartyMap['edges'];
	currentVotes: PartyVotes | undefined;
	currentEvent: PartyEvent | undefined;
	encounterQuery: EncounterQuery;
	votesQuery: VotesQuery;
	eventQuery: EventQuery;
	castVoteMutation: CastVoteMutation;
	chooseEventMutation: ChooseEventMutation;
}) {
	const currentActionTitle = isCombat
		? `Battle at ${party.currentNode.name}`
		: hasBranchDecision
			? 'The road divides'
			: 'A choice waits in the trail';
	const currentActionDescription = isCombat
		? 'Set the party’s commands, read the field, and lock in the next move.'
		: hasBranchDecision
			? 'The party’s next destination is decided together.'
			: 'Read the scene and choose the response that carries the party forward.';

	return (
		<section id="party-action" className="gameplay-section" aria-labelledby="party-action-title" data-testid="party-action">
			<SectionHeading
				eyebrow="Current action"
				title={currentActionTitle}
				description={currentActionDescription}
				id="party-action-title"
				icon={isCombat ? <Swords className="size-5" /> : <Clock3 className="size-5" />}
			/>

			{isCombat && encounterQuery.data && (
				<CombatPanel
					key={`${encounterQuery.data.partyId}:${encounterQuery.data.nodeId}:${encounterQuery.data.worldDate}`}
					partyId={partyId}
					userId={userId}
					party={party}
					encounter={encounterQuery.data}
					readOnly={readOnly}
				/>
			)}
			{isCombat && encounterQuery.isPending && (
				<GameplayPanelState tone="combat" label="Reading the encounter field…" testId="encounter-loading" />
			)}
			{isCombat && encounterQuery.isError && (
				<GameplayPanelState
					tone="combat"
					label="Reading the encounter field…"
					error={encounterQuery.error}
					message={encounterQuery.error.message}
					onRetry={() => void encounterQuery.refetch()}
					retrying={encounterQuery.isFetching}
					retryLabel="Retry encounter"
					testId="encounter-error"
				/>
			)}

			{hasBranchDecision && (
				<>
					{votesQuery.isPending && <GameplayPanelState tone="arcane" label="Reading the party’s route votes…" testId="votes-loading" />}
					{votesQuery.isError && (
						<GameplayPanelState
							tone="arcane"
							label="Reading the party’s route votes…"
							error={votesQuery.error}
							message={votesQuery.error.message}
							onRetry={() => void votesQuery.refetch()}
							retrying={votesQuery.isFetching}
							retryLabel="Retry vote details"
							testId="votes-error"
						/>
					)}
					{!votesQuery.isPending && !votesQuery.isError && (
						<BranchDecision
							map={map}
							votes={currentVotes}
							edges={currentEdges}
							mutation={castVoteMutation}
							userId={userId}
							memberCount={party.members.length}
							timeZone={timeZone}
							readOnly={readOnly}
						/>
					)}
				</>
			)}

			{!isCombat && !isVillage && eventEnabled && (
				<>
					{eventQuery.isPending && <GameplayPanelState tone="arcane" label="Reading the scene…" testId="event-loading" />}
					{eventQuery.isError && (
						<GameplayPanelState
							tone="arcane"
							label="Reading the scene…"
							error={eventQuery.error}
							message={eventQuery.error.message}
							onRetry={() => void eventQuery.refetch()}
							retrying={eventQuery.isFetching}
							retryLabel="Retry event"
							testId="event-error"
						/>
					)}
					{currentEvent && <EventDecision event={currentEvent} mutation={chooseEventMutation} readOnly={readOnly} />}
				</>
			)}
		</section>
	);
}

export function PartyFieldSection({
	partyId,
	party,
	map,
	mapTypeLabel,
	currentMapNode,
	readOnly,
	enterLocationMutation,
	adventureQuery,
	isVillage,
	villageEnabled,
	villageQuery,
	timeZone,
}: {
	partyId: string;
	party: Party;
	map: PartyMap;
	mapTypeLabel: string;
	currentMapNode: PartyMap['nodes'][number] | undefined;
	readOnly: boolean;
	enterLocationMutation: EnterLocationMutation;
	adventureQuery: AdventureQuery;
	isVillage: boolean;
	villageEnabled: boolean;
	villageQuery: VillageQuery;
	timeZone: string;
}) {
	return (
		<section id="party-field" className="gameplay-section" aria-labelledby="party-field-title">
			<SectionHeading
				eyebrow="Field journal"
				title="The road ahead"
				description="Chart the revealed trail, inspect nearby landmarks, and follow the party marker into the next chapter."
				id="party-field-title"
				icon={<Compass className="size-5" />}
			/>

			<Card variant="game" tone="atlas" className="game-map-panel">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<div className="game-map-context">
								<Badge>{mapTypeLabel}</Badge>
								<span className="game-pixel-label">Party marker · {currentMapNode?.name ?? party.currentNode.name}</span>
							</div>
							<div className="game-map-breadcrumb" aria-label="Map context">
								<span>World atlas</span>
								<ChevronRight className="size-3" aria-hidden="true" />
								<strong>{mapTypeLabel === 'Overworld' ? 'Overworld atlas' : `${mapTypeLabel} interior`}</strong>
							</div>
							<CardTitle className="mt-4 text-3xl">{map.currentMap.name}</CardTitle>
							<CardDescription>Only discovered and adjacent nodes are revealed. The rest stays beyond the mist.</CardDescription>
						</div>
						<MapIcon className="size-6 text-[var(--gold)]" aria-hidden="true" />
					</div>
				</CardHeader>
				<CardContent>
					<WorldMap map={map} enterMutation={enterLocationMutation} readOnly={readOnly} />
				</CardContent>
			</Card>

			<LocationPanel map={map} />

			<AdventurePanel
				adventure={adventureQuery.data}
				timeZone={timeZone}
				pending={adventureQuery.isPending}
				error={adventureQuery.error}
				onRetry={() => void adventureQuery.refetch()}
				retrying={adventureQuery.isFetching}
			/>

			{villageEnabled && villageQuery.isPending && (
				<GameplayPanelState tone="village" label="Opening the village ledger…" testId="village-loading" />
			)}
			{villageEnabled && villageQuery.isError && (
				<GameplayPanelState
					tone="village"
					label="Opening the village ledger…"
					error={villageQuery.error}
					message={villageQuery.error.message}
					onRetry={() => void villageQuery.refetch()}
					retrying={villageQuery.isFetching}
					retryLabel="Retry village"
					testId="village-error"
				/>
			)}
			{villageEnabled && villageQuery.data && (
				<VillagePanel
					partyId={partyId}
					village={villageQuery.data}
					departureOpen={Boolean(party.decisionStartedAt)}
					timeZone={timeZone}
					readOnly={readOnly}
				/>
			)}

			{isVillage && readOnly && (
				<Card variant="game" tone="history">
					<CardHeader>
						<Badge>Village closed</Badge>
						<CardTitle className="mt-3 text-2xl">The market is part of the trail’s history.</CardTitle>
						<CardDescription>{party.currentNode.name} is no longer accepting purchases or departure votes.</CardDescription>
					</CardHeader>
				</Card>
			)}
		</section>
	);
}

export function PartyRosterSection({
	daily,
	roster,
	dailyQuery,
	rosterQuery,
	userId,
}: {
	daily: DailyProgress | undefined;
	roster: PartyRoster | undefined;
	dailyQuery: DailyQuery;
	rosterQuery: RosterQuery;
	userId: string;
}) {
	return (
		<section id="party-roster" className="gameplay-section" aria-labelledby="party-roster-title">
			<SectionHeading
				eyebrow="Party manifest"
				title="The travelers beside you"
				description="Keep an eye on the party’s daily momentum, health, and character sheets."
				id="party-roster-title"
				icon={<UsersRound className="size-5" />}
			/>

			<div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
				<div className="space-y-5">
					{daily ? (
						<DailyStatus daily={daily} />
					) : (
						<GameplayPanelState
							tone="village"
							label="Reading the daily party signal…"
							error={dailyQuery.error}
							message={dailyQuery.error?.message ?? 'The daily party signal is not available yet.'}
							onRetry={() => void dailyQuery.refetch()}
							retrying={dailyQuery.isFetching}
							retryLabel="Retry daily progress"
							testId="daily-status-state"
						/>
					)}
					{daily && dailyQuery.isError && (
						<ErrorNotice
							error={dailyQuery.error}
							message="The daily signal may be out of date."
							onRetry={() => void dailyQuery.refetch()}
							retrying={dailyQuery.isFetching}
							retryLabel="Refresh daily progress"
						/>
					)}
				</div>
				<div>
					{roster ? (
						<Roster roster={roster} currentUserId={userId} />
					) : (
						<GameplayPanelState
							tone="village"
							label="Calling the party roster…"
							error={rosterQuery.error}
							message={rosterQuery.error?.message ?? 'The party roster is not available yet.'}
							onRetry={() => void rosterQuery.refetch()}
							retrying={rosterQuery.isFetching}
							retryLabel="Retry party roster"
							testId="party-roster-state"
						/>
					)}
					{roster && rosterQuery.isError && (
						<ErrorNotice
							error={rosterQuery.error}
							message="The party roster may be out of date."
							onRetry={() => void rosterQuery.refetch()}
							retrying={rosterQuery.isFetching}
							retryLabel="Refresh party roster"
						/>
					)}
				</div>
			</div>
		</section>
	);
}

export function PartyChronicleSection({
	partyId,
	party,
	userId,
	timeZone,
	readOnly,
	recapQuery,
}: {
	partyId: string;
	party: Party;
	userId: string;
	timeZone: string;
	readOnly: boolean;
	recapQuery: RecapQuery;
}) {
	return (
		<section id="party-chronicle" className="gameplay-section space-y-5" aria-labelledby="party-chronicle-title">
			<SectionHeading
				eyebrow="Chronicle"
				title="What the trail remembers"
				description="Review the latest resolution, earned rewards, and the party’s longer history."
				id="party-chronicle-title"
				icon={<ScrollText className="size-5" />}
			/>

			<DailyResolutionRecap
				partyId={partyId}
				recap={recapQuery.data}
				timeZone={timeZone}
				pending={recapQuery.isPending}
				error={recapQuery.error}
				onRetry={() => void recapQuery.refetch()}
				retrying={recapQuery.isFetching}
			/>

			<div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
				<ProgressionHistory partyId={partyId} timeZone={timeZone} />
				<PartyManagement partyId={partyId} party={party} userId={userId} timeZone={timeZone} readOnly={readOnly} />
			</div>
		</section>
	);
}
