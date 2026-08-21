import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Compass, LoaderCircle, UsersRound } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import type { DailyProgress } from '#/lib/api';
import type { DailyLoopState } from '#/lib/daily-loop';
import { focusGameplaySection, isModifiedNavigation } from '#/lib/gameplay-navigation';
import { GameplayMechanics } from './gameplay-mechanics';

export interface DailySignalStatus {
	isPending?: boolean;
	isError?: boolean;
	message?: string;
	retrying?: boolean;
	onRetry?: () => void;
}

interface DailyActionContextProps {
	daily?: DailyProgress;
	state: DailyLoopState;
	signal?: DailySignalStatus;
}

function readinessSummary(daily?: DailyProgress) {
	if (!daily) return { count: '—', detail: 'waiting for the party signal' };
	const travelersWithMomentum = daily.members.filter((member) => member.movementUnits > 0).length;
	const recoveryPoints = daily.members.reduce((total, member) => total + member.recoveryPoints, 0);
	return {
		count: `${travelersWithMomentum} / ${daily.members.length}`,
		detail: `travelers with Momentum · ${recoveryPoints} Recovery`,
	};
}

function SignalNotice({ daily, signal }: { daily?: DailyProgress; signal?: DailySignalStatus }) {
	if (daily) {
		if (signal?.isError) {
			return (
				<div className="daily-command-center-signal daily-command-center-signal-stale">
					<AlertCircle className="size-4" aria-hidden="true" />
					<span>{signal.message ?? 'Today’s signal may be out of date.'}</span>
					{signal.onRetry && (
						<button type="button" onClick={signal.onRetry} disabled={signal.retrying} aria-busy={signal.retrying}>
							{signal.retrying ? 'Refreshing…' : 'Refresh'}
						</button>
					)}
				</div>
			);
		}

		return <GameplayMechanics daily={daily} showHelp={false} />;
	}

	if (signal?.isPending) {
		return (
			<div className="daily-command-center-signal">
				<LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
				<span>Reading today’s health signal…</span>
			</div>
		);
	}

	if (signal?.isError) {
		return (
			<div className="daily-command-center-signal daily-command-center-signal-error" role="alert">
				<AlertCircle className="size-4" aria-hidden="true" />
				<span>{signal.message ?? 'Today’s health signal could not be read.'}</span>
				{signal.onRetry && (
					<button type="button" onClick={signal.onRetry} disabled={signal.retrying} aria-busy={signal.retrying}>
						{signal.retrying ? 'Retrying…' : 'Retry'}
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="daily-command-center-signal">
			<Compass className="size-4" aria-hidden="true" />
			<span>Momentum and Journey details will appear when today’s signal is available.</span>
		</div>
	);
}

export function DailyCommandCenter({ daily, state, signal }: DailyActionContextProps) {
	const readiness = readinessSummary(daily);
	const signalAnnouncement = signal?.isPending
		? 'Reading today’s health signal.'
		: signal?.isError && daily
			? (signal.message ?? 'Today’s health signal may be out of date.')
			: daily
				? 'Today’s health signal is available.'
				: 'Today’s health signal is unavailable.';

	return (
		<section
			className={`daily-command-center daily-command-center-${state.tone}`}
			aria-labelledby="daily-command-center-title"
			data-testid="daily-command-center"
		>
			<div className="daily-command-center-header">
				<div>
					<div className="flex flex-wrap items-center gap-2">
						<p className="eyebrow game-pixel-label">Today · {daily?.worldDate ?? 'daily signal'}</p>
						<Badge className="daily-command-center-badge">{state.badge}</Badge>
					</div>
					<h2 id="daily-command-center-title">{state.title}</h2>
					<p>{state.description}</p>
				</div>
				<span className="daily-command-center-emblem" aria-hidden="true">
					<Compass className="size-6" />
				</span>
			</div>

			<p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
				{state.badge}. {state.title} {state.description} {signalAnnouncement}
			</p>

			<SignalNotice daily={daily} signal={signal} />

			<div className="daily-command-center-footer">
				<div className="daily-command-center-readiness">
					<div>
						<UsersRound className="size-4" aria-hidden="true" />
						<span className="game-pixel-label">Party readiness</span>
					</div>
					<strong>{readiness.count}</strong>
					<span>{readiness.detail}</span>
				</div>

				{state.actionHref && state.actionLabel && (
					<div className="daily-command-center-actions">
						<a
							className="daily-command-center-action game-button"
							href={state.actionHref}
							onClick={(event) => {
								if (!isModifiedNavigation(event)) focusGameplaySection(state.actionHref!.slice(1));
							}}
						>
							{state.actionLabel}
							<ArrowRight className="size-4" aria-hidden="true" />
						</a>
						{state.actionHref !== '#party-field' && (
							<a
								className="daily-command-center-secondary"
								href="#party-field"
								onClick={(event) => {
									if (!isModifiedNavigation(event)) focusGameplaySection('party-field');
								}}
							>
								View field
							</a>
						)}
					</div>
				)}
			</div>
		</section>
	);
}

export function DailyActionStrip({ daily, state, signal }: DailyActionContextProps) {
	const [visible, setVisible] = useState(false);
	const readiness = readinessSummary(daily);

	useEffect(() => {
		const commandCenter = document.querySelector<HTMLElement>('[data-testid="daily-command-center"]');
		if (!commandCenter || typeof IntersectionObserver === 'undefined') {
			setVisible(true);
			return;
		}

		const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.15 });
		observer.observe(commandCenter);
		return () => observer.disconnect();
	}, []);

	return (
		<aside
			className="daily-action-strip"
			data-visible={visible}
			aria-hidden={!visible}
			aria-label="Current daily action"
			data-testid="daily-action-strip"
		>
			<div className="daily-action-strip-copy">
				<Badge className={`daily-command-center-badge daily-command-center-badge-${state.tone}`}>{state.badge}</Badge>
				<strong>{state.title}</strong>
				<span>{readiness.count} travelers with Momentum</span>
			</div>
			<div className="daily-action-strip-actions">
				{state.actionHref && state.actionLabel && (
					<a
						className="daily-action-strip-link game-button"
						href={state.actionHref}
						onClick={(event) => {
							if (!isModifiedNavigation(event)) focusGameplaySection(state.actionHref!.slice(1));
						}}
					>
						{state.actionLabel}
						<ArrowRight className="size-4" aria-hidden="true" />
					</a>
				)}
				{signal?.isError && signal.onRetry && (
					<button type="button" className="daily-action-strip-retry" onClick={signal.onRetry} disabled={signal.retrying}>
						{signal.retrying ? 'Refreshing…' : 'Refresh signal'}
					</button>
				)}
			</div>
		</aside>
	);
}
