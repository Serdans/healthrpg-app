import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
	answerCharacter,
	castVote,
	chooseEvent,
	commitCharacter,
	createInvite,
	createParty,
	equipLoadout,
	enterLocation,
	getEncounter,
	getCharacter,
	getAdventure,
	getDailyProgress,
	getEvent,
	getHealthStatus,
	getInventory,
	getLoadout,
	getMap,
	getMe,
	getParty,
	getPartyRoster,
	getPartyRecap,
	getPartyProgression,
	getParties,
	getProgress,
	getProgression,
	getVotes,
	getVillage,
	joinParty,
	kickMember,
	leaveParty,
	purchaseVillage,
	resetCharacterCreation,
	revokeInvite,
	setEncounterAction,
	startVillageDeparture,
	syncHealth,
	transferLeadership,
	unequipLoadout,
	updatePreferences,
	usePartyItem,
} from './api';

const partyRefreshInterval = 15_000;
const decisionRefreshInterval = 10_000;
const villageRefreshInterval = 30_000;

export const queryKeys = {
	me: ['me'] as const,
	character: ['character'] as const,
	characterCreation: ['character-creation'] as const,
	parties: ['parties'] as const,
	progressRoot: ['progress'] as const,
	progress: (localDate: string) => ['progress', localDate] as const,
	healthStatus: ['health-status'] as const,
	progression: ['progression'] as const,
	inventory: ['inventory'] as const,
	loadout: ['loadout'] as const,
	party: (partyId: string) => ['party', partyId] as const,
	partyRoster: (partyId: string) => ['party-roster', partyId] as const,
	partyRecap: (partyId: string) => ['party-recap', partyId] as const,
	map: (partyId: string) => ['party-map', partyId] as const,
	adventure: (partyId: string) => ['party-adventure', partyId] as const,
	dailyRoot: ['party-daily'] as const,
	daily: (partyId: string) => ['party-daily', partyId] as const,
	votes: (partyId: string, nodeId: string) => ['party-votes', partyId, nodeId] as const,
	event: (partyId: string) => ['party-event', partyId] as const,
	village: (partyId: string) => ['party-village', partyId] as const,
	encounter: (partyId: string) => ['party-encounter', partyId] as const,
	partyProgressionRoot: (partyId: string) => ['party-progression', partyId] as const,
	partyProgression: (partyId: string, cursor?: string) => ['party-progression', partyId, cursor ?? 'first'] as const,
};

export function useCharacter() {
	return useQuery({ queryKey: queryKeys.character, queryFn: getCharacter });
}

export function useMe() {
	return useQuery({ queryKey: queryKeys.me, queryFn: getMe });
}

export function useProgress(localDate: string, enabled = true, refetchInterval: number | false = false) {
	return useQuery({
		queryKey: queryKeys.progress(localDate),
		queryFn: () => getProgress(localDate),
		enabled,
		refetchInterval,
		refetchIntervalInBackground: false,
	});
}

export function useHealthStatus(refetchInterval: number | false = false) {
	return useQuery({
		queryKey: queryKeys.healthStatus,
		queryFn: getHealthStatus,
		refetchInterval,
		refetchIntervalInBackground: false,
	});
}

export function useProgression() {
	return useQuery({ queryKey: queryKeys.progression, queryFn: getProgression });
}

export function useInventory() {
	return useQuery({ queryKey: queryKeys.inventory, queryFn: getInventory });
}

export function useLoadout() {
	return useQuery({ queryKey: queryKeys.loadout, queryFn: getLoadout });
}

export function useParties() {
	return useQuery({ queryKey: queryKeys.parties, queryFn: getParties });
}

