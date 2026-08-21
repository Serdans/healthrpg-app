import { ErrorNotice, LoadingState } from '#/components/app-state';
import { Card } from '#/components/ui/card';
import type { GamePanelTone } from '#/lib/game-art';

export function GameplayPanelState({
	tone = 'atlas',
	label,
	error,
	message,
	onRetry,
	retrying = false,
	retryLabel,
	testId,
}: {
	tone?: GamePanelTone;
	label: string;
	error?: unknown;
	message?: string;
	onRetry?: () => void;
	retrying?: boolean;
	retryLabel?: string;
	testId?: string;
}) {
	return (
		<Card variant="game" tone={tone} className="gameplay-panel-state" data-testid={testId}>
			{error ? (
				<ErrorNotice
					error={error}
					message={message ?? 'This part of the trail could not be read.'}
					onRetry={onRetry}
					retrying={retrying}
					retryLabel={retryLabel}
				/>
			) : (
				<LoadingState label={label} />
			)}
		</Card>
	);
}
