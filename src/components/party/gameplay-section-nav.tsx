import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface GameplaySectionNavItem {
	id: string;
	label: string;
	icon: ReactNode;
}

export function GameplaySectionNav({
	sections,
	defaultSectionId,
	testId = 'gameplay-section-nav',
}: {
	sections: readonly GameplaySectionNavItem[];
	defaultSectionId: string;
	testId?: string;
}) {
	const [observedSectionId, setObservedSectionId] = useState<string | null>(null);
	const sectionIdList = sections.map((section) => section.id).join('|');
	const activeSectionId = observedSectionId && sectionIdList.split('|').includes(observedSectionId) ? observedSectionId : defaultSectionId;

	useEffect(() => {
		if (typeof IntersectionObserver === 'undefined') return;

		const sectionIds = sectionIdList ? sectionIdList.split('|') : [];
		const sectionOrder = new Map(sectionIds.map((sectionId, index) => [sectionId, index]));
		const visibleSections = new Map<string, number>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visibleSections.set(entry.target.id, entry.intersectionRatio);
					} else {
						visibleSections.delete(entry.target.id);
					}
				}

				const nextSection = [...visibleSections.entries()].sort(
					([leftId, leftRatio], [rightId, rightRatio]) =>
						rightRatio - leftRatio || (sectionOrder.get(leftId) ?? 0) - (sectionOrder.get(rightId) ?? 0),
				)[0]?.[0];
				if (nextSection) setObservedSectionId(nextSection);
			},
			{ rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
		);

		for (const sectionId of sectionIds) {
			const element = document.getElementById(sectionId);
			if (element) observer.observe(element);
		}

		return () => observer.disconnect();
	}, [defaultSectionId, sectionIdList]);

	return (
		<nav className="gameplay-section-nav" aria-label="Party menu" data-testid={testId}>
			{sections.map((section) => {
				const active = activeSectionId === section.id;
				return (
					<a key={section.id} href={`#${section.id}`} aria-current={active ? 'location' : undefined} data-active={active}>
						{section.icon} {section.label}
					</a>
				);
			})}
		</nav>
	);
}
