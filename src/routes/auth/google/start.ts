import { createFileRoute } from '@tanstack/react-router';

import { appendBackendCookie, backendApiUrl } from '#/server/backend';

export const Route = createFileRoute('/auth/google/start')({
	server: {
		handlers: {
			GET: async () => {
				try {
					const upstream = await fetch(backendApiUrl('auth/google'), { redirect: 'manual' });
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
