import { createFileRoute } from '@tanstack/react-router';

import { backendApiUrl } from '#/server/backend';
import { appendSetCookie, clearSessionCookie, readSessionToken } from '#/server/cookies';

export const Route = createFileRoute('/api/session')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const token = readSessionToken(request);
				if (!token) return Response.json({ user: null }, { headers: { 'Cache-Control': 'no-store' } });

				try {
					const upstream = await fetch(backendApiUrl('me'), {
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
