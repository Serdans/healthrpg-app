import { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { DungeonGridMap } from './dungeon-grid-map';
import type { PartyMap } from '#/lib/api';

const meta = {
	title: 'Party/DungeonGridMap',
	component: DungeonGridMap,
} satisfies Meta<typeof DungeonGridMap>;

export default meta;

function tileNode(id: string, kind: string, x: number, y: number): PartyMap['nodes'][number] {
	return {
		id,
		chapterNo: 0,
		regionNo: 0,
		name: `F1 ${kind.replaceAll('-', ' ')}`,
		nodeType: kind === 'spawn' ? 'combat' : 'travel',
		templateKey: `dungeon-tile-${kind}-v1`,
		config: null,
		mapMetadata: {
			mapId: 'map-dungeon',
			nodeId: id,
			floorNo: 0,
			role: kind === 'spawn' ? 'combat' : kind === 'entry' ? 'entrance' : 'room',
			sortOrder: x * 10 + y,
			isEntry: kind === 'entry',
			isExit: false,
			tileX: x,
			tileY: y,
			spawnArchetype: kind === 'spawn' ? 'slime' : kind === 'boss' ? 'ruin-sentinel' : null,
		},
		discovered: true,
		encounterCleared: false,
	};
}

const dungeonMap: PartyMap = {
	currentChapter: 0,
	currentNodeId: 'entry',
	currentMap: {
		id: 'map-dungeon',
		mapType: 'dungeon',
		name: 'First Ruins',
		templateKey: 'dungeon-v1',
		parentNodeId: 'parent',
		entryNodeId: 'entry',
	},
	enterableLocation: null,
	nodes: [
		tileNode('entry', 'entry', 2, 2),
		tileNode('corridor', 'floor', 3, 2),
		tileNode('junction', 'floor', 4, 2),
		tileNode('north-den', 'floor', 5, 1),
		tileNode('north-bridge', 'floor', 6, 1),
		tileNode('north-east', 'floor', 7, 1),
		tileNode('treasure', 'treasure', 2, 1),
		tileNode('camp', 'rest', 4, 1),
		tileNode('den', 'spawn', 5, 2),
		tileNode('east-room', 'floor', 6, 2),
		tileNode('east-corner', 'floor', 7, 2),
		tileNode('east-wing', 'floor', 8, 2),
		tileNode('east-south', 'floor', 8, 3),
		tileNode('south-entry', 'floor', 2, 3),
		tileNode('south-corridor', 'floor', 3, 3),
		tileNode('south-junction', 'floor', 4, 3),
		tileNode('south-den', 'floor', 5, 3),
		tileNode('south-room', 'floor', 6, 3),
		tileNode('south-wing', 'floor', 7, 3),
		tileNode('lower-corner', 'floor', 7, 4),
		tileNode('lower-east', 'floor', 8, 4),
		tileNode('lower-end', 'floor', 9, 4),
		tileNode('lower-deep', 'floor', 9, 5),
		tileNode('boss', 'boss', 9, 3),
		tileNode('stairs', 'stairs-down', 10, 4),
		tileNode('goal', 'goal', 10, 5),
	],
	edges: [],
	objectives: [],
	completedObjectiveIds: [],
	tileBalance: 9,
	monsters: [],
	navigation: null,
};

const walkNavigation = {
	navigatorUserId: null,
	navigatorDisplayName: null,
	claimedAt: null,
	lastActiveAt: null,
	leaseExpiresAt: null,
	routeIntent: null,
	routeVotes: [],
};

export const ExploredCorridor: StoryObj<typeof DungeonGridMap> = {
	args: { map: dungeonMap },
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('dungeon-grid')).toBeVisible();
		await expect(canvas.getByTestId('dungeon-grid-canvas')).toBeInTheDocument();
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-dungeon-renderer', 'pixi');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-dungeon-theme', 'atmospheric');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-dungeon-floor', '0');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-tile-balance', '9');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-size', '1');
		await expect(canvas.getByTestId('dungeon-live-status')).toHaveTextContent(/Party is at entry/);
	},
};

