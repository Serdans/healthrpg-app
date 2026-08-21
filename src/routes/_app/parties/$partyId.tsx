import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, Map as MapIcon, Swords, UsersRound } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import {
	PartyActionSection,
	PartyChronicleSection,
	PartyFieldSection,
	PartyRosterSection,
} from '#/components/party/party-dashboard-sections';
import { GameplaySectionNav } from '#/components/party/gameplay-section-nav';
import { PartyHud } from '#/components/party/party-hud';
import { Badge } from '#/components/ui/badge';
import {
	useAdventure,
	useCastVote,
	useChooseEvent,
	useDailyProgress,
	useEncounter,
	useEnterLocation,
	useParty,
	usePartyEvent,
	usePartyMap,
	usePartyRecap,
	usePartyRoster,
	usePartyVotes,
	useVillage,
} from '#/lib/queries';
import { isPartyReadOnly } from '#/lib/party-state';

export const Route = createFileRoute('/_app/parties/$partyId')({
	head: () => ({ meta: [{ title: 'Party dashboard · HealthRPG' }] }),
	component: PartyDashboard,
});

function PartyDashboard() {
	const { partyId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const partyQuery = useParty(partyId);
	const mapQuery = usePartyMap(partyId);
	const enterLocationMutation = useEnterLocation(partyId);
	const adventureQuery = useAdventure(partyId);
	const dailyQuery = useDailyProgress(partyId);
	const rosterQuery = usePartyRoster(partyId);
	const recapQuery = usePartyRecap(partyId);
	const currentNodeId = partyQuery.data?.currentNode.id ?? '';
	const currentEventType = partyQuery.data?.currentNode.config.event?.eventType;
	const isCombat = currentEventType === 'combat';
	const isVillage = currentEventType === 'village';
	const villageEnabled = isVillage && partyQuery.data?.status === 'active';
	const eventEnabled = currentEventType === 'narrative' || currentEventType === 'treasure' || currentEventType === 'rest';
	const eventQuery = usePartyEvent(partyId, eventEnabled);
	const encounterQuery = useEncounter(partyId, isCombat);
	const villageQuery = useVillage(partyId, villageEnabled);
	const mapEdges = mapQuery.data?.edges.filter((edge) => edge.fromNodeId === mapQuery.data.currentNodeId) ?? [];
	const votesEnabled =
		Boolean(partyQuery.data) &&
		mapEdges.length > 0 &&
		!isCombat &&
		!eventEnabled &&
		(!isVillage || Boolean(partyQuery.data?.decisionStartedAt));
	const votesQuery = usePartyVotes(partyId, currentNodeId, votesEnabled);
	const castVoteMutation = useCastVote(partyId, currentNodeId);
	const chooseEventMutation = useChooseEvent(partyId);

	if (partyQuery.isPending || mapQuery.isPending) return <LoadingState label="Mapping the party trail…" />;
	if (partyQuery.isError)
		return (
			<ErrorNotice
				error={partyQuery.error}
				message={partyQuery.error.message}
				onRetry={() => void partyQuery.refetch()}
				retrying={partyQuery.isFetching}
				retryLabel="Retry party"
			/>
		);
	if (mapQuery.isError)
		return (
			<ErrorNotice
				error={mapQuery.error}
				message={mapQuery.error.message}
				onRetry={() => void mapQuery.refetch()}
				retrying={mapQuery.isFetching}
				retryLabel="Retry map"
			/>
		);

	const party = partyQuery.data;
	const map = mapQuery.data;
	const daily = dailyQuery.data;
	const roster = rosterQuery.data;
	const readOnly = isPartyReadOnly(party.status);
	const currentEdges = map.edges.filter((edge) => edge.fromNodeId === map.currentNodeId);
	const currentVotes = votesQuery.data;
	const currentEvent = eventQuery.data;
	const hasBranchDecision = !isCombat && !eventEnabled && currentEdges.length > 0 && (!isVillage || Boolean(party.decisionStartedAt));
	const hasCurrentAction = isCombat || eventEnabled || hasBranchDecision;
	const currentMapNode = map.nodes.find((node) => node.id === map.currentNodeId);
	const mapTypeLabel = map.currentMap.mapType === 'overworld' ? 'Overworld' : map.currentMap.mapType === 'dungeon' ? 'Dungeon' : 'Village';

	return (
		<div className="gameplay-surface gameplay-shell space-y-8">
			<a className="skip-link" href="#party-field">
				Skip to field map
			</a>

			<Link to="/parties" className="game-back-link inline-flex items-center gap-2 text-sm font-extrabold no-underline">
				<ArrowLeft className="size-4" /> Back to party hall
			</Link>

			<header className="game-hero flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p className="eyebrow">Party dashboard · chapter {party.currentNode.chapterNo}</p>
					<div className="mt-3 flex items-center gap-3">
						<h1 className="display-title text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">{party.name}</h1>
						<Badge>{party.status}</Badge>
					</div>
					<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
						The world moves at the party’s pace. Make the next decision together.
					</p>
				</div>
				<div className="game-hero-readout" aria-label="Current expedition context">
					<div>
						<span className="game-pixel-label">Current chapter</span>
						<strong>{party.currentNode.chapterNo}</strong>
					</div>
					<div>
						<span className="game-pixel-label">Current node</span>
						<strong>{party.currentNode.name}</strong>
					</div>
				</div>
			</header>

			{readOnly && (
				<div role="status" className="game-readonly-banner">
					<p className="font-extrabold text-[var(--indigo)]">This expedition is abandoned.</p>
					<p className="mt-1">You can still review its trail and history, but new party actions are closed.</p>
				</div>
			)}

			<PartyHud party={party} adventure={adventureQuery.data} daily={daily} />

			<GameplaySectionNav
				defaultSectionId={hasCurrentAction ? 'party-action' : 'party-field'}
				sections={[
					...(hasCurrentAction ? [{ id: 'party-action', label: 'Action', icon: <Swords className="size-4" aria-hidden="true" /> }] : []),
					{ id: 'party-field', label: 'Field', icon: <MapIcon className="size-4" aria-hidden="true" /> },
					{ id: 'party-roster', label: 'Party', icon: <UsersRound className="size-4" aria-hidden="true" /> },
					{ id: 'party-chronicle', label: 'Chronicle', icon: <BookOpen className="size-4" aria-hidden="true" /> },
				]}
			/>

			{hasCurrentAction && (
				<PartyActionSection
					partyId={partyId}
					userId={user.id}
					timeZone={user.timezone}
					party={party}
					map={map}
					readOnly={readOnly}
					isCombat={isCombat}
					isVillage={isVillage}
					eventEnabled={eventEnabled}
					hasBranchDecision={hasBranchDecision}
					currentEdges={currentEdges}
					currentVotes={currentVotes}
					currentEvent={currentEvent}
					encounterQuery={encounterQuery}
					votesQuery={votesQuery}
					eventQuery={eventQuery}
					castVoteMutation={castVoteMutation}
					chooseEventMutation={chooseEventMutation}
				/>
			)}

			<PartyFieldSection
				partyId={partyId}
				party={party}
				map={map}
				mapTypeLabel={mapTypeLabel}
				currentMapNode={currentMapNode}
				readOnly={readOnly}
				enterLocationMutation={enterLocationMutation}
				adventureQuery={adventureQuery}
				isVillage={isVillage}
				villageEnabled={villageEnabled}
				villageQuery={villageQuery}
				timeZone={user.timezone}
			/>

			<PartyRosterSection daily={daily} roster={roster} dailyQuery={dailyQuery} rosterQuery={rosterQuery} userId={user.id} />

			<PartyChronicleSection
				partyId={partyId}
				party={party}
				userId={user.id}
				timeZone={user.timezone}
				readOnly={readOnly}
				recapQuery={recapQuery}
			/>
		</div>
	);
}
