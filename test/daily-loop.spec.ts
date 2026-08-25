import { describe, expect, it } from 'vitest';

import type { DailyProgress, Encounter, PartyEvent, PartyVotes } from '#/lib/api';
import { deriveDailyLoopState } from '#/lib/daily-loop';

const daily: DailyProgress = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	movementUnits: 8,
	movementCost: 10,
	movementSatisfied: false,
	recoveryPoints: 4,
	challengeContribution: 0,
	challengeProgress: 0,
	challengeCost: 0,
	challengeCleared: true,
	status: 'provisional',
	members: [{ userId: 'user-1', movementUnits: 8, recoveryPoints: 4, status: 'provisional' }],
};

const activeEncounter: Encounter = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	status: 'active',
	enemies: [],
	members: [],
};

const completedEncounter: Encounter = { ...activeEncounter, status: 'completed' };

const routeVotes: PartyVotes = {
	accepted: true,
	partyId: 'party-1',
	nodeId: 'node-1',
	deadlineAt: '2026-08-22T00:00:00.000Z',
	resolvedEdgeId: null,
	votes: [],
};

const event: PartyEvent = {
	partyId: 'party-1',
	nodeId: 'node-1',
	worldDate: '2026-08-21',
	eventType: 'narrative',
	prompt: 'Which light do you follow?',
	choices: [
		{
			key: 'north',
			displayName: 'Follow the north light',
			description: 'Take the high road.',
			requirements: { movementUnits: 0, recoveryPoints: 0 },
		},
	],
	selectedChoiceKey: null,
	resolved: false,
	votes: [],
};

function derive(
	action: Parameters<typeof deriveDailyLoopState>[0]['action'],
	overrides?: Partial<Parameters<typeof deriveDailyLoopState>[0]>,
) {
	return deriveDailyLoopState({ daily, readOnly: false, userId: 'user-1', action, ...overrides });
}

describe('daily loop state', () => {
	it('keeps review mode ahead of daily signal and action state', () => {
		expect(
			derive({ kind: 'combat', data: activeEncounter, isLoading: false, hasError: false, isBoss: false }, { readOnly: true }),
		).toMatchObject({
			kind: 'review-only',
			actionHref: '#party-field',
		});
	});

	it('surfaces unavailable daily signal before action details', () => {
		expect(
			derive({ kind: 'combat', data: activeEncounter, isLoading: false, hasError: false, isBoss: false }, { daily: undefined }),
		).toMatchObject({
			kind: 'signal-unavailable',
			tone: 'village',
		});
	});

	it('distinguishes active and completed encounters', () => {
		expect(derive({ kind: 'combat', data: activeEncounter, isLoading: false, hasError: false, isBoss: false })).toMatchObject({
			kind: 'command-required',
			actionLabel: 'Build card plan',
		});
		expect(derive({ kind: 'combat', data: completedEncounter, isLoading: false, hasError: false, isBoss: false })).toMatchObject({
			kind: 'resolved',
			actionHref: '#party-chronicle',
		});
	});

	it('reports loading and error states for combat', () => {
		expect(derive({ kind: 'combat', isLoading: true, hasError: false, isBoss: false })).toMatchObject({ kind: 'preparing-action' });
		expect(derive({ kind: 'combat', isLoading: false, hasError: true, isBoss: false })).toMatchObject({ kind: 'action-unavailable' });
	});

	it('makes the boss opt-in explicit in the daily command center', () => {
		expect(derive({ kind: 'combat', data: activeEncounter, isLoading: false, hasError: false, isBoss: true })).toMatchObject({
			kind: 'command-required',
			badge: 'Boss plan required',
			title: 'Build a card plan to engage the boss.',
		});
	});

	it('tracks route votes for the current traveler', () => {
		expect(derive({ kind: 'route', data: routeVotes, isLoading: false, hasError: false })).toMatchObject({ kind: 'route-vote-required' });
		expect(
			derive({
				kind: 'route',
				data: { ...routeVotes, votes: [{ userId: 'user-1', edgeId: 'edge-1' }] },
				isLoading: false,
				hasError: false,
			}),
		).toMatchObject({ kind: 'waiting-for-party' });
		expect(derive({ kind: 'route', data: { ...routeVotes, resolvedEdgeId: 'edge-1' }, isLoading: false, hasError: false })).toMatchObject({
			kind: 'resolved',
			actionHref: '#party-field',
		});
	});

	it('tracks event choices for the current traveler', () => {
		expect(derive({ kind: 'event', data: event, isLoading: false, hasError: false })).toMatchObject({ kind: 'choice-required' });
		expect(derive({ kind: 'event', data: { ...event, resolved: true }, isLoading: false, hasError: false })).toMatchObject({
			kind: 'resolved',
			actionHref: '#party-field',
		});
		expect(
			derive({
				kind: 'event',
				data: { ...event, votes: [{ userId: 'user-1', choiceKey: 'north' }] },
				isLoading: false,
				hasError: false,
			}),
		).toMatchObject({ kind: 'waiting-for-party' });
		expect(
			derive({
				kind: 'event',
				data: { ...event, selectedChoiceKey: 'north', votes: [{ userId: 'user-1', choiceKey: 'north' }] },
				isLoading: false,
				hasError: false,
			}),
		).toMatchObject({ kind: 'waiting-for-party' });
		expect(
			derive({
				kind: 'event',
				data: { ...event, selectedChoiceKey: 'north', votes: [{ userId: 'user-2', choiceKey: 'north' }] },
				isLoading: false,
				hasError: false,
			}),
		).toMatchObject({ kind: 'choice-required' });
	});

	it('uses field and village states when there is no decision', () => {
		expect(derive({ kind: 'village' })).toMatchObject({ kind: 'field-awaiting-resolution', tone: 'village' });
		expect(derive({ kind: 'field' })).toMatchObject({ kind: 'field-awaiting-resolution', tone: 'atlas' });
	});
});
