import { describe, expect, it } from 'vitest';

import { formatDateTime, getBrowserTimezone, getTimezoneSuggestions } from '#/lib/dates';

describe('date formatting', () => {
	it('formats an instant in the requested timezone', () => {
		const value = '2026-01-01T00:30:00.000Z';
		const pacific = formatDateTime(value, 'America/Los_Angeles');
		const tokyo = formatDateTime(value, 'Asia/Tokyo');

		expect(pacific).not.toBe(tokyo);
		expect(pacific).toContain('Dec 31, 2025');
		expect(tokyo).toContain('Jan 1, 2026');
	});

	it('falls back to UTC for an invalid timezone', () => {
		expect(formatDateTime('2026-01-01T00:30:00.000Z', 'Mars/Olympus')).toBe(formatDateTime('2026-01-01T00:30:00.000Z', 'UTC'));
	});

	it('preserves empty and invalid date fallbacks', () => {
		expect(formatDateTime(null, 'UTC')).toBe('Not yet');
		expect(formatDateTime('not-a-date', 'UTC')).toBe('Unknown');
	});
});

describe('timezone helpers', () => {
	it('detects a valid browser timezone and builds unique suggestions', () => {
		const browserTimezone = getBrowserTimezone();
		const suggestions = getTimezoneSuggestions('America/Los_Angeles', browserTimezone);

		expect(browserTimezone).toBeTruthy();
		expect(suggestions).toEqual(expect.arrayContaining(['America/Los_Angeles', browserTimezone, 'UTC']));
		expect(new Set(suggestions).size).toBe(suggestions.length);
	});
});
