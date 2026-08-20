import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from '#/lib/clipboard';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe('copyText', () => {
	it('uses the Clipboard API when available', async () => {
		const writeText = vi.fn(async () => undefined);
		vi.stubGlobal('navigator', { clipboard: { writeText } });

		expect(await copyText('invite-token')).toBe(true);
		expect(writeText).toHaveBeenCalledWith('invite-token');
	});

	it('falls back to a temporary textarea', async () => {
		const textarea = {
			value: '',
			style: {} as CSSStyleDeclaration,
			setAttribute: vi.fn(),
			focus: vi.fn(),
			select: vi.fn(),
			remove: vi.fn(),
		};
		const execCommand = vi.fn(() => true);
		const body = { appendChild: vi.fn() };
		vi.stubGlobal('navigator', {});
		vi.stubGlobal('document', {
			body,
			createElement: vi.fn(() => textarea),
			execCommand,
		});

		expect(await copyText('invite-token')).toBe(true);
		expect(textarea.value).toBe('invite-token');
		expect(body.appendChild).toHaveBeenCalledWith(textarea);
		expect(execCommand).toHaveBeenCalledWith('copy');
		expect(textarea.remove).toHaveBeenCalledOnce();
	});

	it('returns false when both copy mechanisms fail', async () => {
		vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('blocked'))) } });
		vi.stubGlobal('document', undefined);

		expect(await copyText('invite-token')).toBe(false);
	});
});
