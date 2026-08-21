import { Link } from '@tanstack/react-router';
import { ArrowUpRight, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import type { Party } from '#/lib/api';

export function PartyCard({ party }: { party: Party }) {
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
