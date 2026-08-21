import { BookOpen, Map as MapIcon, Swords, UsersRound } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { GameplaySectionNav } from './gameplay-section-nav';

const sections = [
	{ id: 'story-action', label: 'Action', icon: <Swords className="size-4" aria-hidden="true" /> },
	{ id: 'story-field', label: 'Field', icon: <MapIcon className="size-4" aria-hidden="true" /> },
	{ id: 'story-party', label: 'Party', icon: <UsersRound className="size-4" aria-hidden="true" /> },
	{ id: 'story-chronicle', label: 'Chronicle', icon: <BookOpen className="size-4" aria-hidden="true" /> },
];

function SectionNavPreview({ defaultSectionId }: { defaultSectionId: string }) {
	return (
		<div className="space-y-4">
			<GameplaySectionNav sections={sections} defaultSectionId={defaultSectionId} />
			{sections.map((section) => (
				<section key={section.id} id={section.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-8">
					<p className="eyebrow">Gameplay section</p>
					<h2 className="display-title mt-2 text-3xl text-[var(--indigo)]">{section.label}</h2>
					<p className="mt-2 min-h-48 text-[var(--ink-soft)]">
						Scroll the preview to watch the active menu item follow the section in view.
					</p>
				</section>
			))}
		</div>
	);
}

const meta = {
	title: 'Party/GameplaySectionNav',
	component: GameplaySectionNav,
	parameters: { layout: 'padded' },
} satisfies Meta<typeof GameplaySectionNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FieldFocus: Story = {
	args: { sections, defaultSectionId: 'story-field' },
	render: () => <SectionNavPreview defaultSectionId="story-field" />,
};

export const ActionFocus: Story = {
	args: { sections, defaultSectionId: 'story-action' },
	render: () => <SectionNavPreview defaultSectionId="story-action" />,
};
