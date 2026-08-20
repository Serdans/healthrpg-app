import { describe, expect, it } from 'vitest';

import {
	characterNameSchema,
	inviteTokenSchema,
	isIanaTimezone,
	partyNameSchema,
	purchaseQuantitySchema,
	timezoneSchema,
} from '#/lib/validation';

describe('form validation', () => {
	it('requires meaningful character and party names within backend limits', () => {
		expect(characterNameSchema.safeParse('   ').success).toBe(false);
		expect(characterNameSchema.safeParse('Mira of Mossway').success).toBe(true);
		expect(partyNameSchema.safeParse('   ').success).toBe(false);
		expect(partyNameSchema.safeParse('Sunday Wayfarers').success).toBe(true);
		expect(partyNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
	});

	it('validates invite tokens and purchase quantities', () => {
		expect(inviteTokenSchema.safeParse('invite-token').success).toBe(true);
		expect(inviteTokenSchema.safeParse('x'.repeat(257)).success).toBe(false);
		expect(purchaseQuantitySchema.safeParse('2')).toMatchObject({ success: true, data: 2 });
		expect(purchaseQuantitySchema.safeParse('1.5').success).toBe(false);
		expect(purchaseQuantitySchema.safeParse('100').success).toBe(false);
	});

	it('accepts valid IANA timezones and rejects invalid ones', () => {
		expect(isIanaTimezone('UTC')).toBe(true);
		expect(isIanaTimezone('America/Los_Angeles')).toBe(true);
		expect(isIanaTimezone('Mars/Olympus')).toBe(false);
		expect(timezoneSchema.safeParse('Europe/London').success).toBe(true);
		expect(timezoneSchema.safeParse('not-a-timezone').success).toBe(false);
	});
});
