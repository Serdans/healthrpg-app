import { Link } from '@tanstack/react-router';

import { ErrorNotice } from '#/components/app-state';
import { Button } from '#/components/ui/button';

export function RootError({ error, reset }: { error: Error; reset: () => void }) {
	return (
		<main className="page-wrap py-20">
			<div className="mx-auto max-w-xl space-y-5">
				<p className="eyebrow">Trail interruption</p>
				<h1 className="display-title text-4xl text-[var(--indigo)]">The trail needs a moment.</h1>
				<ErrorNotice message={error.message || 'Something unexpected interrupted this page.'} />
				<div className="flex flex-wrap gap-3">
					<Button onClick={reset}>Try again</Button>
					<Link
						to="/"
						className="inline-flex min-h-11 items-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--indigo)] no-underline hover:border-[var(--gold)]"
					>
						Return home
					</Link>
				</div>
			</div>
		</main>
	);
}

export function RootNotFound() {
	return (
		<main className="page-wrap py-20">
			<div className="mx-auto max-w-xl space-y-5">
				<p className="eyebrow">Beyond the map</p>
				<h1 className="display-title text-4xl text-[var(--indigo)]">That trailhead is not on this map.</h1>
				<p className="text-base leading-7 text-[var(--ink-soft)]">The page may have moved, or the path may have been mistyped.</p>
				<Link
					to="/"
					className="inline-flex min-h-11 items-center rounded-xl bg-[var(--indigo)] px-4 text-sm font-bold text-[var(--parchment-bright)] no-underline hover:bg-[var(--indigo-light)]"
				>
					Return home
				</Link>
			</div>
		</main>
	);
}
