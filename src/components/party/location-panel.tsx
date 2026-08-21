import { Check, Flag, MapPinned, ScrollText } from 'lucide-react';

import type { PartyMap } from '#/lib/api';

function locationLabel(mapType: PartyMap['currentMap']['mapType']) {
	return mapType === 'dungeon' ? 'Dungeon' : mapType === 'village' ? 'Village' : 'Overworld';
}

export function LocationPanel({ map }: { map: PartyMap }) {
	const currentNode = map.nodes.find((node) => node.id === map.currentNodeId);
	const completedObjectiveIds = new Set(map.completedObjectiveIds);
	const completedCount = map.objectives.filter((objective) => completedObjectiveIds.has(objective.id)).length;
	if (map.currentMap.mapType === 'overworld') return null;

	return (
		<section
			className={`interior-quest-ribbon interior-quest-ribbon-${map.currentMap.mapType}`}
			data-testid="location-objectives"
			aria-label={`${map.currentMap.name} objectives`}
		>
			<div className="interior-quest-heading">
				<div className="interior-quest-title">
					<MapPinned className="interior-quest-emblem" aria-hidden="true" />
					<div>
						<p className="eyebrow">
							{locationLabel(map.currentMap.mapType)} · {map.currentMap.name}
						</p>
						<h2>{currentNode?.name ?? 'Interior map'}</h2>
						<p className="interior-quest-subtitle">
							{currentNode?.mapMetadata.role.replaceAll('-', ' ') ?? 'uncharted room'} · floor {(currentNode?.mapMetadata.floorNo ?? 0) + 1}
						</p>
					</div>
				</div>
				<div className="interior-quest-progress" aria-label={`${completedCount} of ${map.objectives.length} objectives complete`}>
					<strong>
						{completedCount}/{map.objectives.length}
					</strong>
					<span>Objectives</span>
				</div>
			</div>

			<div className="interior-quest-divider" aria-hidden="true">
				<span />
				<ScrollText className="size-4" />
				<span />
			</div>

			{map.objectives.length > 0 ? (
				<div className="interior-quest-list" aria-label="Location objectives">
					{map.objectives.map((objective) => {
						const complete = completedObjectiveIds.has(objective.id);
						return (
							<div
								key={objective.id}
								className={`interior-quest-chip interior-quest-chip-${complete ? 'complete' : 'open'}`}
								data-objective-id={objective.id}
								title={objective.description}
								aria-label={`${objective.displayName}: ${objective.description}${objective.required ? ', required' : ', optional'}${complete ? ', complete' : ''}`}
							>
								<span className="interior-quest-chip-icon" aria-hidden="true">
									{complete ? <Check className="size-4" /> : <Flag className="size-4" />}
								</span>
								<span className="interior-quest-chip-copy">
									<strong>{objective.displayName}</strong>
									<small>{complete ? 'Complete' : objective.required ? 'Required path' : 'Optional path'}</small>
								</span>
							</div>
						);
					})}
				</div>
			) : (
				<p className="interior-quest-empty">
					This hub has no completion objective. Explore its rooms, use its services, and return to the road when ready.
				</p>
			)}
		</section>
	);
}
