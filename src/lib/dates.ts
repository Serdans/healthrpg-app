export function localDateForTimezone(timezone: string, date = new Date()) {
	try {
		const parts = new Intl.DateTimeFormat('en-CA', {
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

export function formatDateTime(value: string | null) {
	if (!value) return 'Not yet';
	const date = new Date(value);
	return Number.isNaN(date.valueOf()) ? 'Unknown' : date.toLocaleString();
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
