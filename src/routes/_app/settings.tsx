import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Check, Cloud, RefreshCw, Settings2 } from 'lucide-react';

import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card';
import { FieldError } from '#/components/ui/field-error';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { formatDateTime, getBrowserTimezone, getTimezoneSuggestions } from '#/lib/dates';
import { useHealthStatus, useMe, useSyncHealth, useUpdatePreferences } from '#/lib/queries';
import { timezoneFormSchema, timezoneSchema } from '#/lib/validation';

export const Route = createFileRoute('/_app/settings')({
	head: () => ({ meta: [{ title: 'Settings · HealthRPG' }] }),
	component: SettingsPage,
});

const subscribeToBrowserTimezone = () => () => {};
const getServerTimezone = () => 'UTC';

function SettingsPage() {
	const meQuery = useMe();
	const [syncPolling, setSyncPolling] = useState(false);
	const syncStartedAtRef = useRef<number | null>(null);
	const healthQuery = useHealthStatus(syncPolling ? 5_000 : false);
	const syncMutation = useSyncHealth();
	const preferencesMutation = useUpdatePreferences();
	const [saved, setSaved] = useState(false);
	const browserTimezone = useSyncExternalStore(subscribeToBrowserTimezone, getBrowserTimezone, getServerTimezone);
	const timezoneSuggestions = useMemo(
		() => getTimezoneSuggestions(meQuery.data?.timezone, browserTimezone),
		[meQuery.data?.timezone, browserTimezone],
	);
	const preferencesForm = useForm({
		defaultValues: { timezone: 'UTC' },
		validators: { onSubmit: timezoneFormSchema },
		onSubmit: async ({ value }) => {
			setSaved(false);
			await preferencesMutation.mutateAsync(value.timezone.trim());
			setSaved(true);
		},
	});

	useEffect(() => {
		if (meQuery.data && !preferencesForm.state.isDirty) {
			preferencesForm.reset({ timezone: meQuery.data.timezone });
		}
	}, [meQuery.data, preferencesForm]);

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
		return (
			<ErrorNotice
				error={meQuery.error}
				message={meQuery.error.message}
				onRetry={() => void meQuery.refetch()}
				retrying={meQuery.isFetching}
				retryLabel="Retry profile"
			/>
		);
	if (healthQuery.isError)
		return (
			<ErrorNotice
				error={healthQuery.error}
				message={healthQuery.error.message}
				onRetry={() => void healthQuery.refetch()}
				retrying={healthQuery.isFetching}
				retryLabel="Retry health status"
			/>
		);

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

	return (
		<div className="space-y-8">
			<div>
				<p className="eyebrow">Expedition settings</p>
				<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">Keep the compass honest.</h1>
				<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">
					Your timezone shapes the health window, while Google Health supplies the movement and rest signals that move the party.
				</p>
			</div>

			{syncError && <ErrorNotice error={syncError} message={syncError.message} />}

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
								<p>{formatDateTime(health.lastSyncAt, meQuery.data.timezone)}</p>
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
						<form
							className="space-y-4"
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void preferencesForm.handleSubmit();
							}}
						>
							<preferencesForm.Field name="timezone" validators={{ onBlur: timezoneSchema }}>
								{(field) => {
									const errorId = 'timezone-error';
									const hasError = field.state.meta.errors.length > 0;
									return (
										<div>
											<Label htmlFor="timezone">Timezone</Label>
											<Input
												id="timezone"
												list="timezone-suggestions"
												value={field.state.value}
												maxLength={64}
												aria-invalid={hasError}
												aria-describedby={hasError ? `${errorId} timezone-help` : 'timezone-help'}
												onBlur={field.handleBlur}
												onChange={(event) => {
													setSaved(false);
													preferencesMutation.reset();
													field.handleChange(event.target.value);
												}}
											/>
											<datalist id="timezone-suggestions">
												{timezoneSuggestions.map((timezone) => (
													<option key={timezone} value={timezone} />
												))}
											</datalist>
											<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
												<p id="timezone-help" className="text-xs leading-5 text-[var(--ink-faint)]">
													{browserTimezone ? `Detected browser timezone: ${browserTimezone}.` : 'Detecting browser timezone…'}
												</p>
												<Button
													type="button"
													variant="ghost"
													size="sm"
													disabled={!browserTimezone}
													onClick={() => {
														if (!browserTimezone) return;
														setSaved(false);
														preferencesMutation.reset();
														preferencesForm.setFieldValue('timezone', browserTimezone);
													}}
												>
													Use detected timezone
												</Button>
											</div>
											<FieldError id={errorId} errors={field.state.meta.errors} />
										</div>
									);
								}}
							</preferencesForm.Field>
							<preferencesForm.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
									timezone: state.values.timezone,
								})}
							>
								{({ canSubmit, isSubmitting, timezone }) => (
									<Button
										type="submit"
										disabled={!timezone.trim() || !canSubmit || isSubmitting || preferencesMutation.isPending}
										aria-busy={isSubmitting || preferencesMutation.isPending}
									>
										{saved ? <Check className="size-4" /> : <Settings2 className="size-4" />}
										{isSubmitting || preferencesMutation.isPending ? 'Saving…' : saved ? 'Saved' : 'Save timezone'}
									</Button>
								)}
							</preferencesForm.Subscribe>
						</form>
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
