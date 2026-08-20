import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
	vi.resetModules();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('API client', () => {
	it('uses the same-origin BFF and parses the generated user contract', async () => {
		vi.stubGlobal('location', { origin: 'http://localhost:3001' });
		const user = {
			id: 'user-1',
			googleSubject: 'google-1',
			email: 'hero@example.com',
			displayName: 'Hero',
			timezone: 'UTC',
		};
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input);
			expect(request.url).toBe('http://localhost:3001/api/v1/me');
			expect(request.headers.get('accept')).toBe('application/json');
			return new Response(JSON.stringify(user), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const { getMe } = await import('#/lib/api');

		await expect(getMe()).resolves.toEqual(user);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('maps backend errors and does not retry unsafe writes', async () => {
		vi.stubGlobal('location', { origin: 'http://localhost:3001' });
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input);
			expect(request.method).toBe('POST');
			return new Response(JSON.stringify({ error: 'Party name is already taken.' }), {
				status: 503,
				headers: { 'Content-Type': 'application/json' },
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const { ApiError, createParty } = await import('#/lib/api');
		const result = createParty('The Lanterns');

		await expect(result).rejects.toBeInstanceOf(ApiError);
		await expect(result).rejects.toMatchObject({
			message: 'Party name is already taken.',
			status: 503,
		});
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('covers gameplay reads, action bodies, and empty 204 responses', async () => {
		vi.stubGlobal('location', { origin: 'http://localhost:3001' });
		const calls: { url: string; method: string; body: string }[] = [];
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input);
			calls.push({ url: request.url, method: request.method, body: await request.clone().text() });

			if (request.url.endsWith('/v1/progress/2026-08-20')) {
				return new Response(
					JSON.stringify({
						localDate: '2026-08-20',
						steps: 8400,
						sleepMinutes: 450,
						movementUnits: 8,
						recoveryPoints: 4,
						status: 'complete',
					}),
					{
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					},
				);
			}
			if (request.url.endsWith('/v1/health/status')) {
				return new Response(JSON.stringify({ status: null, lastSyncAt: null, healthUserId: null }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (request.url.endsWith('/v1/parties/party-1/encounter/action')) {
				return new Response(JSON.stringify({ partyId: 'party-1', nodeId: 'node-1', worldDate: '2026-08-20', status: 'active' }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const { getHealthStatus, getProgress, setEncounterAction, unequipLoadout } = await import('#/lib/api');

		await expect(getProgress('2026-08-20')).resolves.toMatchObject({ movementUnits: 8 });
		await expect(getHealthStatus()).resolves.toMatchObject({ status: null });
		await expect(setEncounterAction('party-1', { actionKey: null, targetEnemyId: 'enemy-1', targetUserId: null })).resolves.toMatchObject({
			status: 'active',
		});
		await expect(unequipLoadout('weapon')).resolves.toBeUndefined();

		expect(calls[2]).toMatchObject({
			url: 'http://localhost:3001/api/v1/parties/party-1/encounter/action',
			method: 'PUT',
		});
		expect(JSON.parse(calls[2].body)).toEqual({ actionKey: null, targetEnemyId: 'enemy-1', targetUserId: null });
		expect(calls[3]).toMatchObject({ url: 'http://localhost:3001/api/v1/me/loadout/weapon', method: 'DELETE' });
	});

	it('encodes progression cursors and party management paths', async () => {
		vi.stubGlobal('location', { origin: 'http://localhost:3001' });
		const urls: string[] = [];
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input);
			urls.push(request.url);
			if (request.url.includes('/progression?')) {
				return new Response(JSON.stringify({ items: [], nextCursor: null }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const { getPartyProgression, leaveParty, revokeInvite } = await import('#/lib/api');

		await expect(getPartyProgression('party/1', { limit: 20, cursor: 'next page' })).resolves.toEqual({ items: [], nextCursor: null });
		await leaveParty('party/1');
		await revokeInvite('party/1', 'invite/1');

		expect(urls[0]).toBe('http://localhost:3001/api/v1/parties/party%2F1/progression?limit=20&cursor=next+page');
		expect(urls[1]).toBe('http://localhost:3001/api/v1/parties/party%2F1/membership');
		expect(urls[2]).toBe('http://localhost:3001/api/v1/parties/party%2F1/invites/invite%2F1');
	});

	it('resets character creation with the generated delete contract', async () => {
		vi.stubGlobal('location', { origin: 'http://localhost:3001' });
		const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
			const request = input instanceof Request ? input : new Request(input);
			expect(request.url).toBe('http://localhost:3001/api/v1/me/character/creation');
			expect(request.method).toBe('DELETE');
			return new Response(null, { status: 204 });
		});
		vi.stubGlobal('fetch', fetchMock);

		const { resetCharacterCreation } = await import('#/lib/api');

		await expect(resetCharacterCreation()).resolves.toBeUndefined();
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
