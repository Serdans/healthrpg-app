import type { Meta, StoryObj } from '@storybook/react-vite';

import { Badge } from './badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { FieldError } from './field-error';
import { Input } from './input';
import { Label } from './label';
import { LabelledSelect } from './select-field';
import { Progress } from './progress';

const meta = {
	title: 'UI/Primitives',
	parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Content: Story = {
	render: () => (
		<div className="grid max-w-3xl gap-5 md:grid-cols-2">
			<Card>
				<CardHeader>
					<Badge>Adventure atlas</Badge>
					<CardTitle className="mt-3">The Mistwood Marches</CardTitle>
					<CardDescription>A reusable card surface for the trail.</CardDescription>
				</CardHeader>
				<CardContent>
					<Progress value={68} />
					<p className="text-sm text-[var(--ink-soft)]">68% toward the next Challenge.</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Traveler details</CardTitle>
					<CardDescription>Inputs preserve the same visual language.</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Label htmlFor="traveler-name">Name</Label>
						<Input id="traveler-name" defaultValue="Lantern Walker" />
						<LabelledSelect
							label="Class"
							value="ranger"
							options={[
								{ value: 'ranger', label: 'Ranger' },
								{ value: 'cleric', label: 'Cleric' },
							]}
							onChange={() => undefined}
						/>
						<FieldError id="traveler-name-error" errors={['Example validation message.']} />
					</div>
				</CardContent>
			</Card>
		</div>
	),
};

export const GamePanels: Story = {
	render: () => (
		<div className="grid max-w-4xl gap-5 sm:grid-cols-2">
			{(['atlas', 'combat', 'village', 'arcane', 'history'] as const).map((tone) => (
				<Card key={tone} variant="game" tone={tone}>
					<CardHeader>
						<Badge>{tone} panel</Badge>
						<CardTitle className="mt-3">A framed gameplay surface</CardTitle>
						<CardDescription>Each tone keeps the same readable structure while changing the game-state accent.</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm leading-6 text-[var(--ink-soft)]">The frame, inset border, and title ribbon carry the visual language.</p>
					</CardContent>
				</Card>
			))}
		</div>
	),
};
