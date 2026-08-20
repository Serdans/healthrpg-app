import { createFileRoute } from '@tanstack/react-router';

import { clearSessionCookie } from '#/server/cookies';

function logoutResponse(request: Request) {
	const headers = new Headers({ Location: new URL('/', request.url).toString() });
	headers.append('Set-Cookie', clearSessionCookie(request));
	return new Response(null, { status: 303, headers });
}

export const Route = createFileRoute('/auth/logout')({
	server: {
		handlers: {
			GET: ({ request }) => logoutResponse(request),
			POST: ({ request }) => logoutResponse(request),
		},
	},
});
