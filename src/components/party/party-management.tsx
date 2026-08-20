import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Copy, Crown, LogOut, Send, UserMinus, UsersRound } from 'lucide-react';

import { ErrorNotice } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { Invite, Party } from '#/lib/api';
import { formatDateTime } from '#/lib/dates';
import { useCreateInvite, useKickMember, useLeaveParty, useRevokeInvite, useTransferLeadership } from '#/lib/queries';

export function PartyManagement({
	partyId,
	party,
	userId,
	readOnly = false,
}: {
	partyId: string;
	party: Party;
	userId: string;
	readOnly?: boolean;
}) {
	const navigate = useNavigate();
	const createInviteMutation = useCreateInvite(partyId);
	const revokeInviteMutation = useRevokeInvite(partyId);
	const leaveMutation = useLeaveParty();
	const kickMutation = useKickMember(partyId);
	const transferMutation = useTransferLeadership(partyId);
	const [currentInvite, setCurrentInvite] = useState<Invite | null>(null);
	const [copied, setCopied] = useState(false);

	const isLeader = !readOnly && party.members.some((member) => member.userId === userId && member.role === 'leader');
	const mutationError =
		createInviteMutation.error ?? revokeInviteMutation.error ?? leaveMutation.error ?? kickMutation.error ?? transferMutation.error;

	const createInvite = () => {
		setCopied(false);
		createInviteMutation.mutate(undefined, {
			onSuccess: (invite) => setCurrentInvite(invite),
		});
	};

	const copyInvite = async () => {
		if (!currentInvite) return;
		try {
			await navigator.clipboard.writeText(currentInvite.token);
			setCopied(true);
		} catch {
			setCopied(false);
		}
	};

	const leaveParty = () => {
		if (!window.confirm('Leave this party? You can rejoin only with a fresh invite.')) return;
		leaveMutation.mutate(partyId, {
			onSuccess: () => void navigate({ to: '/parties' }),
		});
	};

	const kickMember = (memberUserId: string, displayName: string | null) => {
		if (!window.confirm(`Remove ${displayName ?? 'this traveler'} from the party?`)) return;
		kickMutation.mutate(memberUserId);
	};

	const transferLeadership = (memberUserId: string, displayName: string | null) => {
		if (!window.confirm(`Make ${displayName ?? 'this traveler'} the party leader?`)) return;
		transferMutation.mutate(memberUserId);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div>
						<Badge>Party management</Badge>
						<CardTitle className="mt-3 text-2xl">Keep the expedition together</CardTitle>
					</div>
					<UsersRound className="size-5 text-[var(--amethyst)]" />
				</div>
				<CardDescription>Invite trusted travelers, choose a leader, or leave the trail when your run is complete.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{readOnly && (
					<p role="status" className="rounded-xl bg-[var(--surface)] p-3 text-sm font-bold text-[var(--ink-soft)]">
						This expedition is abandoned. Party management is read-only.
					</p>
				)}
				{mutationError && <ErrorNotice error={mutationError} message={mutationError.message} />}

				<div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4">
					<div>
						<p className="font-extrabold text-[var(--indigo)]">Invite a traveler</p>
						<p className="mt-1 text-sm text-[var(--ink-soft)]">The token is visible once and expires on the server’s schedule.</p>
					</div>
					{isLeader ? (
						<Button variant="secondary" disabled={createInviteMutation.isPending} onClick={createInvite}>
							<Send className="size-4" /> {createInviteMutation.isPending ? 'Creating…' : 'Create invite'}
						</Button>
					) : (
						<Badge>Leader only</Badge>
					)}
				</div>

				{currentInvite && (
					<div className="rounded-2xl border border-[var(--gold-line)] bg-[var(--surface)] p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="eyebrow">Fresh invite token</p>
								<p className="mt-1 text-xs text-[var(--ink-soft)]">Expires {formatDateTime(currentInvite.expiresAt)}</p>
							</div>
							<Button
								variant="ghost"
								size="sm"
								disabled={readOnly || revokeInviteMutation.isPending}
								onClick={() => revokeInviteMutation.mutate(currentInvite.id, { onSuccess: () => setCurrentInvite(null) })}
							>
								Revoke
							</Button>
						</div>
						<button
							type="button"
							className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-3 text-left hover:brightness-[0.98]"
							onClick={copyInvite}
						>
							<span className="min-w-0 truncate font-mono text-xs text-[var(--gold-deep)]">{currentInvite.token}</span>
							<span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[var(--gold-deep)]">
								{copied ? 'Copied' : 'Copy'} <Copy className="size-3.5" />
							</span>
						</button>
					</div>
				)}

				<div className="space-y-3">
					<div className="flex items-center justify-between gap-3">
						<p className="eyebrow">Roster controls</p>
						<span className="text-xs font-bold text-[var(--ink-soft)]">{party.members.length} travelers</span>
					</div>
					{party.members.map((member) => {
						const isCurrentUser = member.userId === userId;
						return (
							<div
								key={member.userId}
								className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
							>
								<div className="flex items-center gap-3">
									<span className="grid size-9 place-items-center rounded-xl bg-[var(--indigo)] text-[var(--gold)]">
										{member.role === 'leader' ? <Crown className="size-4" /> : <UsersRound className="size-4" />}
									</span>
									<div>
										<p className="font-extrabold text-[var(--indigo)]">
											{member.displayName ?? 'Traveler'}
											{isCurrentUser ? ' · you' : ''}
										</p>
										<p className="mt-1 text-xs capitalize text-[var(--ink-soft)]">{member.role}</p>
									</div>
								</div>
								{isLeader && !isCurrentUser && (
									<div className="flex flex-wrap gap-2">
										<Button
											variant="ghost"
											size="sm"
											disabled={kickMutation.isPending}
											onClick={() => kickMember(member.userId, member.displayName)}
										>
											<UserMinus className="size-4" /> Remove
										</Button>
										<Button
											variant="secondary"
											size="sm"
											disabled={transferMutation.isPending}
											onClick={() => transferLeadership(member.userId, member.displayName)}
										>
											<Crown className="size-4" /> Make leader
										</Button>
									</div>
								)}
							</div>
						);
					})}
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
					<p className="max-w-lg text-sm text-[var(--ink-soft)]">
						Leaving removes you from this expedition. The rest of the party keeps its trail.
					</p>
					<Button variant="danger" disabled={readOnly || leaveMutation.isPending} onClick={leaveParty}>
						<LogOut className="size-4" /> {leaveMutation.isPending ? 'Leaving…' : 'Leave party'}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
