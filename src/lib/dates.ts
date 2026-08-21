export function isIanaTimezone(value: string) {
	try {
		Intl.DateTimeFormat('en-US', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}

export function localDateForTimezone(timezone: string, date = new Date()) {
	try {
		const parts = Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(date);
		const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		return `${values.year}-${values.month}-${values.day}`;
	} catch {
		return date.toISOString().slice(0, 10);
	}
}

export function formatDateTime(value: string | null, timezone = 'UTC') {
	if (!value) return 'Not yet';
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return 'Unknown';

	const effectiveTimezone = isIanaTimezone(timezone) ? timezone : 'UTC';
	return date.toLocaleString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZone: effectiveTimezone,
		timeZoneName: 'short',
	});
}

let cachedBrowserTimezone: string | null = null;

export function getBrowserTimezone() {
	if (cachedBrowserTimezone) return cachedBrowserTimezone;

	try {
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		cachedBrowserTimezone = timezone && isIanaTimezone(timezone) ? timezone : 'UTC';
	} catch {
		cachedBrowserTimezone = 'UTC';
	}
	return cachedBrowserTimezone;
}

export function getTimezoneSuggestions(currentTimezone?: string, browserTimezone?: string) {
	const supportedTimezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
	const requestedTimezones = [currentTimezone, browserTimezone, 'UTC'].filter((value): value is string => {
		if (!value) return false;
		return isIanaTimezone(value);
	});
	return [...new Set([...requestedTimezones, ...supportedTimezones])].sort((left, right) => left.localeCompare(right));
}

export function formatTimeRemaining(value: string | null, now = new Date()) {
	if (!value) return 'No deadline';
	const deadline = new Date(value);
	if (Number.isNaN(deadline.valueOf())) return 'Unknown deadline';

	const difference = deadline.valueOf() - now.valueOf();
	if (difference <= 0) return 'Closed';

	const totalMinutes = Math.ceil(difference / 60_000);
	const days = Math.floor(totalMinutes / 1_440);
	const hours = Math.floor((totalMinutes % 1_440) / 60);
	const minutes = totalMinutes % 60;
	if (days > 0) return `${days}d ${hours}h left`;
	if (hours > 0) return `${hours}h ${minutes}m left`;
	return `${minutes}m left`;
}
