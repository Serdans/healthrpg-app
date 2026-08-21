import { match } from 'ts-pattern';

import type { DailyProgress, Encounter, PartyEvent, PartyVotes } from '#/lib/api';

export type DailyLoopAction =
	| { kind: 'combat'; data?: Encounter; isLoading: boolean; hasError: boolean }
	| { kind: 'route'; data?: PartyVotes; isLoading: boolean; hasError: boolean }
	| { kind: 'event'; data?: PartyEvent; isLoading: boolean; hasError: boolean }
	| { kind: 'village' }
	| { kind: 'field' };

export interface DailyLoopContext {
	daily?: DailyProgress;
	readOnly: boolean;
	userId: string;
	action: DailyLoopAction;
}

export type DailyLoopStateKind =
	| 'review-only'
	| 'signal-unavailable'
	| 'preparing-action'
	| 'action-unavailable'
	| 'command-required'
	| 'route-vote-required'
	| 'waiting-for-party'
	| 'choice-required'
	| 'resolved'
	| 'field-awaiting-resolution';

export interface DailyLoopState {
	kind: DailyLoopStateKind;
	tone: 'atlas' | 'combat' | 'village' | 'arcane' | 'history';
	badge: string;
	title: string;
	description: string;
	actionHref?: '#party-action' | '#party-field' | '#party-chronicle';
	actionLabel?: string;
}

const actionHrefByKind: Record<DailyLoopAction['kind'], DailyLoopState['actionHref']> = {
	combat: '#party-action',
	route: '#party-action',
	event: '#party-action',
	village: '#party-field',
	field: '#party-field',
};

function actionLink(action: DailyLoopAction, label: string) {
	return { actionHref: actionHrefByKind[action.kind], actionLabel: label };
}

type CombatAction = Extract<DailyLoopAction, { kind: 'combat' }>;
type RouteAction = Extract<DailyLoopAction, { kind: 'route' }>;
type EventAction = Extract<DailyLoopAction, { kind: 'event' }>;
type VillageAction = Extract<DailyLoopAction, { kind: 'village' }>;
type FieldAction = Extract<DailyLoopAction, { kind: 'field' }>;

function combatState(action: CombatAction): DailyLoopState {
	if (action.isLoading) {
		return {
			kind: 'preparing-action',
			tone: 'combat',
			badge: 'Preparing encounter',
			title: 'The field is taking shape.',
			description: 'Reading the encounter before the party chooses its commands.',
			...actionLink(action, 'Open battle'),
		};
	}
	if (action.hasError || !action.data) {
		return {
			kind: 'action-unavailable',
			tone: 'combat',
			badge: 'Encounter unavailable',
			title: 'The battle details need another look.',
			description: 'Open the current action to retry the encounter field.',
			...actionLink(action, 'Open battle'),
		};
	}
	if (action.data.status === 'completed') {
		return {
			kind: 'resolved',
			tone: 'history',
			badge: 'Resolved',
			title: 'The encounter has resolved.',
			description: 'Read the latest result in the chronicle and follow the party’s next lead.',
			actionHref: '#party-chronicle',
			actionLabel: 'Read the chronicle',
		};
	}
	return {
		kind: 'command-required',
		tone: 'combat',
		badge: 'Your command is needed',
		title: 'Choose one command for today’s encounter.',
		description: 'Read the field, choose an action, and lock in your traveler’s move before the day closes.',
		...actionLink(action, 'Choose a command'),
	};
}

