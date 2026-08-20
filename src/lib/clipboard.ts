export async function copyText(value: string): Promise<boolean> {
	const browserNavigator = typeof globalThis.navigator === 'object' ? globalThis.navigator : undefined;
	if (browserNavigator) {
		try {
			await browserNavigator.clipboard.writeText(value);
			return true;
		} catch {
			// Fall through to the legacy browser fallback.
		}
	}

	const browserDocument = typeof globalThis.document === 'object' ? globalThis.document : undefined;
	if (!browserDocument) return false;

	const textarea = browserDocument.createElement('textarea');
	textarea.value = value;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	textarea.style.pointerEvents = 'none';
	browserDocument.body.appendChild(textarea);
	textarea.focus();
	textarea.select();

	try {
		return browserDocument.execCommand('copy');
	} catch {
		return false;
	} finally {
		textarea.remove();
	}
}
