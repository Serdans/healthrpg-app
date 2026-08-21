import type { RefObject } from 'react';
import { ArrowRight, DoorOpen } from 'lucide-react';

import { Badge } from '#/components/ui/badge';
import { Button } from '#/components/ui/button';
import type { PartyMap } from '#/lib/api';
import { focusGameplaySection, isModifiedNavigation } from '#/lib/gameplay-navigation';
import type { WorldMapLayoutNode } from '#/lib/world-map';

export interface WorldMapEntryMutation {
	isPending: boolean;
	error: Error | null;
	mutate: (locationId: string) => void;
}

function stateLabel(state: WorldMapLayoutNode['state']) {
	switch (state) {
		case 'current':
			return 'Current location';
		case 'next':
			return 'Next possible route';
		case 'revealed':
		default:
			return 'Revealed landmark';
	}
}

function readableRole(role: PartyMap['nodes'][number]['mapMetadata']['role']) {
	return role.replace('-', ' ');
}

function eventLabel(eventType: NonNullable<NonNullable<PartyMap['nodes'][number]['config']>['event']>['eventType']) {
	return `${eventType.charAt(0).toUpperCase()}${eventType.slice(1)} encounter`;
}

export function WorldMapInspector({
	map,
	selectedNode,
	selectedEdge,
	canEnterSelectedLocation,
	enterableLocation,
	enterMutation,
	readOnly,
	actionHref,
	inspectorRef,
}: {
	map: PartyMap;
	selectedNode: WorldMapLayoutNode;
	selectedEdge: PartyMap['edges'][number] | undefined;
	canEnterSelectedLocation: boolean;
	enterableLocation: NonNullable<PartyMap['enterableLocation']> | null;
	enterMutation?: WorldMapEntryMutation;
	readOnly: boolean;
	actionHref?: '#party-action';
	inspectorRef: RefObject<HTMLDivElement | null>;
}) {
	return (
		<div
			ref={inspectorRef}
			className="world-map-inspector"
			tabIndex={-1}
			aria-live="polite"
			aria-atomic="true"
			data-testid="world-map-inspector"
		>
			<div className="world-map-inspector-heading">
				<div>
					<p className="eyebrow">Atlas entry</p>
					<h3>{selectedNode.node.name}</h3>
					<p>
						{readableRole(selectedNode.node.mapMetadata.role)} · floor {selectedNode.node.mapMetadata.floorNo + 1}
					</p>
				</div>
				<Badge>{stateLabel(selectedNode.state)}</Badge>
			</div>
			<div className="world-map-inspector-copy">
				{selectedNode.state === 'current' && <p>The party is here. The next choice will shape the road ahead.</p>}
				{selectedNode.state === 'next' && (
					<p>
						{selectedEdge
							? `Route option ${selectedEdge.sortOrder + 1}: ${selectedEdge.optionKey.replaceAll('-', ' ')}.`
							: 'A route the party can reach from here.'}
					</p>
				)}
				{selectedNode.state === 'revealed' && <p>This landmark has been revealed on the party atlas.</p>}
				{selectedNode.node.config?.event && <span>{eventLabel(selectedNode.node.config.event.eventType)}</span>}
				{selectedNode.node.config?.landmark && <span>Landmark: {selectedNode.node.config.landmark.key.replaceAll('-', ' ')}</span>}
				<span>
					{map.currentMap.name} · {readableRole(selectedNode.node.mapMetadata.role)}
				</span>
				{actionHref && selectedNode.state === 'next' && selectedEdge && (
					<div className="world-map-route-bridge" data-testid="world-map-route-bridge">
						<div>
							<span className="game-pixel-label">Next decision</span>
							<strong>Review this route with the party</strong>
						</div>
						<a
							href={actionHref}
							onClick={(event) => {
								if (!isModifiedNavigation(event)) focusGameplaySection(actionHref.slice(1));
							}}
						>
							Review route vote <ArrowRight className="size-4" aria-hidden="true" />
						</a>
					</div>
				)}
				{canEnterSelectedLocation && enterableLocation && enterMutation && (
					<div
						className="game-inset game-inset-gold mt-2 w-full p-3"
						data-testid="world-map-location-entry"
						data-entry-state={enterMutation.isPending ? 'opening' : enterMutation.error ? 'error' : 'ready'}
						aria-live="polite"
						aria-busy={enterMutation.isPending}
					>
						<div className="flex items-start gap-3">
							<DoorOpen className="mt-0.5 size-5 shrink-0 text-[var(--gold-deep)]" aria-hidden="true" />
							<div>
								<p className="font-extrabold text-[var(--indigo)]">{enterableLocation.name}</p>
								<p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">
									The threshold is here. Enter to explore this {enterableLocation.mapType} map.
								</p>
							</div>
						</div>
						<Button
							game
							className="mt-3 w-full sm:w-auto"
							disabled={readOnly || enterMutation.isPending}
							onClick={() => enterMutation.mutate(enterableLocation.id)}
						>
							<DoorOpen className="size-4" aria-hidden="true" />
							{enterMutation.isPending ? 'Opening the map…' : `Enter ${enterableLocation.name}`}
						</Button>
						{enterMutation.error && (
							<p role="alert" className="mt-2 text-sm font-bold text-[var(--danger)]">
								{enterMutation.error.message}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
