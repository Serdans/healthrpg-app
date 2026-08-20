import { createFileRoute } from '@tanstack/react-router';

import { appendBackendCookie } from '#/server/backend';

function backendStartUrl() {
	const apiBaseUrl = process.env.API_BASE_URL?.trim();
	if (!apiBaseUrl) throw new Error('Missing API_BASE_URL');
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	return new URL('auth/google/start', baseUrl);
}

export const Route = createFileRoute('/auth/google/start')({
	server: {
		handlers: {
			GET: async () => {
				try {
					const upstream = await fetch(backendStartUrl(), { redirect: 'manual' });
					const location = upstream.headers.get('Location');
					if (!location || upstream.status < 300 || upstream.status >= 400) {
						return new Response('OAuth provider unavailable', { status: 502 });
					}

					const headers = new Headers({ Location: location });
					appendBackendCookie(headers, upstream);
					return new Response(null, { status: 302, headers });
				} catch {
					return new Response('OAuth provider unavailable', { status: 502 });
				}
			},
		},
	},
});
