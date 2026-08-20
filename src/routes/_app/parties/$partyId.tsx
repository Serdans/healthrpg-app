import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Clock3, HeartPulse, Map as MapIcon, MapPin, Send, UsersRound } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { BranchDecision } from '#/components/party/branch-decision';
import { DailyStatus } from '#/components/party/daily-status';
import { EventDecision } from '#/components/party/event-decision';
import { MapTrail } from '#/components/party/map-trail';
import { Roster } from '#/components/party/roster';
import { StatusCard } from '#/components/party/status-card';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import {
	useCastVote,
	useChooseEvent,
	useCreateInvite,
	useDailyProgress,
	useParty,
	usePartyEvent,
	usePartyMap,
	usePartyVotes,
} from '#/lib/queries';
import { CopyToken } from '../parties';

export const Route = createFileRoute('/_app/parties/$partyId')({ component: PartyDashboard });

function PartyDashboard() {
	const { partyId } = Route.useParams();
	const { user } = Route.useRouteContext();
	const partyQuery = useParty(partyId);
	const mapQuery = usePartyMap(partyId);
	const dailyQuery = useDailyProgress(partyId);
	const currentNodeId = partyQuery.data?.currentNode.id ?? '';
	const eventEnabled = Boolean(partyQuery.data && ['narrative', 'treasure', 'rest'].includes(partyQuery.data.currentNode.nodeType));
	const eventQuery = usePartyEvent(partyId, eventEnabled);
	const mapEdges = mapQuery.data?.edges.filter((edge) => edge.fromNodeId === mapQuery.data.currentNodeId) ?? [];
	const votesQuery = usePartyVotes(partyId, currentNodeId, mapEdges.length > 0);
	const inviteMutation = useCreateInvite(partyId);
	const castVoteMutation = useCastVote(partyId, currentNodeId);
	const chooseEventMutation = useChooseEvent(partyId);

	if (partyQuery.isPending || mapQuery.isPending || dailyQuery.isPending) return <LoadingState label="Mapping the party trail…" />;
	if (partyQuery.isError) return <ErrorNotice message={partyQuery.error.message} />;
	if (mapQuery.isError) return <ErrorNotice message={mapQuery.error.message} />;

	const party = partyQuery.data;
	const map = mapQuery.data;
	const daily = dailyQuery.data;
	if (!daily) return <ErrorNotice />;
	const isLeader = party.members.some((member) => member.userId === user.id && member.role === 'leader');
	const currentEdges = map.edges.filter((edge) => edge.fromNodeId === map.currentNodeId);
	const currentVotes = votesQuery.data;
	const currentEvent = eventQuery.data;

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
				{isLeader && (
					<div className="flex flex-col items-stretch gap-2 sm:items-end">
						<Button variant="secondary" disabled={inviteMutation.isPending} onClick={() => inviteMutation.mutate()}>
							<Send className="size-4" /> Create invite
						</Button>
						{inviteMutation.data && <CopyToken token={inviteMutation.data.token} />}
						{inviteMutation.isError && <p className="text-xs text-[var(--danger)]">{inviteMutation.error.message}</p>}
					</div>
				)}
			</div>

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

			{(currentEdges.length > 0 || currentEvent) && (
				<section>
					<div className="mb-4 flex items-end justify-between gap-4">
						<div>
							<p className="eyebrow">Today’s decision</p>
							<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Which way does the party lean?</h2>
						</div>
						<Clock3 className="size-5 text-[var(--gold-deep)]" />
					</div>
					{currentEvent ? (
						<EventDecision event={currentEvent} mutation={chooseEventMutation} />
					) : (
						<BranchDecision map={map} votes={currentVotes} edges={currentEdges} mutation={castVoteMutation} />
					)}
				</section>
			)}
		</div>
	);
}
