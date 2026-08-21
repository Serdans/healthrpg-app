import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Copy, Crown, LogOut, Send, UserMinus, UsersRound } from 'lucide-react';

import { ErrorNotice, SuccessNotice } from '#/components/app-state';
import { ConfirmActionDialog } from '#/components/ui/alert-dialog';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import type { Invite, Party } from '#/lib/api';
import { copyText } from '#/lib/clipboard';
import { formatDateTime } from '#/lib/dates';
import { useCreateInvite, useKickMember, useLeaveParty, useRevokeInvite, useTransferLeadership } from '#/lib/queries';

type ManagementConfirmation =
	| { action: 'leave' }
	| { action: 'kick'; memberUserId: string; displayName: string | null }
	| { action: 'transfer'; memberUserId: string; displayName: string | null }
	| { action: 'revoke'; inviteId: string }
	| null;

export function PartyManagement({
	partyId,
	party,
	userId,
	timeZone,
	readOnly = false,
}: {
	partyId: string;
	party: Party;
	userId: string;
	timeZone: string;
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
	const [copyError, setCopyError] = useState(false);
	const [status, setStatus] = useState<string | null>(null);
	const [confirmation, setConfirmation] = useState<ManagementConfirmation>(null);

	const isLeader = !readOnly && party.members.some((member) => member.userId === userId && member.role === 'leader');
	const managementBusy =
		createInviteMutation.isPending ||
		revokeInviteMutation.isPending ||
		leaveMutation.isPending ||
		kickMutation.isPending ||
		transferMutation.isPending;
	const mutationError =
		createInviteMutation.error ?? revokeInviteMutation.error ?? leaveMutation.error ?? kickMutation.error ?? transferMutation.error;

	const createInvite = () => {
		setCopied(false);
		setCopyError(false);
		setStatus(null);
		createInviteMutation.mutate(undefined, {
			onSuccess: (invite) => {
				setCurrentInvite(invite);
				setStatus('A fresh invite token is ready to share.');
			},
		});
	};

	const copyInvite = async () => {
		if (!currentInvite) return;
		const didCopy = await copyText(currentInvite.token);
		setCopied(didCopy);
		setCopyError(!didCopy);
		setStatus(didCopy ? 'Invite token copied to your clipboard.' : null);
	};

	const leaveParty = () => {
		setStatus(null);
		leaveMutation.mutate(partyId, {
			onSuccess: () => {
				void navigate({ to: '/parties' });
			},
		});
	};

	const kickMember = (memberUserId: string) => {
		setStatus(null);
		kickMutation.mutate(memberUserId, {
			onSuccess: () => setStatus('Traveler removed from the party.'),
		});
	};

	const transferLeadership = (memberUserId: string) => {
		setStatus(null);
		transferMutation.mutate(memberUserId, {
			onSuccess: () => setStatus('Leadership transferred.'),
		});
	};

	const revokeInvite = (inviteId: string) => {
		setStatus(null);
		revokeInviteMutation.mutate(inviteId, {
			onSuccess: () => {
				setCurrentInvite(null);
				setStatus('Invite revoked.');
			},
		});
	};

	const confirmAction = () => {
		if (!confirmation) return;
		switch (confirmation.action) {
			case 'leave':
				leaveParty();
				break;
			case 'kick':
				kickMember(confirmation.memberUserId);
				break;
			case 'transfer':
				transferLeadership(confirmation.memberUserId);
				break;
			case 'revoke':
				revokeInvite(confirmation.inviteId);
				break;
		}
	};

	return (
		<Card variant="game" tone="history">
			<CardHeader>
				<div className="flex items-start justify-between gap-4">
					<div>
						<Badge>Party management</Badge>
						<CardTitle className="mt-3 text-2xl">Keep the expedition together</CardTitle>
					</div>
					<UsersRound className="size-5 text-[var(--amethyst)]" aria-hidden="true" />
				</div>
				<CardDescription>Invite trusted travelers, choose a leader, or leave the trail when your run is complete.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{readOnly && (
					<p role="status" className="game-inset game-inset-muted p-3 text-sm font-bold text-[var(--ink-soft)]">
						This expedition is abandoned. Party management is read-only.
					</p>
				)}
				{mutationError && <ErrorNotice error={mutationError} message={mutationError.message} />}
				{copyError && <ErrorNotice message="Could not copy the invite token. Select the token and copy it manually." />}
				{status && <SuccessNotice>{status}</SuccessNotice>}

				<div className="game-inset game-inset-gold flex flex-wrap items-center justify-between gap-3 p-4">
					<div>
						<p className="font-extrabold text-[var(--indigo)]">Invite a traveler</p>
						<p className="mt-1 text-sm text-[var(--ink-soft)]">The token is visible once and expires on the server’s schedule.</p>
					</div>
					{isLeader ? (
						<Button game variant="secondary" disabled={managementBusy} onClick={createInvite}>
							<Send className="size-4" aria-hidden="true" /> {createInviteMutation.isPending ? 'Creating…' : 'Create invite'}
						</Button>
					) : (
						<Badge>Leader only</Badge>
					)}
				</div>

				{currentInvite && (
					<div className="game-inset game-inset-muted p-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="eyebrow">Fresh invite token</p>
								<p className="mt-1 text-xs text-[var(--ink-soft)]">Expires {formatDateTime(currentInvite.expiresAt, timeZone)}</p>
							</div>
							<Button
								game
								variant="ghost"
								size="sm"
								disabled={readOnly || managementBusy}
								onClick={() => setConfirmation({ action: 'revoke', inviteId: currentInvite.id })}
							>
								Revoke
							</Button>
						</div>
						<button
							type="button"
							className="game-inset game-inset-gold mt-3 flex w-full items-center justify-between gap-3 p-3 text-left hover:brightness-[0.98]"
							onClick={copyInvite}
						>
							<span className="min-w-0 truncate font-mono text-xs text-[var(--gold-deep)]">{currentInvite.token}</span>
							<span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[var(--gold-deep)]">
								{copied ? 'Copied' : 'Copy'} <Copy className="size-3.5" aria-hidden="true" />
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
							<div key={member.userId} className="game-inset game-inset-muted flex flex-wrap items-center justify-between gap-3 p-4">
								<div className="flex items-center gap-3">
									<span className="grid size-9 place-items-center rounded-xl bg-[var(--indigo)] text-[var(--gold)]">
										{member.role === 'leader' ? (
											<Crown className="size-4" aria-hidden="true" />
										) : (
											<UsersRound className="size-4" aria-hidden="true" />
										)}
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
											game
											variant="ghost"
											size="sm"
											disabled={managementBusy}
											onClick={() => setConfirmation({ action: 'kick', memberUserId: member.userId, displayName: member.displayName })}
										>
											<UserMinus className="size-4" aria-hidden="true" /> Remove
										</Button>
										<Button
											game
											variant="secondary"
											size="sm"
											disabled={managementBusy}
											onClick={() => setConfirmation({ action: 'transfer', memberUserId: member.userId, displayName: member.displayName })}
										>
											<Crown className="size-4" aria-hidden="true" /> Make leader
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
					<Button game variant="danger" disabled={readOnly || managementBusy} onClick={() => setConfirmation({ action: 'leave' })}>
						<LogOut className="size-4" aria-hidden="true" /> {leaveMutation.isPending ? 'Leaving…' : 'Leave party'}
					</Button>
				</div>
				<ConfirmActionDialog
					open={confirmation !== null}
					onOpenChange={(open) => {
						if (!open) setConfirmation(null);
					}}
					title={
						confirmation?.action === 'leave'
							? 'Leave this party?'
							: confirmation?.action === 'kick'
								? `Remove ${confirmation.displayName ?? 'this traveler'}?`
								: confirmation?.action === 'transfer'
									? `Make ${confirmation.displayName ?? 'this traveler'} the party leader?`
									: 'Revoke this invite?'
					}
					description={
						confirmation?.action === 'leave'
							? 'You can rejoin only with a fresh invite. The rest of the party keeps its trail.'
							: confirmation?.action === 'kick'
								? 'This traveler will be removed from the expedition.'
								: confirmation?.action === 'transfer'
									? 'Leadership controls invites and roster management for this party.'
									: 'This token will stop working immediately and cannot be restored.'
					}
					confirmLabel={
						confirmation?.action === 'transfer'
							? 'Make leader'
							: confirmation?.action === 'revoke'
								? 'Revoke invite'
								: confirmation?.action === 'kick'
									? 'Remove traveler'
									: 'Leave party'
					}
					destructive={confirmation?.action !== 'transfer'}
					pending={managementBusy}
					onConfirm={confirmAction}
				/>
			</CardContent>
		</Card>
	);
}
