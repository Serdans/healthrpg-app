import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { CharacterSheet } from '#/components/character/character-sheet';
import { PageIntro } from '#/components/character/page-intro';
import { Stat } from '#/components/character/stat';
import { getCharacter, startCharacterCreation } from '#/lib/api';
import { queryKeys, useCharacterAnswer, useCommitCharacter } from '#/lib/queries';

export const Route = createFileRoute('/_app/character')({ component: CharacterPage });

function CharacterPage() {
	const characterQuery = useQuery({ queryKey: queryKeys.character, queryFn: getCharacter });
	const creationQuery = useQuery({
		queryKey: queryKeys.characterCreation,
		queryFn: startCharacterCreation,
		enabled: characterQuery.data === null,
	});
	const answerMutation = useCharacterAnswer();
	const commitMutation = useCommitCharacter();
	const navigate = useNavigate();
	const [name, setName] = useState('');

	if (characterQuery.isPending) return <LoadingState label="Checking your character sheet…" />;
	if (characterQuery.isError) return <ErrorNotice message={characterQuery.error.message} />;
	if (characterQuery.data) return <CharacterSheet character={characterQuery.data} />;
	if (creationQuery.isPending) return <LoadingState label="Preparing your origin story…" />;
	if (creationQuery.isError) return <ErrorNotice message={creationQuery.error.message} />;

	const creation = creationQuery.data;

	if (creation.status === 'in_progress') {
		const progress = (creation.answeredCount / creation.totalQuestions) * 100;
		return (
			<div className="mx-auto max-w-3xl">
				<PageIntro
					eyebrow="Character origin"
					title="Who answers the call?"
					copy="Eight small choices shape the traveler you bring to the trail."
				/>
				<Card className="mt-8">
					<div className="mb-8 flex items-center justify-between gap-4">
						<div>
							<p className="eyebrow">
								Question {creation.answeredCount + 1} of {creation.totalQuestions}
							</p>
							<div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-[var(--line)] sm:w-72">
								<div className="h-full rounded-full bg-[var(--gold)] transition-[width]" style={{ width: `${progress}%` }} />
							</div>
						</div>
						<Sparkles className="size-6 text-[var(--gold)]" />
					</div>
					<CardTitle className="max-w-2xl text-3xl sm:text-4xl">{creation.question.prompt}</CardTitle>
					<CardContent className="mt-8 grid gap-3">
						{creation.question.options.map((option, index) => (
							<button
								key={option.id}
								type="button"
								className="choice-card group flex items-center gap-4 rounded-2xl p-4 text-left"
								disabled={answerMutation.isPending}
								onClick={() => answerMutation.mutate({ questionId: creation.question.id, answerId: option.id })}
							>
								<span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--indigo)] font-mono text-sm font-bold text-[var(--parchment-bright)] transition group-hover:bg-[var(--amethyst)]">
									{String.fromCharCode(65 + index)}
								</span>
								<span className="flex-1 font-bold text-[var(--ink)]">{option.label}</span>
								<ChevronRight className="size-5 text-[var(--ink-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--gold-deep)]" />
							</button>
						))}
					</CardContent>
					{answerMutation.isError && <ErrorNotice message={answerMutation.error.message} />}
				</Card>
			</div>
		);
	}

	const preview = creation.preview;
	return (
		<div className="mx-auto max-w-4xl">
			<PageIntro
				eyebrow="Origin complete"
				title="Give your traveler a name."
				copy="The trail has revealed a first shape. Name the person who will walk it."
			/>
			<div className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.72fr]">
				<Card>
					<CardHeader>
						<Badge>Origin preview</Badge>
						<CardTitle className="mt-4 text-4xl">{preview.flavorTitle}</CardTitle>
						<CardDescription>{preview.flavorSummary}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<Stat label="Strength" value={preview.stats.strength} />
							<Stat label="Agility" value={preview.stats.agility} />
							<Stat label="Vitality" value={preview.stats.vitality} />
							<Stat label="Insight" value={preview.stats.insight} />
						</div>
						<div className="rounded-2xl bg-[var(--amethyst-wash)] p-4 text-sm leading-7 text-[var(--ink-soft)]">{preview.backstory}</div>
						<div className="flex flex-wrap gap-2">
							<Badge className="border-[color-mix(in_srgb,var(--amethyst)_30%,transparent)] bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
								{preview.className}
							</Badge>
							<Badge>{preview.backgroundName}</Badge>
							{preview.backgroundTags.map((tag) => (
								<Badge key={tag} className="bg-transparent">
									{tag}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
				<Card className="h-fit">
					<CardHeader>
						<CardTitle className="text-2xl">One last detail</CardTitle>
						<CardDescription>This name follows you through every party and chapter.</CardDescription>
					</CardHeader>
					<CardContent>
						<Label htmlFor="character-name">Traveler name</Label>
						<Input
							id="character-name"
							value={name}
							maxLength={64}
							placeholder="e.g. Mira of Mossway"
							onChange={(event) => setName(event.target.value)}
						/>
						<Button
							className="w-full"
							disabled={!name.trim() || commitMutation.isPending}
							onClick={() => commitMutation.mutate(name.trim(), { onSuccess: () => void navigate({ to: '/app' }) })}
						>
							Enter the trail <ChevronRight className="size-4" />
						</Button>
						{commitMutation.isError && <ErrorNotice message={commitMutation.error.message} />}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
