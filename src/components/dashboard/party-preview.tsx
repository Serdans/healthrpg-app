import { Link } from '@tanstack/react-router';
import { ArrowUpRight, MapPinned, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import type { Party } from '#/lib/api';

export function PartyPreview({ party }: { party: Party }) {
	return (
		<Card className="group relative overflow-hidden p-0">
			<div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[var(--gold-wash)] blur-3xl transition group-hover:bg-[var(--amethyst-wash)]" />
			<div className="relative p-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<Badge className={party.status === 'abandoned' ? 'border-[var(--line-strong)] bg-transparent text-[var(--ink-soft)]' : ''}>
							{party.status}
						</Badge>
						<h3 className="display-title mt-3 text-3xl text-[var(--indigo)]">{party.name}</h3>
					</div>
					<MapPinned className="size-6 text-[var(--gold)]" />
				</div>
				<div className="mt-7 grid gap-4 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
					<div>
						<p className="eyebrow">Current node</p>
						<p className="mt-1 font-bold text-[var(--ink)]">{party.currentNode.name}</p>
						<p className="mt-1 text-xs capitalize text-[var(--ink-soft)]">
							{party.currentNode.nodeType} · chapter {party.currentNode.chapterNo}
						</p>
					</div>
					<div>
						<p className="eyebrow">Travelers</p>
						<p className="mt-1 flex items-center gap-2 font-bold text-[var(--ink)]">
							<UsersRound className="size-4 text-[var(--amethyst)]" /> {party.members.length} / {party.memberCapacity}
						</p>
						<p className="mt-1 text-xs text-[var(--ink-soft)]">{party.gateProgress} gate progress</p>
					</div>
				</div>
				<Link
					to="/parties/$partyId"
					params={{ partyId: party.id }}
					className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--gold-deep)] no-underline hover:text-[var(--indigo)]"
				>
					Open party dashboard <ArrowUpRight className="size-4" />
				</Link>
			</div>
		</Card>
	);
}
