import { appendSetCookie, clearSessionCookie, readSessionToken } from './cookies';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function runtimeEnv(name: 'API_BASE_URL' | 'APP_ORIGIN') {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing ${name}`);
	return value;
}

function jsonError(message: string, status: number) {
	return Response.json({ error: message }, { status });
}

function requestOrigin(request: Request) {
	const origin = request.headers.get('Origin');
	if (origin) return origin;

	const referer = request.headers.get('Referer');
	if (!referer) return null;

	try {
		return new URL(referer).origin;
	} catch {
		return null;
	}
}

export function passesSameOriginCheck(request: Request) {
	if (!unsafeMethods.has(request.method)) return true;

	const origin = requestOrigin(request);
	return origin === runtimeEnv('APP_ORIGIN');
}

export function backendApiUrl(path: string) {
	const apiBaseUrl = runtimeEnv('API_BASE_URL');
	const baseUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl : `${apiBaseUrl}/`;
	const normalizedPath = path
		.replace(/^\/+/, '')
		.replace(/^api\/v1\/?/, '')
		.replace(/^v1\/?/, '');
	return new URL(`api/v1/${normalizedPath}`, baseUrl);
}

function forwardHeaders(request: Request, token: string | null) {
	const headers = new Headers();
	const contentType = request.headers.get('Content-Type');
	const accept = request.headers.get('Accept');
	if (contentType) headers.set('Content-Type', contentType);
	if (accept) headers.set('Accept', accept);
	if (token) headers.set('Authorization', `Bearer ${token}`);
	return headers;
}

export async function requestBackend(request: Request, path: string, includeSession = true) {
	const token = includeSession ? readSessionToken(request) : null;
	const init: RequestInit = {
		method: request.method,
		headers: forwardHeaders(request, token),
		redirect: 'manual',
	};

	if (request.method !== 'GET' && request.method !== 'HEAD') {
		// Buffer the incoming body before forwarding it. This keeps the proxy
		// portable across Nitro adapters and avoids Node's streaming-fetch
		// `duplex: 'half'` requirement for browser mutations.
		init.body = request.body ? await request.arrayBuffer() : undefined;
	}

	return fetch(backendApiUrl(path), init);
}

export function copyBackendResponse(request: Request, upstream: Response) {
	const headers = new Headers(upstream.headers);
	headers.delete('Set-Cookie');
	headers.delete('Content-Length');
	headers.delete('Content-Encoding');
	headers.delete('Transfer-Encoding');

	if (upstream.status === 401) {
		headers.append('Set-Cookie', clearSessionCookie(request));
	}

	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers,
	});
}

export function unauthorizedResponse() {
	return jsonError('Authentication required', 401);
}

export function forbiddenResponse() {
	return jsonError('Forbidden', 403);
}

export function backendUnavailableResponse() {
	return jsonError('Backend unavailable', 502);
}

export function appendBackendCookie(headers: Headers, upstream: Response) {
	appendSetCookie(headers, upstream.headers.get('Set-Cookie'));
}
