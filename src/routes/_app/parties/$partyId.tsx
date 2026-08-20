import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock3, HeartPulse, Map as MapIcon, MapPin, UsersRound } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { BranchDecision } from '#/components/party/branch-decision';
import { CombatPanel } from '#/components/party/combat-panel';
import { DailyStatus } from '#/components/party/daily-status';
import { EventDecision } from '#/components/party/event-decision';
import { MapTrail } from '#/components/party/map-trail';
import { PartyManagement } from '#/components/party/party-management';
import { ProgressionHistory } from '#/components/party/progression-history';
import { Roster } from '#/components/party/roster';
import { StatusCard } from '#/components/party/status-card';
import { VillagePanel } from '#/components/party/village-panel';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import {
	useCastVote,
	useChooseEvent,
	useDailyProgress,
	useEncounter,
	useParty,
	usePartyEvent,
	usePartyMap,
	usePartyVotes,
	useVillage,
} from '#/lib/queries';
import { isPartyReadOnly } from '#/lib/party-state';

export const Route = createFileRoute('/_app/parties/$partyId')({ component: PartyDashboard });

function PartyDashboard() {
	const { partyId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const partyQuery = useParty(partyId);
	const mapQuery = usePartyMap(partyId);
	const dailyQuery = useDailyProgress(partyId);
	const currentNodeId = partyQuery.data?.currentNode.id ?? '';
	const currentNodeType = partyQuery.data?.currentNode.nodeType;
	const isCombat = currentNodeType === 'combat';
	const isVillage = currentNodeType === 'village';
	const eventEnabled = Boolean(partyQuery.data && ['narrative', 'treasure', 'rest'].includes(currentNodeType ?? ''));
	const eventQuery = usePartyEvent(partyId, eventEnabled);
	const encounterQuery = useEncounter(partyId, isCombat);
	const villageQuery = useVillage(partyId, isVillage);
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

	if (
		partyQuery.isPending ||
		mapQuery.isPending ||
		dailyQuery.isPending ||
		(eventEnabled && eventQuery.isPending) ||
		(isCombat && encounterQuery.isPending) ||
		(isVillage && villageQuery.isPending) ||
		(votesEnabled && votesQuery.isPending)
	)
		return <LoadingState label="Mapping the party trail…" />;
	if (partyQuery.isError)
		return <ErrorNotice message={partyQuery.error.message} onRetry={() => void partyQuery.refetch()} retryLabel="Retry party" />;
	if (mapQuery.isError)
		return <ErrorNotice message={mapQuery.error.message} onRetry={() => void mapQuery.refetch()} retryLabel="Retry map" />;
	if (dailyQuery.isError)
		return <ErrorNotice message={dailyQuery.error.message} onRetry={() => void dailyQuery.refetch()} retryLabel="Retry daily progress" />;
	if (isCombat && encounterQuery.isError)
		return (
			<ErrorNotice message={encounterQuery.error.message} onRetry={() => void encounterQuery.refetch()} retryLabel="Retry encounter" />
		);
	if (isVillage && villageQuery.isError)
		return <ErrorNotice message={villageQuery.error.message} onRetry={() => void villageQuery.refetch()} retryLabel="Retry village" />;

	const party = partyQuery.data;
	const map = mapQuery.data;
	const daily = dailyQuery.data;
	const readOnly = isPartyReadOnly(party.status);
	const currentEdges = map.edges.filter((edge) => edge.fromNodeId === map.currentNodeId);
	const currentVotes = votesQuery.data;
	const currentEvent = eventQuery.data;
	const hasBranchDecision = !isCombat && !eventEnabled && currentEdges.length > 0 && (!isVillage || Boolean(party.decisionStartedAt));

	return (
		<div className="space-y-7">
			<Link
				to="/parties"
				className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--ink-soft)] no-underline hover:text-[var(--indigo)]"
			>
				<ArrowLeft className="size-4" /> Back to party hall
			</Link>

			<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
			</div>

			{readOnly && (
				<div role="status" className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-soft)]">
					<p className="font-extrabold text-[var(--indigo)]">This expedition is abandoned.</p>
					<p className="mt-1">You can still review its trail and history, but new party actions are closed.</p>
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-3">
				<StatusCard
					icon={<MapPin />}
					eyebrow="Current node"
					value={party.currentNode.name}
					detail={`${party.currentNode.nodeType} · region ${party.currentNode.regionNo}`}
				/>
				<StatusCard
					icon={<UsersRound />}
					eyebrow="Roster"
					value={`${party.members.length} / ${party.memberCapacity}`}
					detail="travelers on the trail"
				/>
				<StatusCard
					icon={<HeartPulse />}
					eyebrow="Gate progress"
					value={`${party.gateProgress}`}
					detail="units toward the next threshold"
				/>
			</div>

			<div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<div>
								<Badge>World map</Badge>
								<CardTitle className="mt-4 text-3xl">The visible trail</CardTitle>
								<CardDescription>Only discovered and adjacent nodes are revealed. The rest stays beyond the mist.</CardDescription>
							</div>
							<MapIcon className="size-6 text-[var(--gold)]" />
						</div>
					</CardHeader>
					<CardContent>
						<MapTrail map={map} />
					</CardContent>
				</Card>

				<div className="space-y-5">
					<DailyStatus daily={daily} />
					<Roster party={party} />
				</div>
			</div>

			{isCombat && encounterQuery.data && (
				<section>
					<div className="mb-4 flex items-end justify-between gap-4">
						<div>
							<p className="eyebrow">Encounter actions</p>
							<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Every turn is a party decision.</h2>
						</div>
						<Clock3 className="size-5 text-[var(--gold-deep)]" />
					</div>
					<CombatPanel partyId={partyId} userId={user.id} party={party} encounter={encounterQuery.data} readOnly={readOnly} />
				</section>
			)}

			{isVillage && villageQuery.data && (
				<section>
					<VillagePanel
						partyId={partyId}
						village={villageQuery.data}
						departureOpen={Boolean(party.decisionStartedAt)}
						readOnly={readOnly}
					/>
				</section>
			)}

			{eventEnabled && eventQuery.isError && (
				<section>
					<ErrorNotice message={eventQuery.error.message} onRetry={() => void eventQuery.refetch()} retryLabel="Retry event" />
				</section>
			)}

			{hasBranchDecision && (
				<section>
					<div className="mb-4 flex items-end justify-between gap-4">
						<div>
							<p className="eyebrow">{isVillage ? 'Departure decision' : 'Today’s decision'}</p>
							<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Which way does the party lean?</h2>
						</div>
						<Clock3 className="size-5 text-[var(--gold-deep)]" />
					</div>
					{votesQuery.isError ? (
						<ErrorNotice message={votesQuery.error.message} onRetry={() => void votesQuery.refetch()} retryLabel="Retry vote details" />
					) : (
						<BranchDecision
							map={map}
							votes={currentVotes}
							edges={currentEdges}
							mutation={castVoteMutation}
							userId={user.id}
							memberCount={party.members.length}
							readOnly={readOnly}
						/>
					)}
				</section>
			)}

			{!isCombat && !isVillage && eventEnabled && currentEvent && (
				<section>
					<div className="mb-4 flex items-end justify-between gap-4">
						<div>
							<p className="eyebrow">Today’s decision</p>
							<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Which way does the party lean?</h2>
						</div>
						<Clock3 className="size-5 text-[var(--gold-deep)]" />
					</div>
					<EventDecision event={currentEvent} mutation={chooseEventMutation} readOnly={readOnly} />
				</section>
			)}

			<div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
				<ProgressionHistory partyId={partyId} />
				<PartyManagement partyId={partyId} party={party} userId={user.id} readOnly={readOnly} />
			</div>
		</div>
	);
}
