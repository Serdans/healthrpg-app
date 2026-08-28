import ky, { isHTTPError } from 'ky';
import type { Options } from 'ky';

import type { paths } from '#/api/generated';

const appOrigin = typeof globalThis.location === 'object' ? globalThis.location.origin : undefined;

const http = ky.create({
	baseUrl: appOrigin,
	prefix: '/api',
	headers: {
		accept: 'application/json',
	},
	timeout: 30_000,
	totalTimeout: 90_000,
	retry: {
		jitter: true,
		limit: 2,
		maxRetryAfter: 30_000,
		methods: ['get'],
		retryOnTimeout: true,
		statusCodes: [408, 429, 500, 502, 503, 504],
	},
});

type JsonBody<TResponse> = TResponse extends {
	content: { 'application/json': infer Body };
}
	? Body
	: never;

type SuccessBody<TOperation> = TOperation extends { responses: infer TResponses }
	? TResponses extends { 200: infer TResponse }
		? JsonBody<TResponse>
		: TResponses extends { 201: infer TResponse }
			? JsonBody<TResponse>
			: never
	: never;

type RequestBody<TOperation> = TOperation extends {
	requestBody: { content: { 'application/json': infer Body } };
}
	? Body
	: never;

type MeResponse = SuccessBody<paths['/api/v1/me']['get']>;
type PartiesResponse = SuccessBody<paths['/api/v1/parties']['get']>;
type CharacterResponse = SuccessBody<paths['/api/v1/me/character']['get']>;
type CharacterCreationResponse = SuccessBody<paths['/api/v1/me/character-creation']['post']>;
type CharacterAnswerResponse = SuccessBody<paths['/api/v1/me/character-creation/answers']['post']>;
type CharacterCommitResponse = SuccessBody<paths['/api/v1/me/character']['post']>;
type PartyResponse = SuccessBody<paths['/api/v1/parties/{partyId}']['get']>;
type PartyRosterResponse = SuccessBody<paths['/api/v1/parties/{partyId}/roster']['get']>;
type PartyRecapResponse = SuccessBody<paths['/api/v1/parties/{partyId}/recap']['get']>;
type CreatePartyResponse = SuccessBody<paths['/api/v1/parties']['post']>;
type JoinPartyResponse = SuccessBody<paths['/api/v1/party-memberships']['post']>;
type MapResponse = SuccessBody<paths['/api/v1/parties/{partyId}/map']['get']>;
type EnterLocationResponse = SuccessBody<paths['/api/v1/parties/{partyId}/locations/{locationId}/enter']['post']>;
type AdventureResponse = SuccessBody<paths['/api/v1/parties/{partyId}/adventure']['get']>;
type DailyProgressResponse = SuccessBody<paths['/api/v1/parties/{partyId}/progress']['get']>;
type VotesResponse = SuccessBody<paths['/api/v1/parties/{partyId}/branch-votes/{nodeId}']['get']>;
type CastVoteResponse = SuccessBody<paths['/api/v1/parties/{partyId}/branch-votes/{nodeId}']['put']>;
type EventResponse = SuccessBody<paths['/api/v1/parties/{partyId}/event']['get']>;
type ChooseEventResponse = SuccessBody<paths['/api/v1/parties/{partyId}/event/choices/me']['put']>;
type InviteResponse = SuccessBody<paths['/api/v1/parties/{partyId}/invites']['post']>;
type ProgressResponse = SuccessBody<paths['/api/v1/me/progress/{localDate}']['get']>;
type HealthStatusResponse = SuccessBody<paths['/api/v1/me/health']['get']>;
type HealthSyncResponse = SuccessBody<paths['/api/v1/me/health/sync']['post']>;
type UserProgressionResponse = SuccessBody<paths['/api/v1/me/progression']['get']>;
type InventoryResponse = SuccessBody<paths['/api/v1/me/inventory']['get']>;
type LoadoutResponse = SuccessBody<paths['/api/v1/me/loadout']['get']>;
type VillageResponse = SuccessBody<paths['/api/v1/parties/{partyId}/village']['get']>;
type VillagePurchaseResponse = SuccessBody<paths['/api/v1/parties/{partyId}/village/purchases']['post']>;
type VillageInnRecoveryResponse = SuccessBody<paths['/api/v1/parties/{partyId}/village/inn']['post']>;
type VillageDepartureResponse = SuccessBody<paths['/api/v1/parties/{partyId}/village/departures']['post']>;
type EncounterResponse = SuccessBody<paths['/api/v1/parties/{partyId}/encounter']['get']>;
type PartyItemUseResponse = SuccessBody<paths['/api/v1/parties/{partyId}/item-uses']['post']>;
type PartyProgressionResponse = SuccessBody<paths['/api/v1/parties/{partyId}/progression']['get']>;
type HealthSyncBody = RequestBody<paths['/api/v1/me/health/sync']['post']>;
type PreferencesBody = RequestBody<paths['/api/v1/me']['patch']>;
type VillagePurchaseBody = RequestBody<paths['/api/v1/parties/{partyId}/village/purchases']['post']>;
type EncounterPlanBody = RequestBody<paths['/api/v1/parties/{partyId}/encounter/plan/me']['put']>;
type PartyItemUseBody = RequestBody<paths['/api/v1/parties/{partyId}/item-uses']['post']>;
type LeaderTransferBody = RequestBody<paths['/api/v1/parties/{partyId}/leader']['put']>;
type LoadoutSlot = paths['/api/v1/me/loadout/{slot}']['put']['parameters']['path']['slot'];
type PartyProgressionQuery = NonNullable<paths['/api/v1/parties/{partyId}/progression']['get']['parameters']['query']>;

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

