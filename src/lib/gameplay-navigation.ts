export function focusGameplaySection(sectionId: string) {
	if (typeof document === 'undefined') return;

	window.requestAnimationFrame(() => {
		document.getElementById(sectionId)?.focus({ preventScroll: true });
	});
}

export function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

export function gameplayScrollBehavior(): ScrollBehavior {
	return prefersReducedMotion() ? 'auto' : 'smooth';
}

export function isModifiedNavigation(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
	return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
