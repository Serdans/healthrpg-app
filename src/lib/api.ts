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

type MeResponse = SuccessBody<paths['/v1/me']['get']>;
type PartiesResponse = SuccessBody<paths['/v1/me/parties']['get']>;
type CharacterResponse = SuccessBody<paths['/v1/me/character']['get']>;
type CharacterCreationResponse = SuccessBody<paths['/v1/me/character/creation']['post']>;
type CharacterAnswerResponse = SuccessBody<paths['/v1/me/character/creation/answer']['post']>;
type CharacterCommitResponse = SuccessBody<paths['/v1/me/character/creation/commit']['post']>;
type PartyResponse = SuccessBody<paths['/v1/parties/{partyId}']['get']>;
type CreatePartyResponse = SuccessBody<paths['/v1/parties']['post']>;
type JoinPartyResponse = SuccessBody<paths['/v1/parties/join']['post']>;
type MapResponse = SuccessBody<paths['/v1/parties/{partyId}/map']['get']>;
type DailyProgressResponse = SuccessBody<paths['/v1/parties/{partyId}/daily-progress']['get']>;
type VotesResponse = SuccessBody<paths['/v1/parties/{partyId}/votes/{nodeId}']['get']>;
type CastVoteResponse = SuccessBody<paths['/v1/parties/{partyId}/votes']['post']>;
type EventResponse = SuccessBody<paths['/v1/parties/{partyId}/event']['get']>;
type ChooseEventResponse = SuccessBody<paths['/v1/parties/{partyId}/event/choice']['put']>;
type InviteResponse = SuccessBody<paths['/v1/parties/{partyId}/invites']['post']>;
type ProgressResponse = SuccessBody<paths['/v1/progress/{localDate}']['get']>;
type HealthStatusResponse = SuccessBody<paths['/v1/health/status']['get']>;
type HealthSyncResponse = SuccessBody<paths['/v1/health/sync']['post']>;
type UserProgressionResponse = SuccessBody<paths['/v1/me/progression']['get']>;
type InventoryResponse = SuccessBody<paths['/v1/me/inventory']['get']>;
type LoadoutResponse = SuccessBody<paths['/v1/me/loadout']['get']>;
type VillageResponse = SuccessBody<paths['/v1/parties/{partyId}/village']['get']>;
type VillagePurchaseResponse = SuccessBody<paths['/v1/parties/{partyId}/village/purchase']['post']>;
type VillageDepartureResponse = SuccessBody<paths['/v1/parties/{partyId}/village/departure']['post']>;
type EncounterResponse = SuccessBody<paths['/v1/parties/{partyId}/encounter']['get']>;
type PartyItemUseResponse = SuccessBody<paths['/v1/parties/{partyId}/items/use']['post']>;
type PartyProgressionResponse = SuccessBody<paths['/v1/parties/{partyId}/progression']['get']>;
type HealthSyncBody = RequestBody<paths['/v1/health/sync']['post']>;
type PreferencesBody = RequestBody<paths['/v1/me/preferences']['patch']>;
type VillagePurchaseBody = RequestBody<paths['/v1/parties/{partyId}/village/purchase']['post']>;
type EncounterActionBody = RequestBody<paths['/v1/parties/{partyId}/encounter/action']['put']>;
type PartyItemUseBody = RequestBody<paths['/v1/parties/{partyId}/items/use']['post']>;
type LeaderTransferBody = RequestBody<paths['/v1/parties/{partyId}/leader']['put']>;
type LoadoutSlot = paths['/v1/me/loadout/{slot}']['put']['parameters']['path']['slot'];
type PartyProgressionQuery = NonNullable<paths['/v1/parties/{partyId}/progression']['get']['parameters']['query']>;

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
		const message = Reflect.get(value, 'error');
		if (typeof message === 'string' && message.length > 0) return message;
	}

	return 'The request could not be completed.';
}

async function requestJson<T>(input: string, options?: Options): Promise<T> {
	try {
		return await http(input, options).json<T>();
	} catch (error) {
		if (isHTTPError(error)) {
			throw new ApiError(errorMessage(error.data), error.response.status);
		}

		throw new ApiError('Network request failed. Check your connection and try again.', 0);
	}
}

async function requestVoid(input: string, options?: Options): Promise<void> {
	try {
		await http(input, options);
	} catch (error) {
		if (isHTTPError(error)) {
			throw new ApiError(errorMessage(error.data), error.response.status);
		}

		throw new ApiError('Network request failed. Check your connection and try again.', 0);
	}
}

