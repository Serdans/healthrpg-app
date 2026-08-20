import { createFileRoute } from '@tanstack/react-router';
import { Award, LockKeyhole, Sparkles } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Progress } from '#/components/ui/progress';
import { useProgression } from '#/lib/queries';

export const Route = createFileRoute('/_app/progression')({
	head: () => ({ meta: [{ title: 'Progress · HealthRPG' }] }),
	component: ProgressionPage,
});

function ProgressionPage() {
	const progressionQuery = useProgression();

	if (progressionQuery.isPending) return <LoadingState label="Reading your trail marks…" />;
	if (progressionQuery.isError)
		return (
			<ErrorNotice
				error={progressionQuery.error}
				message={progressionQuery.error.message}
				onRetry={() => void progressionQuery.refetch()}
				retrying={progressionQuery.isFetching}
				retryLabel="Retry progression"
			/>
		);

	const progression = progressionQuery.data;
	const progressPercent = progression.nextLevelExperience > 0 ? (progression.experience / progression.nextLevelExperience) * 100 : 100;

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Traveler progression</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">The trail changes you.</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					Every resolved encounter and event leaves a mark. See what you have earned and what is waiting beyond the next level.
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<Badge>Level {progression.level}</Badge>
							<CardTitle className="mt-4 text-3xl">A steady ascent</CardTitle>
						</div>
						<span className="grid size-12 place-items-center rounded-2xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">
							<Award className="size-6" />
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex items-end justify-between gap-3 text-sm">
						<span className="font-bold text-[var(--ink-soft)]">Experience toward next level</span>
						<span className="font-mono text-[var(--indigo)]">
							{progression.experience} / {progression.nextLevelExperience}
						</span>
					</div>
					<Progress value={progressPercent} />
					<div className="grid gap-3 sm:grid-cols-3">
						<div className="rounded-2xl bg-[var(--teal)]/10 p-4">
							<p className="eyebrow">Current level</p>
							<p className="mt-2 font-mono text-3xl text-[var(--teal-deep)]">{progression.level}</p>
						</div>
						<div className="rounded-2xl bg-[var(--gold-wash)] p-4">
							<p className="eyebrow">Experience</p>
							<p className="mt-2 font-mono text-3xl text-[var(--gold-deep)]">{progression.experience}</p>
						</div>
						<div className="rounded-2xl bg-[var(--amethyst-wash)] p-4">
							<p className="eyebrow">Discoveries</p>
							<p className="mt-2 font-mono text-3xl text-[var(--amethyst)]">{progression.unlocks.length}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<section>
				<div className="mb-4 flex items-end justify-between gap-4">
					<div>
						<p className="eyebrow">Milestones and unlocks</p>
						<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">What the journey has opened</h2>
					</div>
					<Sparkles className="size-5 text-[var(--gold-deep)]" />
				</div>
				{progression.unlocks.length === 0 ? (
					<EmptyState title="The map is still writing your story." copy="Complete a party event or encounter to earn your first mark." />
				) : (
					<div className="grid gap-4 sm:grid-cols-2">
						{progression.unlocks.map((unlock) => (
							<Card key={`${unlock.unlockType}-${unlock.key}`} className="p-5">
								<div className="flex items-start gap-3">
									<span className="grid size-10 place-items-center rounded-xl bg-[var(--amethyst-wash)] text-[var(--amethyst)]">
										{unlock.unlockType === 'milestone' ? <Award className="size-5" /> : <LockKeyhole className="size-5" />}
									</span>
									<div>
										<p className="eyebrow">{unlock.unlockType}</p>
										<p className="mt-2 font-extrabold text-[var(--indigo)]">{unlock.key}</p>
									</div>
								</div>
							</Card>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
