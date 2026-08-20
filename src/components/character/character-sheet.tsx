import { Check, Shield, Sparkles } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import type { Character } from '#/lib/api';
import { PageIntro } from './page-intro';
import { Stat } from './stat';

export function CharacterSheet({ character }: { character: NonNullable<Character> }) {
	return (
		<div className="mx-auto max-w-4xl">
			<PageIntro
				eyebrow="Your traveler"
				title={character.name}
				copy="Your origin is set. Every step and night of rest now contributes to this story."
			/>
			<Card className="mt-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<Badge>{character.className}</Badge>
						<h2 className="display-title mt-4 text-4xl text-[var(--indigo)]">{character.flavorTitle}</h2>
						<p className="mt-2 text-[var(--ink-soft)]">
							{character.backgroundName} · {character.flavorSummary}
						</p>
					</div>
					<div className="grid size-16 place-items-center rounded-2xl bg-[var(--indigo)] text-[var(--gold)]">
						{character.classKey === 'warrior' ? <Shield className="size-8" /> : <Sparkles className="size-8" />}
					</div>
				</div>
				<div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
					<Stat label="Strength" value={character.stats.strength} />
					<Stat label="Agility" value={character.stats.agility} />
					<Stat label="Vitality" value={character.stats.vitality} />
					<Stat label="Insight" value={character.stats.insight} />
				</div>
				<div className="mt-6 flex items-center gap-2 rounded-2xl bg-[var(--teal)]/10 p-4 text-sm font-bold text-[var(--teal-deep)]">
					<Check className="size-5" /> Ready for the next party decision.
				</div>
			</Card>
		</div>
	);
}
