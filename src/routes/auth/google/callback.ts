import { createFileRoute } from '@tanstack/react-router';

import { appendBackendCookie } from '#/server/backend';
import { sessionCookie } from '#/server/cookies';

function backendCallbackUrl(request: Request) {
	const apiBaseUrl = process.env.API_BASE_URL?.trim();
	if (!apiBaseUrl) throw new Error('Missing API_BASE_URL');
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	const target = new URL('auth/google/callback', baseUrl);
	target.search = new URL(request.url).search;
	return target;
}

function stringProperty(value: unknown, property: string) {
	if (typeof value !== 'object' || value === null) return null;
	const propertyValue = Reflect.get(value, property);
	return typeof propertyValue === 'string' && propertyValue.length > 0 ? propertyValue : null;
}

function redirectToLogin(request: Request) {
	const location = new URL('/', request.url);
	location.searchParams.set('error', 'oauth_failed');
	return Response.redirect(location, 303);
}

export const Route = createFileRoute('/auth/google/callback')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				try {
					const upstream = await fetch(backendCallbackUrl(request), {
						headers: {
							Cookie: request.headers.get('Cookie') ?? '',
							Accept: 'application/json',
						},
					});
					if (!upstream.ok) return redirectToLogin(request);

					const payload: unknown = await upstream.json();
					const accessToken = stringProperty(payload, 'accessToken');
					if (!accessToken) return redirectToLogin(request);

					const headers = new Headers({ Location: new URL('/app', request.url).toString() });
					appendBackendCookie(headers, upstream);
					headers.append('Set-Cookie', sessionCookie(request, accessToken));
					return new Response(null, { status: 303, headers });
				} catch {
					return redirectToLogin(request);
				}
			},
		},
	},
});
