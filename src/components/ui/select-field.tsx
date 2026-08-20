export function LabelledSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) {
	return (
		<label className="block text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
			{label}
			<select
				className="mt-2 h-11 w-full rounded-xl border border-[var(--line-strong)] bg-[var(--surface-strong)] px-3 text-sm font-bold normal-case tracking-normal text-[var(--indigo)] outline-none focus:border-[var(--gold)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--gold)_24%,transparent)]"
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</label>
	);
}
