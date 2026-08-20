export function PageIntro({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
	return (
		<div>
			<p className="eyebrow">{eyebrow}</p>
			<h1 className="display-title mt-3 text-4xl font-semibold text-[var(--indigo)] sm:text-5xl">{title}</h1>
			<p className="mt-3 max-w-2xl text-base leading-7 text-[var(--ink-soft)]">{copy}</p>
		</div>
	);
}
