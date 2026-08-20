import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';
import { Backpack, Compass, LogOut, Settings2, Sparkles, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { getSession } from '#/lib/session';

export const Route = createFileRoute('/_app')({
	beforeLoad: async () => {
		const session = await getSession();
		if (!session.user) throw redirect({ to: '/' });
		return { user: session.user };
	},
	component: AppLayout,
});

const mobileLinks = [
	{ to: '/app', label: 'Trail' },
	{ to: '/character', label: 'Character' },
	{ to: '/parties', label: 'Parties' },
	{ to: '/inventory', label: 'Kit' },
	{ to: '/progression', label: 'Progress' },
	{ to: '/settings', label: 'Settings' },
] as const;

function initials(name: string | null, email: string) {
	if (name) {
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0])
			.join('')
			.toUpperCase();
	}
	return email.slice(0, 2).toUpperCase();
}

function AppLayout() {
	const { user } = Route.useRouteContext();

	return (
		<div className="route-shell">
			<header className="border-b border-[var(--line)] bg-[rgba(255,250,240,0.68)] backdrop-blur-md">
				<div className="page-wrap flex min-h-18 items-center justify-between gap-5 py-3">
					<Link to="/app" className="flex items-center gap-3 no-underline">
						<span className="sigil" aria-hidden="true">
							✦
						</span>
						<span>
							<span className="display-title block text-xl font-semibold text-[var(--indigo)]">HealthRPG</span>
							<span className="eyebrow block text-[0.58rem]">A living party trail</span>
						</span>
					</Link>

					<nav className="hidden items-center gap-1 sm:flex" aria-label="Primary navigation">
						<Link
							to="/app"
							activeOptions={{ exact: true }}
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							<Compass className="mr-1.5 inline-block size-4" /> Trail
						</Link>
						<Link
							to="/character"
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							Character
						</Link>
						<Link
							to="/parties"
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							<UsersRound className="mr-1.5 inline-block size-4" /> Parties
						</Link>
						<Link
							to="/inventory"
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							<Backpack className="mr-1.5 inline-block size-4" /> Kit
						</Link>
						<Link
							to="/progression"
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							<Sparkles className="mr-1.5 inline-block size-4" /> Progress
						</Link>
						<Link
							to="/settings"
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="rounded-lg px-3 py-2 text-sm font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							<Settings2 className="mr-1.5 inline-block size-4" /> Settings
						</Link>
					</nav>

					<div className="flex items-center gap-3">
						<div className="hidden text-right sm:block">
							<p className="text-sm font-extrabold text-[var(--indigo)]">{user.displayName ?? user.email}</p>
							<Badge>Connected</Badge>
						</div>
						<span className="grid size-10 place-items-center rounded-full bg-[var(--amethyst)] text-sm font-extrabold text-white">
							{initials(user.displayName, user.email)}
						</span>
						<Link
							to="/auth/logout"
							reloadDocument
							preload={false}
							className="rounded-lg p-2 text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--danger)]"
							aria-label="Log out"
							title="Log out"
						>
							<LogOut className="size-4" />
						</Link>
					</div>
				</div>
				<nav className="page-wrap flex gap-1 overflow-x-auto border-t border-[var(--line)] py-2 sm:hidden" aria-label="Mobile navigation">
					{mobileLinks.map(({ to, label }) => (
						<Link
							key={to}
							to={to}
							activeProps={{ className: 'bg-[var(--indigo)] text-[var(--parchment-bright)]' }}
							className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-[var(--ink-soft)] no-underline hover:bg-[var(--surface)] hover:text-[var(--indigo)]"
						>
							{label}
						</Link>
					))}
				</nav>
			</header>
			<main className="page-wrap pt-8 sm:pt-12">
				<Outlet />
			</main>
		</div>
	);
}