function errorMessage(value: unknown) {
	if (typeof value === 'object' && value !== null) {
		for (const property of ['detail', 'error', 'title']) {
			const message = Reflect.get(value, property);
			if (typeof message === 'string' && message.length > 0) return message;
		}
	}

	return 'The request could not be completed.';
}

function toApiError(error: unknown): ApiError {
	if (error instanceof ApiError) return error;
	if (isHTTPError(error)) return new ApiError(errorMessage(error.data), error.response.status);
	return new ApiError('Network request failed. Check your connection and try again.', 0);
}

async function requestJson<T>(input: string, options?: Options): Promise<T> {
	try {
		return await http(input, options).json<T>();
	} catch (error) {
		throw toApiError(error);
	}
}

async function requestVoid(input: string, options?: Options): Promise<void> {
	try {
		await http(input, options);
	} catch (error) {
		throw toApiError(error);
	}
}

function partyPath(partyId: string, suffix = '') {
	return `v1/parties/${encodeURIComponent(partyId)}${suffix}`;
}

export const getMe = () => requestJson<MeResponse>('v1/me');

export const getParties = () => requestJson<PartiesResponse>('v1/parties');

export const getCharacter = () => requestJson<CharacterResponse>('v1/me/character');

export const startCharacterCreation = () =>
	requestJson<CharacterCreationResponse>('v1/me/character-creation', {
		method: 'post',
	});

export const resetCharacterCreation = () => requestVoid('v1/me/character-creation', { method: 'delete' });

export const answerCharacter = (questionId: string, answerId: string) =>
	requestJson<CharacterAnswerResponse>('v1/me/character-creation/answers', {
		method: 'post',
		json: { questionId, answerId },
	});

export const commitCharacter = (name: string) =>
	requestJson<CharacterCommitResponse>('v1/me/character', {
		method: 'post',
		json: { name },
	});

export const createParty = (name: string) =>
	requestJson<CreatePartyResponse>('v1/parties', {
		method: 'post',
		json: { name },
	});

export const joinParty = (inviteToken: string) =>
	requestJson<JoinPartyResponse>('v1/party-memberships', {
		method: 'post',
		json: { inviteToken },
	});

export const getParty = (partyId: string) => requestJson<PartyResponse>(partyPath(partyId));

export const getPartyRoster = (partyId: string) => requestJson<PartyRosterResponse>(partyPath(partyId, '/roster'));

export const getPartyRecap = (partyId: string) => requestJson<PartyRecapResponse>(partyPath(partyId, '/recap'));

export const getMap = (partyId: string) => requestJson<MapResponse>(partyPath(partyId, '/map'));

export const enterLocation = (partyId: string, locationId: string) =>
	requestJson<EnterLocationResponse>(partyPath(partyId, `/locations/${encodeURIComponent(locationId)}/enter`), {
		method: 'post',
	});

