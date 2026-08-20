import { getRequest } from '@tanstack/react-start/server';

import type { paths } from '#/api/generated';

import { readSessionToken } from './cookies';

export type SessionUser = paths['/v1/me']['get']['responses'][200]['content']['application/json'];

export type SessionState = {
	user: SessionUser | null;
};

function backendMeUrl() {
	const apiBaseUrl = process.env.API_BASE_URL?.trim();
	if (!apiBaseUrl) throw new Error('Missing API_BASE_URL');
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	return new URL('v1/me', baseUrl);
}

function isSessionUser(value: unknown): value is SessionUser {
	if (typeof value !== 'object' || value === null) return false;
	const id = Reflect.get(value, 'id');
	const googleSubject = Reflect.get(value, 'googleSubject');
	const email = Reflect.get(value, 'email');
	const displayName = Reflect.get(value, 'displayName');
	const timezone = Reflect.get(value, 'timezone');
	return (
		typeof id === 'string' &&
		typeof googleSubject === 'string' &&
		typeof email === 'string' &&
		(displayName === null || typeof displayName === 'string') &&
		typeof timezone === 'string'
	);
}

export async function loadSession(): Promise<SessionState> {
	const request = getRequest();
	const token = readSessionToken(request);
	if (!token) return { user: null };

	try {
		const upstream = await fetch(backendMeUrl(), {
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
		});

		if (!upstream.ok) {
			return { user: null };
		}

		const user: unknown = await upstream.json();
		return isSessionUser(user) ? { user } : { user: null };
	} catch {
		return { user: null };
	}
}
