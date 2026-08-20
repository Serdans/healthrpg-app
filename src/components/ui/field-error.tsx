export function FieldError({ id, errors }: { id: string; errors: readonly unknown[] }) {
	if (errors.length === 0) return null;

	const message = errors
		.map((error) => {
			if (typeof error === 'string') return error;
			if (error instanceof Error) return error.message;
			return String(error);
		})
		.join(' ');

	return (
		<p id={id} role="alert" className="mt-2 text-sm font-bold text-[var(--danger)]">
			{message}
		</p>
	);
}
