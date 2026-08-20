export const SESSION_COOKIE_NAME = 'healthrpg_session';

function isLocalHostname(hostname: string) {
	return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function readCookie(request: Request, name: string) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) return null;

	for (const part of cookieHeader.split(';')) {
		const separator = part.indexOf('=');
		if (separator < 0) continue;
		const key = part.slice(0, separator).trim();
		if (key !== name) continue;
		const value = part.slice(separator + 1).trim();
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	}

	return null;
}

export function readSessionToken(request: Request) {
	return readCookie(request, SESSION_COOKIE_NAME);
}

export function sessionCookie(request: Request, token: string, maxAge = 60 * 60 * 24 * 30) {
	const url = new URL(request.url);
	const secure = isLocalHostname(url.hostname) ? '' : '; Secure';
	return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function clearSessionCookie(request: Request) {
	const url = new URL(request.url);
	const secure = isLocalHostname(url.hostname) ? '' : '; Secure';
	return `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function appendSetCookie(headers: Headers, value: string | null) {
	if (value) headers.append('Set-Cookie', value);
}