function InteractiveWalkView() {
	const [map, setMap] = useState(dungeonMap);
	const mapRef = useRef(map);
	return (
		<DungeonGridMap
			map={map}
			walkMutation={{
				isPending: false,
				error: null,
				mutateAsync: async (input) => {
					const current = mapRef.current;
					if (input.mode !== 'manual') {
						return {
							partyId: 'party-story',
							nodeId: current.currentNodeId,
							tileBalance: current.tileBalance,
							stepsTaken: 0,
							pathNodeIds: [],
							revealedCount: 0,
							floorChanged: false,
							encounterTriggeredNodeId: null,
							haltedReason: null,
							monsterMoves: [],
							navigation: walkNavigation,
						};
					}
					const currentMeta = current.nodes.find((node) => node.id === current.currentNodeId)?.mapMetadata;
					if (!currentMeta || currentMeta.tileX === null || currentMeta.tileY === null) {
						return {
							partyId: 'party-story',
							nodeId: current.currentNodeId,
							tileBalance: current.tileBalance,
							stepsTaken: 0,
							pathNodeIds: [],
							revealedCount: 0,
							floorChanged: false,
							encounterTriggeredNodeId: null,
							haltedReason: null,
							monsterMoves: [],
							navigation: walkNavigation,
						};
					}
					const delta = {
						up: [0, -1],
						down: [0, 1],
						left: [-1, 0],
						right: [1, 0],
					}[input.steps[0]];
					const next = current.nodes.find(
						(node) =>
							node.mapMetadata.floorNo === currentMeta.floorNo &&
							node.mapMetadata.tileX === (currentMeta.tileX ?? 0) + delta[0] &&
							node.mapMetadata.tileY === (currentMeta.tileY ?? 0) + delta[1],
					);
					const nextMap = next ? { ...current, currentNodeId: next.id } : current;
					mapRef.current = nextMap;
					setMap(nextMap);
					return {
						partyId: 'party-story',
						nodeId: nextMap.currentNodeId,
						tileBalance: nextMap.tileBalance,
						stepsTaken: next ? 1 : 0,
						pathNodeIds: next ? [next.id] : [],
						revealedCount: 0,
						floorChanged: false,
						encounterTriggeredNodeId: null,
						haltedReason: null,
						monsterMoves: [],
						navigation: walkNavigation,
					};
				},
			}}
		/>
	);
}

export const InteractiveWalk: StoryObj<typeof DungeonGridMap> = {
	render: () => <InteractiveWalkView />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('dungeon-live-status')).toHaveTextContent(/Party is at entry/);
		await canvas.getByTestId('dungeon-grid-viewport').focus();
		await userEvent.keyboard('{ArrowUp}');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-node-id', 'treasure');
		await waitFor(() => expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-traveling', 'false'), { timeout: 15_000 });
		await userEvent.keyboard('{ArrowDown}');
		await waitFor(() => expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-node-id', 'entry'), { timeout: 15_000 });
		await userEvent.keyboard('{ArrowRight}');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-node-id', 'corridor');
		await expect(canvas.getByTestId('dungeon-live-status')).not.toHaveTextContent(/Party is at entry/);
	},
};

export const NavigatorGated: StoryObj<typeof DungeonGridMap> = {
	render: () => (
		<DungeonGridMap
			map={{
				...dungeonMap,
				navigation: {
					navigatorUserId: 'user-2',
					navigatorDisplayName: 'Mira',
					claimedAt: '2026-08-23T10:00:00.000Z',
					lastActiveAt: '2026-08-23T10:02:00.000Z',
					leaseExpiresAt: '2099-08-23T10:07:00.000Z',
					routeIntent: null,
					routeVotes: [],
				},
			}}
			walkMutation={{
				isPending: false,
				error: null,
				mutateAsync: async () => ({
					partyId: 'party-story',
					nodeId: dungeonMap.currentNodeId,
					tileBalance: dungeonMap.tileBalance,
					stepsTaken: 0,
					pathNodeIds: [],
					revealedCount: 0,
					floorChanged: false,
					encounterTriggeredNodeId: null,
					haltedReason: null,
					monsterMoves: [],
					navigation: walkNavigation,
				}),
			}}
			navigatorControls={{
				userId: 'user-1',
				members: [
					{ userId: 'user-1', role: 'leader', displayName: 'Ari' },
					{ userId: 'user-2', role: 'member', displayName: 'Mira' },
				],
				claimMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
				releaseMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
				transferMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
				voteRouteMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
				setRouteIntentMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
				clearRouteIntentMutation: { isPending: false, error: null, mutateAsync: async () => undefined },
			}}
		/>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId('dungeon-navigator')).toHaveAttribute('data-navigation-mode', 'observing');
		await expect(canvas.getByTestId('dungeon-grid')).toHaveAttribute('data-party-size', '2');
		await expect(canvas.queryByTestId('dungeon-navigator-claim')).not.toBeInTheDocument();
		await expect(canvas.getByTestId('dungeon-advance')).toBeDisabled();
		await expect(canvas.getByTestId('dungeon-route-intent')).toBeVisible();
		await expect(canvas.getByTestId('dungeon-route-vote')).toBeVisible();
		await expect(canvas.getByTestId('dungeon-step-up')).toBeDisabled();
	},
};