function partyPath(partyId: string, suffix = '') {
	return `v1/parties/${encodeURIComponent(partyId)}${suffix}`;
}

export const getMe = () => requestJson<MeResponse>('v1/me');

export const getParties = () => requestJson<PartiesResponse>('v1/me/parties');

export const getCharacter = () => requestJson<CharacterResponse>('v1/me/character');

export const startCharacterCreation = () =>
	requestJson<CharacterCreationResponse>('v1/me/character/creation', {
		method: 'post',
	});

export const resetCharacterCreation = () => requestVoid('v1/me/character/creation', { method: 'delete' });

export const answerCharacter = (questionId: string, answerId: string) =>
	requestJson<CharacterAnswerResponse>('v1/me/character/creation/answer', {
		method: 'post',
		json: { questionId, answerId },
	});

export const commitCharacter = (name: string) =>
	requestJson<CharacterCommitResponse>('v1/me/character/creation/commit', {
		method: 'post',
		json: { name },
	});

export const createParty = (name: string) =>
	requestJson<CreatePartyResponse>('v1/parties', {
		method: 'post',
		json: { name },
	});

export const joinParty = (inviteToken: string) =>
	requestJson<JoinPartyResponse>('v1/parties/join', {
		method: 'post',
		json: { inviteToken },
	});

export const getParty = (partyId: string) => requestJson<PartyResponse>(partyPath(partyId));

export const getMap = (partyId: string) => requestJson<MapResponse>(partyPath(partyId, '/map'));

export const getDailyProgress = (partyId: string) => requestJson<DailyProgressResponse>(partyPath(partyId, '/daily-progress'));

export const getVotes = (partyId: string, nodeId: string) =>
	requestJson<VotesResponse>(partyPath(partyId, `/votes/${encodeURIComponent(nodeId)}`));

export const castVote = (partyId: string, nodeId: string, edgeId: string) =>
	requestJson<CastVoteResponse>(partyPath(partyId, '/votes'), {
		method: 'post',
		json: { nodeId, edgeId },
	});

export const getEvent = (partyId: string) => requestJson<EventResponse>(partyPath(partyId, '/event'));

export const chooseEvent = (partyId: string, choiceKey: string) =>
	requestJson<ChooseEventResponse>(partyPath(partyId, '/event/choice'), {
		method: 'put',
		json: { choiceKey },
	});

export const createInvite = (partyId: string) =>
	requestJson<InviteResponse>(partyPath(partyId, '/invites'), {
		method: 'post',
	});

export const getProgress = (localDate: string) => requestJson<ProgressResponse>(`v1/progress/${encodeURIComponent(localDate)}`);

export const getHealthStatus = () => requestJson<HealthStatusResponse>('v1/health/status');

export const syncHealth = (body: HealthSyncBody = {}) =>
	requestJson<HealthSyncResponse>('v1/health/sync', {
		method: 'post',
		json: body,
	});

export const updatePreferences = (body: PreferencesBody) =>
	requestJson<MeResponse>('v1/me/preferences', {
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
	requestJson<VillagePurchaseResponse>(partyPath(partyId, '/village/purchase'), {
		method: 'post',
		json: body,
	});

export const startVillageDeparture = (partyId: string) =>
	requestJson<VillageDepartureResponse>(partyPath(partyId, '/village/departure'), {
		method: 'post',
	});

export const getEncounter = (partyId: string) => requestJson<EncounterResponse>(partyPath(partyId, '/encounter'));

export const setEncounterAction = (partyId: string, body: EncounterActionBody) =>
	requestJson<EncounterResponse>(partyPath(partyId, '/encounter/action'), {
		method: 'put',
		json: body,
	});

export const usePartyItem = (partyId: string, body: PartyItemUseBody) =>
	requestJson<PartyItemUseResponse>(partyPath(partyId, '/items/use'), {
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

export const leaveParty = (partyId: string) => requestVoid(partyPath(partyId, '/membership'), { method: 'delete' });

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
export type PartyMap = MapResponse;
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
export type VillageDeparture = VillageDepartureResponse;
export type Encounter = EncounterResponse;
export type EncounterActionInput = EncounterActionBody;
export type PartyItemUse = PartyItemUseResponse;
export type PartyItemUseInput = PartyItemUseBody;
export type PartyProgression = PartyProgressionResponse;
