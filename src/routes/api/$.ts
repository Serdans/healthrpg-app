import { createFileRoute } from '@tanstack/react-router';

import {
	backendUnavailableResponse,
	copyBackendResponse,
	forbiddenResponse,
	passesSameOriginCheck,
	requestBackend,
	unauthorizedResponse,
} from '#/server/backend';
import { readSessionToken } from '#/server/cookies';

async function proxy({ request }: { request: Request }) {
	if (!passesSameOriginCheck(request)) return forbiddenResponse();
	if (!readSessionToken(request)) return unauthorizedResponse();

	const url = new URL(request.url);
	const path = `${url.pathname.slice('/api'.length)}${url.search}`;
	if (!path.startsWith('/v1/')) {
		return new Response('Not found', { status: 404 });
	}

	try {
		const upstream = await requestBackend(request, path);
		return copyBackendResponse(request, upstream);
	} catch {
		return backendUnavailableResponse();
	}
}

export const Route = createFileRoute('/api/$')({
	server: {
		handlers: {
			GET: proxy,
			POST: proxy,
			PUT: proxy,
			PATCH: proxy,
			DELETE: proxy,
		},
	},
});
