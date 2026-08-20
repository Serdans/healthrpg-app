import { describe, expect, it } from 'vitest';

import { isPartyReadOnly } from '#/lib/party-state';

describe('party state', () => {
	it('allows mutations only for active parties', () => {
		expect(isPartyReadOnly('active')).toBe(false);
		expect(isPartyReadOnly('abandoned')).toBe(true);
	});
});
