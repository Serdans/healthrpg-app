import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Footprints, HeartPulse, Moon } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { localDateForTimezone } from '#/lib/dates';
import { useCharacter, useMe, useParties, useProgress } from '#/lib/queries';
import { Metric } from '#/components/dashboard/metric';
import { PartyPreview } from '#/components/dashboard/party-preview';

export const Route = createFileRoute('/_app/app')({
	head: () => ({ meta: [{ title: 'Trail · HealthRPG' }] }),
	component: AppDashboard,
});

function AppDashboard() {
	const characterQuery = useCharacter();
	const partiesQuery = useParties();
	const meQuery = useMe();
	const navigate = useNavigate();
	const localDate = localDateForTimezone(meQuery.data?.timezone ?? 'UTC');
	const progressQuery = useProgress(localDate, Boolean(meQuery.data), 15_000);

	if (characterQuery.isPending || partiesQuery.isPending || meQuery.isPending) return <LoadingState label="Gathering your expedition…" />;
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
	if (partiesQuery.isError)
		return (
			<ErrorNotice
				error={partiesQuery.error}
				message={partiesQuery.error.message}
				onRetry={() => void partiesQuery.refetch()}
				retrying={partiesQuery.isFetching}
				retryLabel="Retry parties"
			/>
		);
	if (meQuery.isError)
		return (
			<ErrorNotice
				error={meQuery.error}
				message={meQuery.error.message}
				onRetry={() => void meQuery.refetch()}
				retrying={meQuery.isFetching}
				retryLabel="Retry profile"
			/>
		);

	const character = characterQuery.data;
	const parties = partiesQuery.data;
	const progress = progressQuery.data;

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="eyebrow">Expedition desk</p>
					<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">The trail remembers.</h1>
					<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
						{character ? `Welcome back, ${character.name}.` : 'Before your party can set out, discover who you are on the trail.'}
					</p>
				</div>
				<Badge className="w-fit">Daylight · provisional</Badge>
			</div>

			{progressQuery.isError && (
				<ErrorNotice
					error={progressQuery.error}
					message={progressQuery.error.message}
					onRetry={() => void progressQuery.refetch()}
					retrying={progressQuery.isFetching}
					retryLabel="Retry progress"
				/>
			)}

			{!character && (
				<Card className="overflow-hidden border-[color-mix(in_srgb,var(--amethyst)_32%,var(--line-strong))] bg-[linear-gradient(135deg,rgba(134,98,178,0.12),rgba(255,250,240,0.82))]">
					<div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="eyebrow">First step</p>
							<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Find your origin before you find a party.</h2>
							<p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
								Eight questions create a durable character with a class, background, and a few strengths that will shape how health
								contributes to the journey.
							</p>
						</div>
						<Button className="shrink-0" onClick={() => void navigate({ to: '/character' })}>
							Create character <ArrowUpRight className="size-4" />
						</Button>
					</div>
				</Card>
			)}

			<section className="grid gap-4 md:grid-cols-3">
				<Metric
					icon={<Footprints />}
					label="Movement"
					value={progress ? `${progress.movementUnits}` : '—'}
					copy={
						progress?.steps === null || progress?.steps === undefined
							? 'Steps become travel units.'
							: `${progress.steps.toLocaleString()} steps today`
					}
				/>
				<Metric
					icon={<Moon />}
					label="Recovery"
					value={progress ? `${progress.recoveryPoints}` : '—'}
					copy={
						progress?.sleepMinutes === null || progress?.sleepMinutes === undefined
							? 'Sleep steadies your party.'
							: `${progress.sleepMinutes} minutes asleep`
					}
				/>
				<Metric
					icon={<HeartPulse />}
					label="Party health"
					value={progress?.status === 'complete' ? 'Complete' : character ? 'Provisional' : 'Waiting'}
					copy={`Signals for ${localDate}. Private data, shared momentum.`}
				/>
			</section>

			<section>
				<div className="mb-4 flex items-end justify-between gap-4">
					<div>
						<p className="eyebrow">Your parties</p>
						<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">Where should we go?</h2>
					</div>
					<Link
						to="/parties"
						className="hidden items-center gap-1 text-sm font-extrabold text-[var(--gold-deep)] no-underline hover:text-[var(--indigo)] sm:flex"
					>
						Manage parties <ArrowUpRight className="size-4" />
					</Link>
				</div>
				{parties.length === 0 ? (
					<EmptyState
						title="No party has claimed a trailhead yet."
						copy="Create a party for your friends or join one with an invite token."
					/>
				) : (
					<div className="grid gap-4 lg:grid-cols-2">
						{parties.map((party) => (
							<PartyPreview key={party.id} party={party} />
						))}
					</div>
				)}
			</section>
		</div>
	);
}