type DungeonWalkResponse = SuccessBody<paths['/api/v1/parties/{partyId}/dungeon/walk']['post']>;
type DungeonNavigationResponse = SuccessBody<paths['/api/v1/parties/{partyId}/dungeon/navigator/claim']['post']>;
type DungeonReleaseNavigationResponse = SuccessBody<paths['/api/v1/parties/{partyId}/dungeon/navigator/release']['post']>;
type DungeonNavigatorTransferBody = RequestBody<paths['/api/v1/parties/{partyId}/dungeon/navigator']['put']>;
type DungeonRoutePolicyBody = RequestBody<paths['/api/v1/parties/{partyId}/dungeon/route-votes']['put']>;
type DungeonRouteNavigationResponse = SuccessBody<paths['/api/v1/parties/{partyId}/dungeon/route-votes']['put']>;

export const walkDungeon = (partyId: string, input: RequestBody<paths['/api/v1/parties/{partyId}/dungeon/walk']['post']>) =>
	requestJson<DungeonWalkResponse>(partyPath(partyId, '/dungeon/walk'), { method: 'post', json: input });

export const claimDungeonNavigator = (partyId: string) =>
	requestJson<DungeonNavigationResponse>(partyPath(partyId, '/dungeon/navigator/claim'), {
		method: 'post',
	});

export const releaseDungeonNavigator = (partyId: string) =>
	requestJson<DungeonReleaseNavigationResponse>(partyPath(partyId, '/dungeon/navigator/release'), {
		method: 'post',
	});

export const transferDungeonNavigator = (partyId: string, body: DungeonNavigatorTransferBody) =>
	requestJson<DungeonNavigationResponse>(partyPath(partyId, '/dungeon/navigator'), {
		method: 'put',
		json: body,
	});

export const voteDungeonRoute = (partyId: string, body: DungeonRoutePolicyBody) =>
	requestJson<DungeonRouteNavigationResponse>(partyPath(partyId, '/dungeon/route-votes'), {
		method: 'put',
		json: body,
	});

export const setDungeonRouteIntent = (partyId: string, body: DungeonRoutePolicyBody) =>
	requestJson<DungeonRouteNavigationResponse>(partyPath(partyId, '/dungeon/route-intent'), {
		method: 'put',
		json: body,
	});

export const clearDungeonRouteIntent = (partyId: string) =>
	requestJson<DungeonRouteNavigationResponse>(partyPath(partyId, '/dungeon/route-intent'), {
		method: 'delete',
	});

export const getAdventure = (partyId: string) => requestJson<AdventureResponse>(partyPath(partyId, '/adventure'));

export const getDailyProgress = (partyId: string) => requestJson<DailyProgressResponse>(partyPath(partyId, '/progress'));

export const getVotes = (partyId: string, nodeId: string) =>
	requestJson<VotesResponse>(partyPath(partyId, `/branch-votes/${encodeURIComponent(nodeId)}`));

export const castVote = (partyId: string, nodeId: string, edgeId: string) =>
	requestJson<CastVoteResponse>(partyPath(partyId, `/branch-votes/${encodeURIComponent(nodeId)}`), {
		method: 'put',
		json: { edgeId },
	});

export const getEvent = (partyId: string) => requestJson<EventResponse>(partyPath(partyId, '/event'));

export const chooseEvent = (partyId: string, choiceKey: string) =>
	requestJson<ChooseEventResponse>(partyPath(partyId, '/event/choices/me'), {
		method: 'put',
		json: { choiceKey },
	});

export const createInvite = (partyId: string) =>
	requestJson<InviteResponse>(partyPath(partyId, '/invites'), {
		method: 'post',
	});

export const getProgress = (localDate: string) => requestJson<ProgressResponse>(`v1/me/progress/${encodeURIComponent(localDate)}`);

export const getHealthStatus = () => requestJson<HealthStatusResponse>('v1/me/health');

export const syncHealth = (body: HealthSyncBody = {}) =>
	requestJson<HealthSyncResponse>('v1/me/health/sync', {
		method: 'post',
		json: body,
	});

export const updatePreferences = (body: PreferencesBody) =>
	requestJson<MeResponse>('v1/me', {
		method: 'patch',
		json: body,
	});

export const getProgression = () => requestJson<UserProgressionResponse>('v1/me/progression');

export const getInventory = () => requestJson<InventoryResponse>('v1/me/inventory');

export const getLoadout = () => requestJson<LoadoutResponse>('v1/me/loadout');

export const equipLoadout = (slot: LoadoutSlot, catalogKey: string) =>
	requestJson<LoadoutResponse>(`v1/me/loadout/${slot}`, {
		method: 'put',
		json: { catalogKey },
	});

