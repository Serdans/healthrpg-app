import { useState } from 'react';
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Copy, Plus, UsersRound } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import type { Party } from '#/lib/api';
import { useCreateParty, useJoinParty, useParties } from '#/lib/queries';

export const Route = createFileRoute('/_app/parties')({ component: PartiesPage });

function PartiesPage() {
	const pathname = useLocation({ select: (location) => location.pathname });

	if (pathname !== '/parties' && pathname !== '/parties/') return <Outlet />;

	return <PartiesIndex />;
}

function PartiesIndex() {
	const partiesQuery = useParties();
	const createMutation = useCreateParty();
	const joinMutation = useJoinParty();
	const navigate = useNavigate();
	const [partyName, setPartyName] = useState('');
	const [inviteToken, setInviteToken] = useState('');

	if (partiesQuery.isPending) return <LoadingState label="Finding your parties…" />;
	if (partiesQuery.isError)
		return <ErrorNotice message={partiesQuery.error.message} onRetry={() => void partiesQuery.refetch()} retryLabel="Retry parties" />;

	const navigateToParty = (party: Party) => void navigate({ to: '/parties/$partyId', params: { partyId: party.id } });

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Party hall</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">Find your people.</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					A party is a shared pace: everyone contributes, everyone gets a voice at the fork.
				</p>
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<div>
								<Badge>New expedition</Badge>
								<CardTitle className="mt-4">Start a party</CardTitle>
							</div>
							<span className="grid size-11 place-items-center rounded-xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">
								<Plus />
							</span>
						</div>
						<CardDescription>Give your trail a name. The first party creates the world’s trailhead.</CardDescription>
					</CardHeader>
					<CardContent>
						<Label htmlFor="party-name">Party name</Label>
						<Input
							id="party-name"
							value={partyName}
							maxLength={80}
							placeholder="e.g. Sunday Wayfarers"
							onChange={(event) => setPartyName(event.target.value)}
						/>
						<Button
							className="w-full"
							disabled={!partyName.trim() || createMutation.isPending}
							onClick={() => createMutation.mutate(partyName.trim(), { onSuccess: navigateToParty })}
						>
							Create party <ArrowUpRight className="size-4" />
						</Button>
						{createMutation.isError && <ErrorNotice message={createMutation.error.message} />}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-center justify-between gap-3">
							<div>
								<Badge className="border-[color-mix(in_srgb,var(--amethyst)_30%,transparent)] bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
									Have an invite?
								</Badge>
								<CardTitle className="mt-4">Join a party</CardTitle>
							</div>
							<span className="grid size-11 place-items-center rounded-xl bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
								<UsersRound />
							</span>
						</div>
						<CardDescription>Paste the one-time-visible token your party leader shared with you.</CardDescription>
					</CardHeader>
					<CardContent>
						<Label htmlFor="invite-token">Invite token</Label>
						<Input
							id="invite-token"
							value={inviteToken}
							placeholder="Paste invite token"
							onChange={(event) => setInviteToken(event.target.value)}
						/>
						<Button
							variant="secondary"
							className="w-full"
							disabled={!inviteToken.trim() || joinMutation.isPending}
							onClick={() => joinMutation.mutate(inviteToken.trim(), { onSuccess: navigateToParty })}
						>
							Join party <ArrowUpRight className="size-4" />
						</Button>
						{joinMutation.isError && <ErrorNotice message={joinMutation.error.message} />}
					</CardContent>
				</Card>
			</div>

			<section>
				<div className="mb-4 flex items-end justify-between">
					<div>
						<p className="eyebrow">Your roster</p>
						<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Current expeditions</h2>
					</div>
					<span className="font-mono text-sm text-[var(--ink-soft)]">{partiesQuery.data.length} total</span>
				</div>
				{partiesQuery.data.length === 0 ? (
					<EmptyState title="The hall is quiet." copy="Create the first party or use an invite token to join a trail already underway." />
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{partiesQuery.data.map((party) => (
							<PartyCard key={party.id} party={party} />
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function PartyCard({ party }: { party: Party }) {
	return (
		<Card className="group">
			<div className="flex items-start justify-between gap-4">
				<div>
					<Badge>{party.status}</Badge>
					<h3 className="display-title mt-3 text-2xl text-[var(--indigo)]">{party.name}</h3>
				</div>
				<UsersRound className="size-5 text-[var(--amethyst)]" />
			</div>
			<p className="mt-4 text-sm text-[var(--ink-soft)]">
				{party.currentNode.name} · {party.currentNode.nodeType}
			</p>
			<div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4">
				<span className="text-xs font-bold text-[var(--ink-soft)]">
					{party.members.length} / {party.memberCapacity} travelers
				</span>
				<Link
					to="/parties/$partyId"
					params={{ partyId: party.id }}
					className="inline-flex items-center gap-1 text-sm font-extrabold text-[var(--gold-deep)] no-underline hover:text-[var(--indigo)]"
				>
					Open <ArrowUpRight className="size-4" />
				</Link>
			</div>
		</Card>
	);
}

export function CopyToken({ token }: { token: string }) {
	const [copied, setCopied] = useState(false);

	const copyToken = async () => {
		try {
			await navigator.clipboard.writeText(token);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	return (
		<button
			type="button"
			className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-3 text-left hover:bg-[var(--gold-wash)]"
			onClick={copyToken}
		>
			<span className="min-w-0 truncate font-mono text-xs text-[var(--gold-deep)]">{token}</span>
			<span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[var(--gold-deep)]">
				{copied ? 'Copied' : 'Copy'} <Copy className="size-3.5" />
			</span>
		</button>
	);
}
