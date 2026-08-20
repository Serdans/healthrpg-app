import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	answerCharacter,
	castVote,
	chooseEvent,
	commitCharacter,
	createInvite,
	createParty,
	getCharacter,
	getDailyProgress,
	getEvent,
	getMap,
	getParty,
	getParties,
	getVotes,
	joinParty,
} from './api';

export const queryKeys = {
	character: ['character'] as const,
	characterCreation: ['character-creation'] as const,
	parties: ['parties'] as const,
	party: (partyId: string) => ['party', partyId] as const,
	map: (partyId: string) => ['party-map', partyId] as const,
	daily: (partyId: string) => ['party-daily', partyId] as const,
	votes: (partyId: string, nodeId: string) => ['party-votes', partyId, nodeId] as const,
	event: (partyId: string) => ['party-event', partyId] as const,
};

export function useCharacter() {
	return useQuery({ queryKey: queryKeys.character, queryFn: getCharacter });
}

export function useParties() {
	return useQuery({ queryKey: queryKeys.parties, queryFn: getParties });
}

export function useParty(partyId: string) {
	return useQuery({ queryKey: queryKeys.party(partyId), queryFn: () => getParty(partyId) });
}

export function usePartyMap(partyId: string) {
	return useQuery({ queryKey: queryKeys.map(partyId), queryFn: () => getMap(partyId) });
}

export function useDailyProgress(partyId: string) {
	return useQuery({ queryKey: queryKeys.daily(partyId), queryFn: () => getDailyProgress(partyId) });
}

export function usePartyVotes(partyId: string, nodeId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.votes(partyId, nodeId),
		queryFn: () => getVotes(partyId, nodeId),
		enabled,
		retry: false,
	});
}

export function usePartyEvent(partyId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.event(partyId),
		queryFn: () => getEvent(partyId),
		enabled,
		retry: false,
	});
}

export function useCharacterAnswer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ questionId, answerId }: { questionId: string; answerId: string }) => answerCharacter(questionId, answerId),
		onSuccess: (creation) => {
			queryClient.setQueryData(queryKeys.characterCreation, creation);
		},
	});
}

export function useCommitCharacter() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => commitCharacter(name),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.character });
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useCreateParty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => createParty(name),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useJoinParty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (inviteToken: string) => joinParty(inviteToken),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useCreateInvite(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => createInvite(partyId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
		},
	});
}

export function useCastVote(partyId: string, nodeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (edgeId: string) => castVote(partyId, nodeId, edgeId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.votes(partyId, nodeId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
		},
	});
}

export function useChooseEvent(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (choiceKey: string) => chooseEvent(partyId, choiceKey),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.event(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
		},
	});
}
