import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyBackendResponse, passesSameOriginCheck, requestBackend } from '#/server/backend';
import { clearSessionCookie, readSessionToken, sessionCookie } from '#/server/cookies';

describe('BFF security boundary', () => {
	beforeEach(() => {
		vi.stubEnv('API_BASE_URL', 'http://backend.test');
		vi.stubEnv('APP_ORIGIN', 'http://localhost:3001');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		vi.restoreAllMocks();
	});

	it('stores a local session in an HttpOnly same-site cookie', () => {
		const request = new Request('http://localhost:3001/auth/google/callback');
		const cookie = sessionCookie(request, 'token.with spaces');

		expect(cookie).toContain('healthrpg_session=token.with%20spaces');
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=Lax');
		expect(cookie).not.toContain('Secure');
		expect(clearSessionCookie(request)).toContain('Max-Age=0');
	});

	it('reads the session token without exposing other cookies', () => {
		const request = new Request('http://localhost:3001/api/session', {
			headers: {
				Cookie: 'theme=parchment; healthrpg_session=token%2Eabc; other=value',
			},
		});

		expect(readSessionToken(request)).toBe('token.abc');
	});

	it('requires the configured origin for unsafe methods', () => {
		expect(
			passesSameOriginCheck(
				new Request('http://localhost:3001/api/v1/parties', {
					method: 'POST',
					headers: { Origin: 'http://localhost:3001' },
				}),
			),
		).toBe(true);
		expect(
			passesSameOriginCheck(
				new Request('http://localhost:3001/api/v1/parties', {
					method: 'POST',
					headers: { Origin: 'https://attacker.example' },
				}),
			),
		).toBe(false);
		expect(passesSameOriginCheck(new Request('http://localhost:3001/api/v1/me'))).toBe(true);
	});

	it('forwards the bearer token only to the backend origin', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe('http://backend.test/v1/me');
			expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token.abc');
			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const response = await requestBackend(
			new Request('http://localhost:3001/api/v1/me', {
				headers: { Cookie: 'healthrpg_session=token.abc' },
			}),
			'/v1/me',
		);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('buffers mutation bodies before forwarding them', async () => {
		const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			expect(String(input)).toBe('http://backend.test/v1/parties');
			expect(init?.method).toBe('POST');
			expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
			expect(await new Response(init?.body).json()).toEqual({ name: 'Lantern Walkers' });
			return new Response(JSON.stringify({ id: 'party-1' }), {
				status: 201,
				headers: { 'Content-Type': 'application/json' },
			});
		});
		vi.stubGlobal('fetch', fetchMock);

		const response = await requestBackend(
			new Request('http://localhost:3001/api/v1/parties', {
				method: 'POST',
				headers: {
					Cookie: 'healthrpg_session=token.abc',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ name: 'Lantern Walkers' }),
			}),
			'/v1/parties',
		);

		expect(response.status).toBe(201);
	});

	it('clears the session when the backend returns 401', () => {
		const response = copyBackendResponse(
			new Request('http://localhost:3001/api/v1/me'),
			new Response(JSON.stringify({ error: 'expired' }), {
				status: 401,
				headers: { 'Set-Cookie': 'backend_cookie=ignored' },
			}),
		);

		expect(response.status).toBe(401);
		expect(response.headers.get('set-cookie')).toContain('healthrpg_session=');
		expect(response.headers.get('set-cookie')).not.toContain('backend_cookie');
	});
});
