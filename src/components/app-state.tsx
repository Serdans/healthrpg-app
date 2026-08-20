import { AlertCircle, LoaderCircle } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { ApiError } from '#/lib/api';
import { useOnlineStatus } from '#/lib/online-status';

export function LoadingState({ label = 'Reading the trail…' }: { label?: string }) {
	return (
		<div role="status" aria-live="polite" className="flex items-center gap-3 py-12 text-sm font-bold text-[var(--ink-soft)]">
			<LoaderCircle className="size-5 animate-spin text-[var(--gold-deep)]" /> {label}
		</div>
	);
}

export function SuccessNotice({ children }: { children: ReactNode }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className="rounded-2xl border border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[color-mix(in_srgb,var(--teal)_10%,transparent)] p-4 text-sm font-bold text-[var(--teal-deep)]"
		>
			{children}
		</div>
	);
}

export function OfflineNotice() {
	const isOnline = useOnlineStatus();
	if (isOnline) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="border-b border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-4 py-2 text-center text-sm font-bold text-[var(--danger)]"
		>
			You are offline. New actions will not reach the trail until your connection returns.
		</div>
	);
}

export function NavigationStatus() {
	const isLoading = useRouterState({ select: (state) => state.isLoading });
	if (!isLoading) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className="fixed inset-x-0 top-0 z-[60] h-1 bg-[var(--gold)] shadow-[0_0_16px_rgba(209,155,60,0.8)]"
		>
			<span className="sr-only">Loading the next trail page…</span>
		</div>
	);
}

export function ErrorNotice({
	message = 'Something interrupted the expedition.',
	error,
	onRetry,
	retryLabel = 'Try again',
	retrying = false,
	action,
}: {
	message?: string;
	error?: unknown;
	onRetry?: () => void;
	retryLabel?: string;
	retrying?: boolean;
	action?: ReactNode;
}) {
	const recoveryAction =
		action ??
		(error instanceof ApiError && error.status === 401 ? (
			<Link
				to="/auth/google/start"
				reloadDocument
				preload={false}
				className="font-extrabold text-[var(--danger)] underline underline-offset-2"
			>
				Sign in again
			</Link>
		) : null);

	return (
		<div
			role="alert"
			className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4 text-sm text-[var(--danger)]"
		>
			<AlertCircle className="mt-0.5 size-5 shrink-0" />
			<div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
				<p>{message}</p>
				{(onRetry || recoveryAction) && (
					<div className="flex shrink-0 flex-wrap items-center gap-3">
						{recoveryAction}
						{onRetry && (
							<button
								type="button"
								className="rounded-lg border border-current px-3 py-1.5 text-xs font-extrabold hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)]"
								onClick={onRetry}
								disabled={retrying}
								aria-busy={retrying}
							>
								{retrying ? `${retryLabel}…` : retryLabel}
							</button>
						)}
					</div>
				)}
			</div>
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
