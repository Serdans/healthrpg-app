import { createFileRoute } from '@tanstack/react-router';

import { appendSetCookie, clearSessionCookie, readSessionToken } from '#/server/cookies';

function backendMeUrl() {
	const apiBaseUrl = process.env.API_BASE_URL?.trim();
	if (!apiBaseUrl) throw new Error('Missing API_BASE_URL');
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	return new URL('v1/me', baseUrl);
}

export const Route = createFileRoute('/api/session')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const token = readSessionToken(request);
				if (!token) return Response.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });

				try {
					const upstream = await fetch(backendMeUrl(), {
						headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
					});
					if (upstream.ok) {
						const user = await upstream.json();
						return Response.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
					}

					const headers = new Headers({ 'Cache-Control': 'no-store' });
					if (upstream.status === 401) appendSetCookie(headers, clearSessionCookie(request));
					return new Response(JSON.stringify({ user: null }), { status: 200, headers });
				} catch {
					return Response.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });
				}
			},
		},
	},
});
