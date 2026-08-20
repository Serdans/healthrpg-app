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

export type User = MeResponse;
export type Party = PartyResponse;
export type PartyMap = MapResponse;
export type Character = CharacterResponse;
export type CharacterCreation = CharacterCreationResponse;
export type CharacterPreview = Extract<CharacterCreation, { status: 'ready' }>['preview'];
export type DailyProgress = DailyProgressResponse;
export type PartyVotes = VotesResponse;
export type PartyEvent = EventResponse;