function routeState(action: RouteAction, userId: string): DailyLoopState {
	if (action.isLoading) {
		return {
			kind: 'preparing-action',
			tone: 'arcane',
			badge: 'Opening route vote',
			title: 'The road is revealing its options.',
			description: 'Reading the party’s available routes.',
			...actionLink(action, 'Open route vote'),
		};
	}
	if (action.hasError || !action.data) {
		return {
			kind: 'action-unavailable',
			tone: 'arcane',
			badge: 'Route vote unavailable',
			title: 'The road options need another look.',
			description: 'Open the current action to retry the route vote.',
			...actionLink(action, 'Open route vote'),
		};
	}
	if (action.data.resolvedEdgeId) {
		return {
			kind: 'resolved',
			tone: 'history',
			badge: 'Route resolved',
			title: 'The party has chosen its road.',
			description: 'The route is settled. Review the field to see where the trail leads next.',
			actionHref: '#party-field',
			actionLabel: 'Review the field',
		};
	}
	if (action.data.votes.some((vote) => vote.userId === userId)) {
		return {
			kind: 'waiting-for-party',
			tone: 'arcane',
			badge: 'Vote saved',
			title: 'Your route vote is saved.',
			description: 'Wait for the rest of the party, or revisit your choice before the vote closes.',
			...actionLink(action, 'Review route vote'),
		};
	}
	return {
		kind: 'route-vote-required',
		tone: 'arcane',
		badge: 'Your vote is needed',
		title: 'Choose the next trail together.',
		description: 'Select the route you want the party to consider before the day closes.',
		...actionLink(action, 'Choose a route'),
	};
}

function eventState(action: EventAction, userId: string): DailyLoopState {
	if (action.isLoading) {
		return {
			kind: 'preparing-action',
			tone: 'arcane',
			badge: 'Reading the scene',
			title: 'A choice is forming in the trail.',
			description: 'Reading the available responses for the party.',
			...actionLink(action, 'Open the scene'),
		};
	}
	if (action.hasError || !action.data) {
		return {
			kind: 'action-unavailable',
			tone: 'arcane',
			badge: 'Scene unavailable',
			title: 'The scene needs another look.',
			description: 'Open the current action to retry the event.',
			...actionLink(action, 'Open the scene'),
		};
	}
	if (action.data.selectedChoiceKey) {
		return {
			kind: 'resolved',
			tone: 'history',
			badge: 'Choice resolved',
			title: 'The party’s response has been recorded.',
			description: 'Review the field and wait for the next daily resolution.',
			actionHref: '#party-field',
			actionLabel: 'Review the field',
		};
	}
	if (action.data.votes.some((vote) => vote.userId === userId)) {
		return {
			kind: 'waiting-for-party',
			tone: 'arcane',
			badge: 'Choice saved',
			title: 'Your response is saved.',
			description: 'The party can still shape the choice before the day closes.',
			...actionLink(action, 'Review the scene'),
		};
	}
	return {
		kind: 'choice-required',
		tone: 'arcane',
		badge: 'Your choice is needed',
		title: 'Choose how the party responds.',
		description: 'Read the scene and select the response that carries the party forward.',
		...actionLink(action, 'Choose a response'),
	};
}

function villageState(action: VillageAction): DailyLoopState {
	return {
		kind: 'field-awaiting-resolution',
		tone: 'village',
		badge: 'Village open',
		title: 'The party has a place to prepare.',
		description: 'Explore the village, tend the party, and open a departure vote when you are ready.',
		...actionLink(action, 'Visit the village'),
	};
}

function fieldState(action: FieldAction, daily: DailyProgress): DailyLoopState {
	return {
		kind: 'field-awaiting-resolution',
		tone: 'atlas',
		badge: daily.status === 'complete' ? 'Signal complete' : 'Signal gathering',
		title: 'The trail is quiet for now.',
		description: 'Review the field and let the party’s next daily resolution reveal the road ahead.',
		...actionLink(action, 'Review the field'),
	};
}

export function deriveDailyLoopState({ daily, readOnly, userId, action }: DailyLoopContext): DailyLoopState {
	if (readOnly) {
		return {
			kind: 'review-only',
			tone: 'history',
			badge: 'Review mode',
			title: 'The expedition is closed.',
			description: 'Review the party’s trail and chronicle. New daily actions are no longer available.',
			...actionLink({ kind: 'field' }, 'Review the field'),
		};
	}

	if (!daily) {
		return {
			kind: 'signal-unavailable',
			tone: 'village',
			badge: 'Signal unavailable',
			title: 'Today’s signal is still out of reach.',
			description: 'The party can continue once the daily health signal is available.',
		};
	}

	return match(action)
		.with({ kind: 'combat' }, combatState)
		.with({ kind: 'route' }, (currentAction) => routeState(currentAction, userId))
		.with({ kind: 'event' }, (currentAction) => eventState(currentAction, userId))
		.with({ kind: 'village' }, villageState)
		.with({ kind: 'field' }, (currentAction) => fieldState(currentAction, daily))
		.exhaustive();
}
