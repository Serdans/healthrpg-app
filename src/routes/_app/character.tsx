import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { ConfirmActionDialog } from '#/components/ui/alert-dialog';
import { FieldError } from '#/components/ui/field-error';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { CharacterSheet } from '#/components/character/character-sheet';
import { PageIntro } from '#/components/character/page-intro';
import { Stat } from '#/components/character/stat';
import { getCharacter, startCharacterCreation } from '#/lib/api';
import { queryKeys, useCharacterAnswer, useCommitCharacter, useResetCharacterCreation } from '#/lib/queries';
import { characterNameFormSchema, characterNameSchema } from '#/lib/validation';

export const Route = createFileRoute('/_app/character')({
	head: () => ({ meta: [{ title: 'Character · HealthRPG' }] }),
	component: CharacterPage,
});

function CharacterPage() {
	const characterQuery = useQuery({ queryKey: queryKeys.character, queryFn: getCharacter });
	const creationQuery = useQuery({
		queryKey: queryKeys.characterCreation,
		queryFn: startCharacterCreation,
		enabled: characterQuery.data === null,
	});
	const answerMutation = useCharacterAnswer();
	const commitMutation = useCommitCharacter();
	const resetMutation = useResetCharacterCreation();
	const navigate = useNavigate();
	const [resetDialogOpen, setResetDialogOpen] = useState(false);
	const characterForm = useForm({
		defaultValues: { name: '' },
		validators: { onSubmit: characterNameFormSchema },
		onSubmit: async ({ value }) => {
			await commitMutation.mutateAsync(value.name.trim());
			await navigate({ to: '/app' });
		},
	});
	const resetCreation = () => {
		resetMutation.mutate(undefined, {
			onSuccess: () => characterForm.reset(),
		});
	};

	if (characterQuery.isPending) return <LoadingState label="Checking your character sheet…" />;
	if (characterQuery.isError)
		return (
			<ErrorNotice
				error={characterQuery.error}
				message={characterQuery.error.message}
				onRetry={() => void characterQuery.refetch()}
				retrying={characterQuery.isFetching}
				retryLabel="Retry character"
			/>
		);
	if (characterQuery.data) return <CharacterSheet character={characterQuery.data} />;
	if (creationQuery.isPending) return <LoadingState label="Preparing your origin story…" />;
	if (creationQuery.isError)
		return (
			<ErrorNotice
				error={creationQuery.error}
				message={creationQuery.error.message}
				onRetry={() => void creationQuery.refetch()}
				retrying={creationQuery.isFetching}
				retryLabel="Retry origin"
			/>
		);

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
					<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
						<div>
							<p className="eyebrow">
								Question {creation.answeredCount + 1} of {creation.totalQuestions}
							</p>
							<div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-[var(--line)] sm:w-72">
								<div className="h-full rounded-full bg-[var(--gold)] transition-[width]" style={{ width: `${progress}%` }} />
							</div>
						</div>
						<div className="flex items-center gap-3">
							<Sparkles className="size-6 text-[var(--gold)]" />
							<Button variant="ghost" size="sm" disabled={resetMutation.isPending} onClick={() => setResetDialogOpen(true)}>
								{resetMutation.isPending ? 'Starting over…' : 'Start over'}
							</Button>
						</div>
					</div>
					<CardTitle className="max-w-2xl text-3xl sm:text-4xl">{creation.question.prompt}</CardTitle>
					<CardContent className="mt-8 grid gap-3">
						{creation.question.options.map((option, index) => (
							<button
								key={option.id}
								type="button"
								className="choice-card group flex items-center gap-4 rounded-2xl p-4 text-left"
								disabled={answerMutation.isPending || resetMutation.isPending}
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
					{answerMutation.isError && <ErrorNotice error={answerMutation.error} message={answerMutation.error.message} />}
					{resetMutation.isError && <ErrorNotice error={resetMutation.error} message={resetMutation.error.message} />}
				</Card>
				<ConfirmActionDialog
					open={resetDialogOpen}
					onOpenChange={setResetDialogOpen}
					title="Start character creation over?"
					description="Your current answers will be discarded and you will return to the first origin question."
					confirmLabel="Start over"
					destructive
					pending={resetMutation.isPending}
					onConfirm={resetCreation}
				/>
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
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<Badge>Origin preview</Badge>
								<CardTitle className="mt-4 text-4xl">{preview.flavorTitle}</CardTitle>
							</div>
							<Button variant="ghost" size="sm" disabled={resetMutation.isPending} onClick={() => setResetDialogOpen(true)}>
								{resetMutation.isPending ? 'Starting over…' : 'Start over'}
							</Button>
						</div>
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
						<form
							className="space-y-4"
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void characterForm.handleSubmit();
							}}
						>
							<characterForm.Field name="name" validators={{ onBlur: characterNameSchema }}>
								{(field) => {
									const errorId = 'character-name-error';
									const hasError = field.state.meta.errors.length > 0;
									return (
										<div>
											<Label htmlFor="character-name">Traveler name</Label>
											<Input
												id="character-name"
												value={field.state.value}
												maxLength={64}
												placeholder="e.g. Mira of Mossway"
												aria-invalid={hasError}
												aria-describedby={hasError ? errorId : undefined}
												onBlur={field.handleBlur}
												onChange={(event) => {
													commitMutation.reset();
													field.handleChange(event.target.value);
												}}
											/>
											<FieldError id={errorId} errors={field.state.meta.errors} />
										</div>
									);
								}}
							</characterForm.Field>
							<characterForm.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
									name: state.values.name,
								})}
							>
								{({ canSubmit, isSubmitting, name: currentName }) => (
									<Button
										className="w-full"
										type="submit"
										disabled={!currentName.trim() || !canSubmit || isSubmitting || commitMutation.isPending || resetMutation.isPending}
										aria-busy={isSubmitting || commitMutation.isPending || resetMutation.isPending}
									>
										{isSubmitting || commitMutation.isPending ? 'Entering the trail…' : 'Enter the trail'}{' '}
										<ChevronRight className="size-4" />
									</Button>
								)}
							</characterForm.Subscribe>
						</form>
						{commitMutation.isError && <ErrorNotice error={commitMutation.error} message={commitMutation.error.message} />}
						{resetMutation.isError && <ErrorNotice error={resetMutation.error} message={resetMutation.error.message} />}
					</CardContent>
				</Card>
			</div>
			<ConfirmActionDialog
				open={resetDialogOpen}
				onOpenChange={setResetDialogOpen}
				title="Start character creation over?"
				description="Your current answers will be discarded and you will return to the first origin question."
				confirmLabel="Start over"
				destructive
				pending={resetMutation.isPending}
				onConfirm={resetCreation}
			/>
		</div>
	);
}
