import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, Footprints, HeartPulse, Moon } from 'lucide-react';

import { EmptyState, ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { useCharacter, useParties } from '#/lib/queries';
import { Metric } from '#/components/dashboard/metric';
import { PartyPreview } from '#/components/dashboard/party-preview';

export const Route = createFileRoute('/_app/app')({ component: AppDashboard });

function AppDashboard() {
	const characterQuery = useCharacter();
	const partiesQuery = useParties();

	if (characterQuery.isPending || partiesQuery.isPending) return <LoadingState label="Gathering your expedition…" />;
	if (characterQuery.isError) return <ErrorNotice message={characterQuery.error.message} />;
	if (partiesQuery.isError) return <ErrorNotice message={partiesQuery.error.message} />;

	const character = characterQuery.data;
	const parties = partiesQuery.data;

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
						<Button
							className="shrink-0"
							onClick={() => {
								window.location.href = '/character';
							}}
						>
							Create character <ArrowUpRight className="size-4" />
						</Button>
					</div>
				</Card>
			)}

			<section className="grid gap-4 md:grid-cols-3">
				<Metric icon={<Footprints />} label="Movement" value="—" copy="Steps become travel units." />
				<Metric icon={<Moon />} label="Recovery" value="—" copy="Sleep steadies your party." />
				<Metric
					icon={<HeartPulse />}
					label="Party health"
					value={character ? 'Ready' : 'Waiting'}
					copy="Private signals, shared momentum."
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
