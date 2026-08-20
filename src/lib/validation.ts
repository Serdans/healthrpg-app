import { z } from 'zod';

export function isIanaTimezone(value: string) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
		return true;
	} catch {
		return false;
	}
}

export const characterNameSchema = z
	.string()
	.trim()
	.min(1, 'Enter a traveler name.')
	.max(64, 'Traveler names must be 64 characters or fewer.');

export const partyNameSchema = z.string().trim().min(1, 'Enter a party name.').max(80, 'Party names must be 80 characters or fewer.');

export const inviteTokenSchema = z
	.string()
	.trim()
	.min(1, 'Paste an invite token.')
	.max(256, 'Invite tokens must be 256 characters or fewer.');

export const timezoneSchema = z
	.string()
	.trim()
	.min(1, 'Enter a timezone.')
	.max(64, 'Timezones must be 64 characters or fewer.')
	.refine(isIanaTimezone, 'Use a valid IANA timezone such as Europe/London.');

export const purchaseQuantitySchema = z.coerce
	.number({ message: 'Enter a quantity.' })
	.int('Quantity must be a whole number.')
	.min(1, 'Quantity must be at least 1.')
	.max(99, 'Quantity cannot exceed 99.');

export const characterNameFormSchema = z.object({ name: characterNameSchema });
export const partyNameFormSchema = z.object({ name: partyNameSchema });
export const inviteTokenFormSchema = z.object({ inviteToken: inviteTokenSchema });
export const timezoneFormSchema = z.object({ timezone: timezoneSchema });