export const unequipLoadout = (slot: LoadoutSlot) => requestVoid(`v1/me/loadout/${slot}`, { method: 'delete' });

export const getVillage = (partyId: string) => requestJson<VillageResponse>(partyPath(partyId, '/village'));

export const purchaseVillage = (partyId: string, body: VillagePurchaseBody) =>
	requestJson<VillagePurchaseResponse>(partyPath(partyId, '/village/purchases'), {
		method: 'post',
		json: body,
	});

export const recoverAtVillageInn = (partyId: string) =>
	requestJson<VillageInnRecoveryResponse>(partyPath(partyId, '/village/inn'), {
		method: 'post',
	});

export const startVillageDeparture = (partyId: string) =>
	requestJson<VillageDepartureResponse>(partyPath(partyId, '/village/departures'), {
		method: 'post',
	});

export const getEncounter = (partyId: string) => requestJson<EncounterResponse>(partyPath(partyId, '/encounter'));

export const setEncounterPlan = (partyId: string, body: EncounterPlanBody) =>
	requestJson<EncounterResponse>(partyPath(partyId, '/encounter/plan/me'), {
		method: 'put',
		json: body,
	});

export const partyItemUse = (partyId: string, body: PartyItemUseBody) =>
	requestJson<PartyItemUseResponse>(partyPath(partyId, '/item-uses'), {
		method: 'post',
		json: body,
	});

export const getPartyProgression = (partyId: string, query?: PartyProgressionQuery) => {
	const searchParams = new URLSearchParams();
	if (query?.limit !== undefined) searchParams.set('limit', String(query.limit));
	if (query?.cursor) searchParams.set('cursor', query.cursor);

	return requestJson<PartyProgressionResponse>(partyPath(partyId, '/progression'), {
		searchParams,
	});
};

export const leaveParty = (partyId: string) => requestVoid(partyPath(partyId, '/members/me'), { method: 'delete' });

export const kickMember = (partyId: string, memberUserId: string) =>
	requestJson<PartyResponse>(partyPath(partyId, `/members/${encodeURIComponent(memberUserId)}`), {
		method: 'delete',
	});

export const transferLeadership = (partyId: string, body: LeaderTransferBody) =>
	requestJson<PartyResponse>(partyPath(partyId, '/leader'), {
		method: 'put',
		json: body,
	});

export const revokeInvite = (partyId: string, inviteId: string) =>
	requestVoid(partyPath(partyId, `/invites/${encodeURIComponent(inviteId)}`), { method: 'delete' });

export type User = MeResponse;
export type Party = PartyResponse;
export type PartyRoster = PartyRosterResponse;
export type PartyRecap = Exclude<PartyRecapResponse, null>;
export type PartyMap = MapResponse;
export type EnterLocation = EnterLocationResponse;
export type DungeonWalk = DungeonWalkResponse;
export type DungeonWalkInput = Parameters<typeof walkDungeon>[1];
export type DungeonNavigation = DungeonNavigationResponse;
export type DungeonNavigatorTransferInput = DungeonNavigatorTransferBody;
export type DungeonRoutePolicyInput = DungeonRoutePolicyBody;
export type Adventure = AdventureResponse;
export type Character = CharacterResponse;
export type CharacterCreation = CharacterCreationResponse;
export type CharacterPreview = Extract<CharacterCreation, { status: 'ready' }>['preview'];
export type DailyProgress = DailyProgressResponse;
export type PartyVotes = VotesResponse;
export type PartyEvent = EventResponse;
export type Invite = InviteResponse;
export type Progress = ProgressResponse;
export type HealthStatus = HealthStatusResponse;
export type HealthSync = HealthSyncResponse;
export type HealthSyncInput = HealthSyncBody;
export type PreferencesInput = PreferencesBody;
export type UserProgression = UserProgressionResponse;
export type Inventory = InventoryResponse;
export type Loadout = LoadoutResponse;
export type EquipmentSlot = LoadoutSlot;
export type Village = VillageResponse;
export type VillagePurchase = VillagePurchaseResponse;
export type VillagePurchaseInput = VillagePurchaseBody;
export type VillageInnRecovery = VillageInnRecoveryResponse;
export type VillageDeparture = VillageDepartureResponse;
export type Encounter = EncounterResponse;
export type EncounterPlanInput = EncounterPlanBody;
export type PartyItemUse = PartyItemUseResponse;
export type PartyItemUseInput = PartyItemUseBody;
export type PartyProgression = PartyProgressionResponse;
