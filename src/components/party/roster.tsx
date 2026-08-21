import { useState } from 'react';
import { HeartPulse, Shield, Sparkles, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Progress } from '#/components/ui/progress';
import type { PartyRoster } from '#/lib/api';
import { battlePartyArtForClass } from '#/lib/game-art';

const statLabels = [
	['strength', 'Strength'],
	['agility', 'Agility'],
	['vitality', 'Vitality'],
	['insight', 'Insight'],
] as const;

function memberName(member: PartyRoster['members'][number]) {
	return member.character?.name ?? member.displayName ?? 'Unnamed traveler';
}

function healthPercent(member: PartyRoster['members'][number]) {
	if (!member.health || member.health.maxHealth <= 0) return 0;
	return (member.health.currentHealth / member.health.maxHealth) * 100;
}

function experiencePercent(member: PartyRoster['members'][number]) {
	const levelStart = Math.max(0, (member.progression.level - 1) ** 2 * 100);
	const levelSpan = Math.max(1, member.progression.nextLevelExperience - levelStart);
	return ((member.progression.experience - levelStart) / levelSpan) * 100;
}

export function Roster({ roster, currentUserId }: { roster: PartyRoster; currentUserId: string }) {
	const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
	const selectedMember = roster.members.find((member) => member.userId === (selectedUserId ?? currentUserId)) ?? roster.members.at(0);
	const selectedMemberArt = selectedMember?.character ? battlePartyArtForClass(selectedMember.character.classKey) : null;

	return (
		<Card variant="game" tone="atlas" data-testid="party-roster">
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="eyebrow game-pixel-label">Travelers</p>
						<CardTitle className="mt-3 text-2xl">The party roster</CardTitle>
					</div>
					<UsersRound className="size-6 text-[var(--gold)]" aria-hidden="true" />
				</div>
				<CardDescription>Select a traveler to inspect their character sheet.</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-5 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.3fr)]">
				<ul className="m-0 list-none space-y-2 p-0" aria-label="Party members">
					{roster.members.map((member) => {
						const selected = selectedMember?.userId === member.userId;
						const name = memberName(member);
						const memberArt = member.character ? battlePartyArtForClass(member.character.classKey) : null;
						return (
							<li key={member.userId}>
								<button
									type="button"
									data-testid="party-member"
									className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold-line)] hover:bg-[var(--gold-wash)]"
									data-selected={selected}
									data-member-id={member.userId}
									aria-pressed={selected}
									aria-controls="party-member-sheet"
									onClick={() => setSelectedUserId(member.userId)}
								>
									<div className="flex items-center gap-3">
										<span
											className={`roster-member-avatar ${memberArt ? '' : 'roster-member-avatar-fallback'}`}
											aria-hidden="true"
											style={
												memberArt
													? {
															backgroundImage: `url('${memberArt.src}')`,
															backgroundPosition: memberArt.position,
															backgroundSize: memberArt.backgroundSize,
														}
													: undefined
											}
										>
											{!memberArt && name.slice(0, 1).toUpperCase()}
										</span>
										<span className="min-w-0 flex-1">
											<strong className="block truncate text-sm font-extrabold text-[var(--indigo)]">{name}</strong>
											<span className="mt-1 block text-xs text-[var(--ink-soft)]">
												{member.character?.className ?? 'Character sheet unavailable'}
											</span>
										</span>
										{member.role === 'leader' ? (
											<Badge>Leader</Badge>
										) : (
											<Shield className="size-4 text-[var(--teal-deep)]" aria-label="Party member" />
										)}
									</div>
									<div className="mt-3 flex items-center justify-between gap-2 text-[0.65rem] font-bold text-[var(--ink-soft)]">
										<span>Lv. {member.progression.level}</span>
										<span>{member.health ? `${member.health.currentHealth}/${member.health.maxHealth} HP` : 'HP unknown'}</span>
									</div>
									{member.health && (
										<span className="roster-member-health" aria-hidden="true">
											<i style={{ width: `${healthPercent(member)}%` }} />
										</span>
									)}
								</button>
							</li>
						);
					})}
				</ul>

				{selectedMember ? (
					<article
						className="rounded-2xl border border-[var(--gold-line)] bg-[var(--gold-wash)] p-4 sm:p-5"
						data-testid="party-member-sheet"
						id="party-member-sheet"
						aria-labelledby="party-member-sheet-heading"
					>
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div className="flex min-w-0 items-start gap-3">
								<span
									className={`roster-sheet-avatar ${selectedMemberArt ? '' : 'roster-member-avatar-fallback'}`}
									aria-hidden="true"
									style={
										selectedMemberArt
											? {
													backgroundImage: `url('${selectedMemberArt.src}')`,
													backgroundPosition: selectedMemberArt.position,
													backgroundSize: selectedMemberArt.backgroundSize,
												}
											: undefined
									}
								>
									{!selectedMemberArt && memberName(selectedMember).slice(0, 1).toUpperCase()}
								</span>
								<div className="min-w-0">
									<p className="eyebrow game-pixel-label">Character sheet</p>
									<h3 id="party-member-sheet-heading" className="display-title mt-2 text-3xl text-[var(--indigo)]">
										{memberName(selectedMember)}
									</h3>
									<p className="mt-1 text-sm font-bold text-[var(--ink-soft)]">
										{selectedMember.character?.className ?? 'Traveler'}
										{selectedMember.character?.backgroundName ? ` · ${selectedMember.character.backgroundName}` : ''}
									</p>
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{selectedMember.userId === currentUserId && <Badge>You</Badge>}
								{selectedMember.role === 'leader' && <Badge>Leader</Badge>}
							</div>
						</div>

						{selectedMember.character ? (
							<>
								<div className="mt-5 grid gap-3 sm:grid-cols-2">
									<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
										<div className="flex items-center justify-between gap-3">
											<span className="game-pixel-label text-[var(--ink-soft)]">Health</span>
											<HeartPulse className="size-4 text-[var(--teal-deep)]" aria-hidden="true" />
										</div>
										<strong className="mt-2 block font-mono text-xl text-[var(--indigo)]">
											{selectedMember.health ? `${selectedMember.health.currentHealth} / ${selectedMember.health.maxHealth}` : '—'}
										</strong>
										{selectedMember.health ? (
											<Progress
												value={healthPercent(selectedMember)}
												className="mt-2"
												aria-label={`${memberName(selectedMember)} health`}
											/>
										) : (
											<p className="mt-2 text-xs text-[var(--ink-soft)]">No combat health recorded yet.</p>
										)}
									</div>
									<div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
										<div className="flex items-center justify-between gap-3">
											<span className="game-pixel-label text-[var(--ink-soft)]">Progression</span>
											<Sparkles className="size-4 text-[var(--gold-deep)]" aria-hidden="true" />
										</div>
										<strong className="mt-2 block font-mono text-xl text-[var(--indigo)]">Level {selectedMember.progression.level}</strong>
										<p className="mt-1 text-xs text-[var(--ink-soft)]">
											{selectedMember.progression.experience} / {selectedMember.progression.nextLevelExperience} XP
										</p>
										<Progress
											value={experiencePercent(selectedMember)}
											className="mt-2"
											aria-label={`${memberName(selectedMember)} experience`}
										/>
									</div>
								</div>

								<div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
									{statLabels.map(([key, label]) => (
										<div key={key} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
											<p className="game-pixel-label text-[var(--ink-soft)]">{label}</p>
											<p className="display-title mt-2 text-2xl text-[var(--indigo)]">{selectedMember.character?.stats[key]}</p>
										</div>
									))}
								</div>
							</>
						) : (
							<p className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--ink-soft)]">
								This traveler has joined the party, but their character sheet is not available yet.
							</p>
						)}
					</article>
				) : (
					<p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-soft)]">
						No travelers are currently on this trail.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
