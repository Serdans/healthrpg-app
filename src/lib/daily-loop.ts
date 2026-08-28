import { match } from 'ts-pattern';

import type { DailyProgress, Encounter, PartyEvent, PartyVotes } from '#/lib/api';

export type DailyLoopAction =
	| { kind: 'combat'; data?: Encounter; isLoading: boolean; hasError: boolean; isBoss: boolean }
	| { kind: 'route'; data?: PartyVotes; isLoading: boolean; hasError: boolean }
	| { kind: 'event'; data?: PartyEvent; isLoading: boolean; hasError: boolean }
	| { kind: 'explore'; tileBalance: number }
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
	| 'steps-required'
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
	explore: '#party-field',
	village: '#party-field',
	field: '#party-field',
};

function actionLink(action: DailyLoopAction, label: string) {
	return { actionHref: actionHrefByKind[action.kind], actionLabel: label };
}

type CombatAction = Extract<DailyLoopAction, { kind: 'combat' }>;
type RouteAction = Extract<DailyLoopAction, { kind: 'route' }>;
type EventAction = Extract<DailyLoopAction, { kind: 'event' }>;
type ExploreAction = Extract<DailyLoopAction, { kind: 'explore' }>;
type VillageAction = Extract<DailyLoopAction, { kind: 'village' }>;
type FieldAction = Extract<DailyLoopAction, { kind: 'field' }>;

function combatState(action: CombatAction): DailyLoopState {
	if (action.isLoading) {
		return {
			kind: 'preparing-action',
			tone: 'combat',
			badge: 'Preparing encounter',
			title: 'The field is taking shape.',
			description: 'Reading the encounter before the party builds its card plans.',
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
		badge: action.isBoss ? 'Boss plan required' : 'Your card plan is needed',
		title: action.isBoss ? 'Build a card plan to engage the boss.' : 'Queue cards for today’s encounter.',
		description: action.isBoss
			? 'The party will remain at the optional boss until a member explicitly saves a card plan.'
			: 'Read the field, queue cards, and lock in your traveler’s plan before the day closes.',
		...actionLink(action, 'Build card plan'),
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
	if (action.data.resolved) {
		return {
			kind: 'resolved',
			tone: 'history',
			badge: 'Event resolved',
			title: 'The scene has resolved for today.',
			description: 'The party’s daily projection will apply the result and move the expedition forward.',
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

function exploreState(action: ExploreAction): DailyLoopState {
	return {
		kind: 'steps-required',
		tone: 'combat',
		badge: action.tileBalance > 0 ? `${action.tileBalance} Explore energy` : 'No Explore energy',
		title: 'The dungeon waits in the dark.',
		description: 'Send the party deeper with auto-explore, or step tile by tile. Every tile costs one unit of Explore energy.',
		...actionLink(action, 'Delve the dungeon'),
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
		.with({ kind: 'explore' }, exploreState)
		.with({ kind: 'village' }, villageState)
		.with({ kind: 'field' }, (currentAction) => fieldState(currentAction, daily))
		.exhaustive();
}