export function useParty(partyId: string) {
	return useQuery({
		queryKey: queryKeys.party(partyId),
		queryFn: () => getParty(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function usePartyRoster(partyId: string, enabled = true) {
	return useQuery({
		queryKey: queryKeys.partyRoster(partyId),
		queryFn: () => getPartyRoster(partyId),
		enabled: enabled && Boolean(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function usePartyRecap(partyId: string) {
	return useQuery({
		queryKey: queryKeys.partyRecap(partyId),
		queryFn: () => getPartyRecap(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function usePartyMap(partyId: string) {
	return useQuery({
		queryKey: queryKeys.map(partyId),
		queryFn: () => getMap(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function useEnterLocation(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (locationId: string) => enterLocation(partyId, locationId),
		onSuccess: (party) => {
			queryClient.setQueryData(queryKeys.party(partyId), party);
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.event(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.village(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.encounter(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.votes(partyId, party.currentNode.id) });
		},
	});
}

export function useAdventure(partyId: string) {
	return useQuery({
		queryKey: queryKeys.adventure(partyId),
		queryFn: () => getAdventure(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function useDailyProgress(partyId: string) {
	return useQuery({
		queryKey: queryKeys.daily(partyId),
		queryFn: () => getDailyProgress(partyId),
		refetchInterval: partyRefreshInterval,
		refetchIntervalInBackground: false,
	});
}

export function usePartyVotes(partyId: string, nodeId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.votes(partyId, nodeId),
		queryFn: () => getVotes(partyId, nodeId),
		enabled,
		retry: false,
		refetchInterval: enabled ? decisionRefreshInterval : false,
		refetchIntervalInBackground: false,
	});
}

export function usePartyEvent(partyId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.event(partyId),
		queryFn: () => getEvent(partyId),
		enabled,
		retry: false,
		refetchInterval: enabled ? decisionRefreshInterval : false,
		refetchIntervalInBackground: false,
	});
}

export function useVillage(partyId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.village(partyId),
		queryFn: () => getVillage(partyId),
		enabled,
		retry: false,
		refetchInterval: enabled ? villageRefreshInterval : false,
		refetchIntervalInBackground: false,
	});
}

export function useEncounter(partyId: string, enabled: boolean) {
	return useQuery({
		queryKey: queryKeys.encounter(partyId),
		queryFn: () => getEncounter(partyId),
		enabled,
		retry: false,
		refetchInterval: enabled ? decisionRefreshInterval : false,
		refetchIntervalInBackground: false,
	});
}

export function usePartyProgression(partyId: string, cursor?: string) {
	return useQuery({
		queryKey: queryKeys.partyProgression(partyId, cursor),
		queryFn: () => getPartyProgression(partyId, { limit: 20, cursor }),
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

export function useResetCharacterCreation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: resetCharacterCreation,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.characterCreation });
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

export function useSyncHealth() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: syncHealth,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.healthStatus });
			void queryClient.invalidateQueries({ queryKey: queryKeys.progressRoot });
			void queryClient.invalidateQueries({ queryKey: queryKeys.dailyRoot });
		},
	});
}

export function useUpdatePreferences() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (timezone: string) => updatePreferences({ timezone }),
		onSuccess: (user) => {
			queryClient.setQueryData(queryKeys.me, user);
			void queryClient.invalidateQueries({ queryKey: queryKeys.progressRoot });
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

export function usePurchaseVillage(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ catalogKey, quantity }: { catalogKey: string; quantity: number }) => purchaseVillage(partyId, { catalogKey, quantity }),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.village(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
			void queryClient.invalidateQueries({ queryKey: queryKeys.loadout });
		},
	});
}

export function useStartVillageDeparture(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => startVillageDeparture(partyId),
		onSuccess: (vote) => {
			queryClient.setQueryData(queryKeys.votes(partyId, vote.nodeId), vote);
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.adventure(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
		},
	});
}

export function useSetEncounterAction(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: setEncounterAction.bind(null, partyId),
		onSuccess: (encounter) => {
			queryClient.setQueryData(queryKeys.encounter(partyId), encounter);
			void queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.adventure(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
		},
	});
}

export function useUsePartyItem(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: usePartyItem.bind(null, partyId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
			void queryClient.invalidateQueries({ queryKey: queryKeys.encounter(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.partyRoster(partyId) });
		},
	});
}

export function useEquipLoadout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ slot, catalogKey }: { slot: Parameters<typeof equipLoadout>[0]; catalogKey: string }) => equipLoadout(slot, catalogKey),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.loadout });
			void queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
		},
	});
}

export function useUnequipLoadout() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (slot: Parameters<typeof unequipLoadout>[0]) => unequipLoadout(slot),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.loadout });
			void queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
		},
	});
}

export function useLeaveParty() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: leaveParty,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useKickMember(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (memberUserId: string) => kickMember(partyId, memberUserId),
		onSuccess: (party) => {
			queryClient.setQueryData(queryKeys.party(partyId), party);
			void queryClient.invalidateQueries({ queryKey: queryKeys.partyRoster(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useTransferLeadership(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (targetUserId: string) => transferLeadership(partyId, { targetUserId }),
		onSuccess: (party) => {
			queryClient.setQueryData(queryKeys.party(partyId), party);
			void queryClient.invalidateQueries({ queryKey: queryKeys.partyRoster(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.parties });
		},
	});
}

export function useRevokeInvite(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (inviteId: string) => revokeInvite(partyId, inviteId),
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
		},
	});
}

export function useCastVote(partyId: string, nodeId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (edgeId: string) => castVote(partyId, nodeId, edgeId),
		onSuccess: (vote) => {
			queryClient.setQueryData(queryKeys.votes(partyId, nodeId), vote);
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.adventure(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.votes(partyId, nodeId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
		},
	});
}

export function useChooseEvent(partyId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (choiceKey: string) => chooseEvent(partyId, choiceKey),
		onSuccess: (event) => {
			queryClient.setQueryData(queryKeys.event(partyId), event);
			void queryClient.invalidateQueries({ queryKey: queryKeys.event(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.party(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.map(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.adventure(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.daily(partyId) });
			void queryClient.invalidateQueries({ queryKey: queryKeys.partyProgressionRoot(partyId) });
		},
	});
}
