import type { Party } from './api';

export function isPartyReadOnly(status: Party['status']) {
	return status !== 'active';
}
