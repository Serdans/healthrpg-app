import { describe, expect, it } from 'vitest';

import { combatCommandState } from '#/lib/combat-command-state';

const base = {
	readOnly: false,
	encounterCompleted: false,
	actionPending: false,
	actionSuccess: false,
	commandDirty: false,
};

describe('combatCommandState', () => {
	it('keeps terminal states ahead of local edits', () => {
		expect(combatCommandState({ ...base, readOnly: true, commandDirty: true })).toBe('readonly');
		expect(combatCommandState({ ...base, encounterCompleted: true, commandDirty: true })).toBe('resolved');
	});

	it('distinguishes saving, edited, saved, and active commands', () => {
		expect(combatCommandState({ ...base, actionPending: true, actionSuccess: true })).toBe('saving');
		expect(combatCommandState({ ...base, actionSuccess: true, commandDirty: true })).toBe('edited');
		expect(combatCommandState({ ...base, actionSuccess: true })).toBe('saved');
		expect(combatCommandState(base)).toBe('active');
	});
});
