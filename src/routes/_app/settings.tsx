import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Check, Cloud, RefreshCw, Settings2 } from 'lucide-react';
import type { FormEvent } from 'react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { formatDateTime } from '#/lib/dates';
import { useHealthStatus, useMe, useSyncHealth, useUpdatePreferences } from '#/lib/queries';

export const Route = createFileRoute('/_app/settings')({ component: SettingsPage });

function SettingsPage() {
	const meQuery = useMe();
	const [syncPolling, setSyncPolling] = useState(false);
	const syncStartedAtRef = useRef<number | null>(null);
	const healthQuery = useHealthStatus(syncPolling ? 5_000 : false);
	const syncMutation = useSyncHealth();
	const preferencesMutation = useUpdatePreferences();
	const [timezone, setTimezone] = useState('UTC');
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		if (meQuery.data) setTimezone(meQuery.data.timezone);
	}, [meQuery.data]);

	useEffect(() => {
		if (!syncPolling) return;
		const timeout = window.setTimeout(() => {
			setSyncPolling(false);
			syncStartedAtRef.current = null;
		}, 60_000);
		return () => window.clearTimeout(timeout);
	}, [syncPolling]);

	useEffect(() => {
		const syncStartedAt = syncStartedAtRef.current;
		if (!syncPolling || !syncStartedAt || !healthQuery.data?.lastSyncAt) return;
		const lastSyncAt = new Date(healthQuery.data.lastSyncAt).valueOf();
		if (!Number.isNaN(lastSyncAt) && lastSyncAt >= syncStartedAt) {
			setSyncPolling(false);
			syncStartedAtRef.current = null;
		}
	}, [healthQuery.data?.lastSyncAt, syncPolling]);

	if (meQuery.isPending || healthQuery.isPending) return <LoadingState label="Checking your expedition settings…" />;
	if (meQuery.isError)
		return <ErrorNotice message={meQuery.error.message} onRetry={() => void meQuery.refetch()} retryLabel="Retry profile" />;
	if (healthQuery.isError)
		return <ErrorNotice message={healthQuery.error.message} onRetry={() => void healthQuery.refetch()} retryLabel="Retry health status" />;

	const health = healthQuery.data;
	const isConnected = health.status === 'active';
	const syncError = syncMutation.error ?? preferencesMutation.error;
	const syncNow = () => {
		syncStartedAtRef.current = Date.now();
		setSyncPolling(true);
		syncMutation.mutate(
			{},
			{
				onError: () => {
					setSyncPolling(false);
					syncStartedAtRef.current = null;
				},
			},
		);
	};

	const savePreferences = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setSaved(false);
		preferencesMutation.mutate(timezone.trim(), { onSuccess: () => setSaved(true) });
	};

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Expedition settings</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">Keep the compass honest.</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					Your timezone shapes the health window, while Google Health supplies the movement and rest signals that move the party.
				</p>
			</div>

			{syncError && <ErrorNotice message={syncError.message} />}

			<section className="grid gap-5 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<div>
								<Badge
									className={
										isConnected ? 'border-[color-mix(in_srgb,var(--teal)_30%,transparent)] bg-[var(--teal)]/10 text-[var(--teal-deep)]' : ''
									}
								>
									{isConnected ? 'Connected' : health.status === 'revoked' ? 'Reconnect needed' : 'Not connected'}
								</Badge>
								<CardTitle className="mt-4">Google Health connection</CardTitle>
							</div>
							<span className="grid size-12 place-items-center rounded-2xl bg-[var(--teal)]/10 text-[var(--teal-deep)]">
								<Cloud className="size-6" />
							</span>
						</div>
						<CardDescription>Steps and sleep are translated into movement and recovery for your parties.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm text-[var(--ink-soft)]">
							<p className="font-bold text-[var(--indigo)]">Last sync</p>
							<div className="mt-1 flex flex-wrap items-center justify-between gap-2">
								<p>{formatDateTime(health.lastSyncAt)}</p>
								<button
									type="button"
									className="text-xs font-extrabold text-[var(--gold-deep)] underline"
									onClick={() => void healthQuery.refetch()}
								>
									Refresh status
								</button>
							</div>
						</div>
						{syncMutation.data && (
							<div role="status" className="rounded-2xl bg-[var(--teal)]/10 p-4 text-sm text-[var(--teal-deep)]">
								<p className="font-bold">{syncMutation.data.queued ? 'Health sync queued.' : 'Health sync completed.'}</p>
								<p className="mt-1">
									Refreshing {syncMutation.data.from} through {syncMutation.data.to}.
								</p>
								{syncPolling && <p className="mt-1 text-xs font-bold">Waiting for the new health window to finish processing…</p>}
							</div>
						)}
						<div className="flex flex-wrap gap-2">
							{isConnected && (
								<Button disabled={syncMutation.isPending || syncPolling} onClick={syncNow}>
									<RefreshCw className={syncMutation.isPending ? 'size-4 animate-spin' : 'size-4'} />
									{syncMutation.isPending ? 'Syncing…' : syncPolling ? 'Processing…' : 'Sync now'}
								</Button>
							)}
							<Link
								to="/auth/google/start"
								reloadDocument
								preload={false}
								className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-4 text-sm font-bold text-[var(--indigo)] no-underline hover:border-[var(--gold)]"
							>
								<Cloud className="size-4" /> {isConnected ? 'Reconnect Google Health' : 'Connect Google Health'}
							</Link>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<div className="flex items-start justify-between gap-4">
							<div>
								<Badge>Daily rhythm</Badge>
								<CardTitle className="mt-4">Where does your day begin?</CardTitle>
							</div>
							<span className="grid size-12 place-items-center rounded-2xl bg-[var(--gold-wash)] text-[var(--gold-deep)]">
								<Settings2 className="size-6" />
							</span>
						</div>
						<CardDescription>Use an IANA timezone such as America/Los_Angeles or Europe/London.</CardDescription>
					</CardHeader>
					<CardContent>
						<form className="space-y-4" onSubmit={savePreferences}>
							<div>
								<Label htmlFor="timezone">Timezone</Label>
								<Input id="timezone" value={timezone} maxLength={64} onChange={(event) => setTimezone(event.target.value)} />
							</div>
							<Button type="submit" disabled={!timezone.trim() || preferencesMutation.isPending}>
								{saved ? <Check className="size-4" /> : <Settings2 className="size-4" />}
								{preferencesMutation.isPending ? 'Saving…' : saved ? 'Saved' : 'Save timezone'}
							</Button>
						</form>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
