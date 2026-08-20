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
});
