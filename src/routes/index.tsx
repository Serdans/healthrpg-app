import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ArrowRight, HeartPulse, Map, Sparkles, UsersRound } from 'lucide-react';

import { getSession } from '#/lib/session';

export const Route = createFileRoute('/')({
	beforeLoad: async () => {
		const session = await getSession();
		if (session.user) throw redirect({ to: '/app' });
	},
	component: LandingPage,
});

function LandingPage() {
	return (
		<main className="min-h-screen pb-16">
			<header className="page-wrap flex items-center justify-between py-7">
				<div className="flex items-center gap-3">
					<span className="sigil" aria-hidden="true">
						✦
					</span>
					<div>
						<span className="display-title block text-xl font-semibold text-[var(--indigo)]">HealthRPG</span>
						<span className="eyebrow block text-[0.58rem]">A living party trail</span>
					</div>
				</div>
				<span className="hidden rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink-soft)] sm:block">
					Early expedition build
				</span>
			</header>

			<section className="page-wrap grid items-center gap-12 pb-12 pt-9 lg:grid-cols-[1.05fr_0.95fr] lg:pt-20">
				<div>
					<p className="eyebrow mb-5">Your health is the compass</p>
					<h1 className="display-title max-w-3xl text-5xl font-semibold leading-[0.98] text-[var(--indigo)] sm:text-7xl">
						Make the next step part of the story.
					</h1>
					<p className="mt-7 max-w-xl text-lg leading-8 text-[var(--ink-soft)]">
						A gentle party adventure that turns real movement and rest into shared progress, branching choices, and a trail worth returning
						to tomorrow.
					</p>
					<div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
						<Link
							to="/auth/google/start"
							reloadDocument
							preload={false}
							className="inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-[var(--indigo)] px-6 text-base font-extrabold text-[var(--parchment-bright)] no-underline shadow-[0_10px_24px_rgba(33,29,78,0.24)] hover:-translate-y-0.5 hover:bg-[var(--indigo-light)]"
						>
							Continue with Google <ArrowRight className="size-5" />
						</Link>
						<span className="text-xs leading-5 text-[var(--ink-faint)] sm:max-w-44">
							Secure sign-in. Your health connection stays private to your party.
						</span>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-md">
					<div className="absolute -inset-4 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(134,98,178,0.3),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(76,170,165,0.3),transparent_45%)] blur-2xl" />
					<div className="parchment-card relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
						<div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[var(--amethyst-wash)] blur-3xl" />
						<div className="relative">
							<div className="flex items-start justify-between">
								<div>
									<p className="eyebrow">World map · chapter 01</p>
									<h2 className="display-title mt-2 text-3xl font-semibold text-[var(--indigo)]">The First Light</h2>
								</div>
								<Sparkles className="size-6 text-[var(--gold)]" />
							</div>
							<div className="my-8 grid grid-cols-[auto_1fr] gap-4">
								<div className="flex flex-col items-center pt-1">
									<span className="grid size-7 place-items-center rounded-full bg-[var(--gold)] text-xs font-black text-white">1</span>
									<span className="my-1 h-12 w-px bg-[var(--line-strong)]" />
									<span className="grid size-7 place-items-center rounded-full border border-[var(--amethyst)] bg-[var(--amethyst-wash)] text-xs font-black text-[var(--amethyst)]">
										2
									</span>
									<span className="my-1 h-12 w-px bg-[var(--line-strong)]" />
									<span className="grid size-7 place-items-center rounded-full border border-dashed border-[var(--line-strong)] text-xs font-black text-[var(--ink-faint)]">
										?
									</span>
								</div>
								<div className="space-y-7">
									<div>
										<p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--gold-deep)]">Current node</p>
										<p className="display-title mt-1 text-2xl text-[var(--indigo)]">Mossway Crossing</p>
										<p className="mt-1 text-sm text-[var(--ink-soft)]">A quiet gate waits for the party.</p>
									</div>
									<div>
										<p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--amethyst)]">Next decision</p>
										<p className="mt-1 text-sm font-bold text-[var(--ink)]">Follow the lanterns or climb the old road?</p>
									</div>
									<div className="flex items-center gap-2 text-xs font-bold text-[var(--teal-deep)]">
										<HeartPulse className="size-4" /> 3 travelers are ready
									</div>
								</div>
							</div>
							<div className="grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-4 text-center">
								<div>
									<Map className="mx-auto size-4 text-[var(--gold-deep)]" />
									<p className="mt-1 text-[0.68rem] font-bold text-[var(--ink-soft)]">Shared map</p>
								</div>
								<div>
									<UsersRound className="mx-auto size-4 text-[var(--amethyst)]" />
									<p className="mt-1 text-[0.68rem] font-bold text-[var(--ink-soft)]">Small parties</p>
								</div>
								<div>
									<HeartPulse className="mx-auto size-4 text-[var(--teal-deep)]" />
									<p className="mt-1 text-[0.68rem] font-bold text-[var(--ink-soft)]">Real progress</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="page-wrap grid gap-4 border-t border-[var(--line)] pt-8 sm:grid-cols-3">
				<Feature
					icon={<HeartPulse />}
					title="Health as a signal"
					copy="Steps move the party. Sleep steadies the people who make the journey."
				/>
				<Feature
					icon={<UsersRound />}
					title="A shared trail"
					copy="Invite the people you trust and let the next fork belong to everyone."
				/>
				<Feature
					icon={<Sparkles />}
					title="Small, meaningful choices"
					copy="Every day adds a little shape to a world that remembers where you went."
				/>
			</section>
		</main>
	);
}

function Feature({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
	return (
		<article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
			<div className="mb-4 grid size-10 place-items-center rounded-xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">{icon}</div>
			<h2 className="display-title text-xl font-semibold text-[var(--indigo)]">{title}</h2>
			<p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{copy}</p>
		</article>
	);
}
