import { AlertCircle, LoaderCircle } from 'lucide-react';

export function LoadingState({ label = 'Reading the trail…' }: { label?: string }) {
	return (
		<div className="flex items-center gap-3 py-12 text-sm font-bold text-[var(--ink-soft)]">
			<LoaderCircle className="size-5 animate-spin text-[var(--gold-deep)]" /> {label}
		</div>
	);
}

export function ErrorNotice({ message = 'Something interrupted the expedition.' }: { message?: string }) {
	return (
		<div className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 text-sm text-[var(--danger)]">
			<AlertCircle className="mt-0.5 size-5 shrink-0" />
			<p>{message}</p>
		</div>
	);
}

export function EmptyState({ title, copy }: { title: string; copy: string }) {
	return (
		<div className="rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-8 text-center">
			<h3 className="display-title text-2xl text-[var(--indigo)]">{title}</h3>
			<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink-soft)]">{copy}</p>
		</div>
	);
}
