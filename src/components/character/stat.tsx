export function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
			<p className="font-mono text-xl font-medium text-[var(--indigo)]">{value}</p>
			<p className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</p>
		</div>
	);
}
