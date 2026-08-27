import { createServer } from 'node:http';

const port = Number(process.env.MOCK_BACKEND_PORT ?? 3010);
const user = {
	id: 'user-1',
	googleSubject: 'google-1',
	email: 'hero@example.com',
	displayName: 'Hero',
	timezone: 'UTC',
};

const initialHealthSync = '2026-01-01T00:00:00.000Z';
const state = {
	scenario: 'branch',
	decisionStartedAt: '2026-08-20T00:00:00.000Z',
	selectedEdgeId: null,
	selectedEventChoice: null,
	eventResolved: false,
	selectedPlan: null,
	lastMutation: { path: null, body: null },
	healthLastSyncAt: initialHealthSync,
	healthSyncReadyAt: null,
	dungeonWalkDelayMs: 0,
	dungeonRejectNext: false,
	walkedTo: null,
	walkCount: 0,
	dungeonDiscovered: new Set(['tile-entry']),
};

function resetState() {
	state.scenario = 'branch';
	state.decisionStartedAt = '2026-08-20T00:00:00.000Z';
	state.selectedEdgeId = null;
	state.selectedEventChoice = null;
	state.eventResolved = false;
	state.selectedPlan = null;
	state.lastMutation = { path: null, body: null };
	state.healthLastSyncAt = initialHealthSync;
	state.healthSyncReadyAt = null;
	state.dungeonWalkDelayMs = 0;
	state.dungeonRejectNext = false;
	state.walkedTo = null;
	state.walkCount = 0;
	state.dungeonDiscovered = new Set(['tile-entry']);
}

function json(response, status = 200) {
	return new Response(JSON.stringify(response), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

async function body(request) {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	const raw = Buffer.concat(chunks).toString('utf8');
	return raw ? JSON.parse(raw) : {};
}

function currentNodeType() {
	if (state.scenario === 'village' || state.scenario === 'village-interior') return 'village';
	if (state.scenario === 'dungeon-grid') return 'travel';
	if (state.scenario === 'combat') return 'combat';
	if (state.scenario === 'event') return 'narrative';
	return 'travel';
}

function dungeonNavigation() {
	return {
		navigatorUserId: 'user-1',
		navigatorDisplayName: 'Hero',
		claimedAt: '2030-01-01T00:00:00.000Z',
		lastActiveAt: '2030-01-01T00:00:00.000Z',
		leaseExpiresAt: '2030-01-01T00:05:00.000Z',
		routeIntent: null,
		routeVotes: [],
	};
}

function party() {
	const insideVillage = state.scenario === 'village-interior';
	return {
		id: 'party-1',
		name: 'Lantern Walkers',
		status: 'active',
		memberCapacity: 6,
		currentNode: {
			id: insideVillage ? 'village-entry' : 'node-1',
			chapterNo: 1,
			regionNo: 1,
			name: insideVillage ? 'Lantern Square' : state.scenario === 'village' ? 'Mossway Village' : 'Mossway Crossing',
			nodeType: currentNodeType(),
			templateKey: `${currentNodeType()}-v1`,
			config: {
				movementCost: 10,
				challengeCost: 0,
				event:
					state.scenario === 'combat'
						? { eventType: 'combat' }
						: state.scenario === 'village' || state.scenario === 'village-interior'
							? { eventType: 'village', settlementKey: 'mossway' }
							: state.scenario === 'event'
								? {
										eventType: 'narrative',
										prompt: 'Which light do you follow?',
										choices: [
											{
												key: 'lantern',
												displayName: 'Follow the lanterns',
												description: 'Take the warm road.',
												requirements: { movementUnits: 0, recoveryPoints: 0 },
											},
											{
												key: 'stars',
												displayName: 'Read the stars',
												description: 'Trust the high path.',
												requirements: { movementUnits: 1, recoveryPoints: 0 },
											},
										],
									}
								: undefined,
			},
		},
		challengeProgress: 0,
		tileBalance: 9,
		decisionStartedAt: state.decisionStartedAt,
		members: [
			{ userId: 'user-1', role: 'leader', displayName: 'Hero' },
			{ userId: 'user-2', role: 'member', displayName: 'Mira' },
		],
	};
}

function partyRoster() {
	return {
		partyId: 'party-1',
		members: [
			{
				userId: 'user-1',
				displayName: 'Hero',
				role: 'leader',
				character: {
					name: 'Hero',
					classKey: 'warrior',
					className: 'Warrior',
					backgroundKey: 'wanderer',
					backgroundName: 'Wanderer',
					stats: { strength: 4, agility: 3, vitality: 4, insight: 2 },
					combatStats: { strength: 5, agility: 3, vitality: 5, insight: 2, defense: 2 },
				},
				progression: { experience: 120, level: 2, nextLevelExperience: 400 },
				health: { currentHealth: 20, maxHealth: 20 },
			},
			{
				userId: 'user-2',
				displayName: 'Mira',
				role: 'member',
				character: {
					name: 'Mira',
					classKey: 'cleric',
					className: 'Cleric',
					backgroundKey: 'caretaker',
					backgroundName: 'Caretaker',
					stats: { strength: 3, agility: 4, vitality: 5, insight: 8 },
					combatStats: { strength: 3, agility: 4, vitality: 5, insight: 8, defense: 1 },
				},
				progression: { experience: 400, level: 3, nextLevelExperience: 900 },
				health: { currentHealth: 38, maxHealth: 50 },
			},
		],
	};
}

function map() {
	if (state.scenario === 'dungeon-grid') {
		const tile = (nodeId, kind, x, y, role, nodeType = 'travel', archetype = null, discovered = true) => {
			const isDiscovered = state.dungeonDiscovered?.has(nodeId) ?? discovered;
			return {
				id: nodeId,
				chapterNo: 1,
				regionNo: 0,
				name: `F1 ${kind.replaceAll('-', ' ')} ${String(x)}:${String(y)}`,
				nodeType,
				templateKey: `dungeon-tile-${kind}-v1`,
				config: { movementCost: 0, challengeCost: 0 },
				adjacent: true,
				mapMetadata: {
					mapId: 'map-dungeon',
					nodeId,
					floorNo: 0,
					role,
					sortOrder: x * 10 + y,
					isEntry: kind === 'entry',
					isExit: false,
					tileX: x,
					tileY: y,
					spawnArchetype: archetype,
				},
				discovered: isDiscovered,
			};
		};
		return {
			currentChapter: 1,
			currentNodeId: state.walkedTo ?? 'tile-entry',
			currentMap: {
				id: 'map-dungeon',
				mapType: 'dungeon',
				name: 'First Ruins',
				templateKey: 'dungeon-v1',
				parentNodeId: 'node-9',
				entryNodeId: 'tile-entry',
			},
			enterableLocation: null,
			objectives: [
				{
					id: 'obj-goal',
					mapId: 'map-dungeon',
					key: 'reach-dungeon-goal',
					type: 'reach-node',
					targetNodeId: 'tile-goal',
					required: true,
					displayName: 'Reach the Memory Well',
					description: 'Delve to the heart of the ruins.',
				},
			],
			completedObjectiveIds: [],
			tileBalance: 9,
			navigation: dungeonNavigation(),
			nodes: [
				tile('tile-entry', 'entry', 2, 2, 'entrance'),
				tile('tile-a', 'floor', 3, 2, 'room'),
				tile('tile-north-a', 'floor', 3, 1, 'room'),
				tile('tile-b', 'floor', 4, 2, 'room'),
				tile('tile-north-b', 'floor', 4, 1, 'room'),
				tile('tile-c', 'floor', 5, 2, 'room'),
				tile('tile-north-c', 'floor', 5, 1, 'room'),
				tile('tile-d', 'floor', 6, 2, 'room'),
				tile('tile-north-d', 'floor', 6, 1, 'room'),
				tile('tile-spawn', 'spawn', 7, 2, 'combat', 'combat', 'slime'),
				tile('tile-north-spawn', 'floor', 7, 1, 'room'),
				tile('tile-south-entry', 'floor', 2, 3, 'room'),
				tile('tile-south-a', 'floor', 3, 3, 'room'),
				tile('tile-south-b', 'floor', 4, 3, 'room'),
				tile('tile-south-c', 'floor', 5, 3, 'room'),
				tile('tile-south-d', 'floor', 6, 3, 'room'),
				tile('tile-south-spawn', 'floor', 7, 3, 'room'),
				tile('tile-treasure', 'treasure', 2, 1, 'treasure'),
				tile('tile-goal', 'goal', 8, 2, 'goal'),
			],
			edges: [],
		};
	}
	if (state.scenario === 'village-interior') {
		const villageMetadata = (nodeId, sortOrder, role, isEntry = false, isExit = false) => ({
			mapId: 'map-village',
			nodeId,
			floorNo: 0,
			role,
			sortOrder,
			isEntry,
			isExit,
		});
		return {
			currentChapter: 1,
			currentNodeId: 'village-entry',
			currentMap: {
				id: 'map-village',
				mapType: 'village',
				name: "Wayfarer's Rest",
				templateKey: 'village-v1',
				parentNodeId: 'node-1',
				entryNodeId: 'village-entry',
			},
			enterableLocation: null,
			objectives: [],
			completedObjectiveIds: [],
			navigation: null,
			nodes: [
				{
					id: 'village-entry',
					chapterNo: 1,
					regionNo: 1,
					name: 'Lantern Square',
					nodeType: 'village',
					templateKey: 'village-hub-v1',
					config: { movementCost: 0, challengeCost: 0, event: { eventType: 'village', settlementKey: 'wayfarers-rest' } },
					discovered: true,
					adjacent: true,
					mapMetadata: villageMetadata('village-entry', 0, 'hub', true),
				},
				{
					id: 'village-market',
					chapterNo: 1,
					regionNo: 1,
					name: 'Lantern Market',
					nodeType: 'village',
					templateKey: 'village-market-v1',
					config: { movementCost: 0, challengeCost: 0, event: { eventType: 'village', settlementKey: 'wayfarers-rest' } },
					discovered: true,
					adjacent: true,
					mapMetadata: villageMetadata('village-market', 1, 'shop'),
				},
				{
					id: 'village-exit',
					chapterNo: 1,
					regionNo: 1,
					name: 'East Road',
					nodeType: 'travel',
					templateKey: 'village-exit-v1',
					config: { movementCost: 0, challengeCost: 0 },
					discovered: true,
					adjacent: true,
					mapMetadata: villageMetadata('village-exit', 2, 'exit', false, true),
				},
			],
			edges: [
				{ id: 'village-edge-market', fromNodeId: 'village-entry', toNodeId: 'village-market', optionKey: 'lantern-market', sortOrder: 0 },
				{ id: 'village-edge-exit', fromNodeId: 'village-entry', toNodeId: 'village-exit', optionKey: 'east-road', sortOrder: 1 },
			],
		};
	}

	const overworldMetadata = (nodeId, sortOrder, role = 'overworld') => ({
		mapId: 'overworld',
		nodeId,
		floorNo: 0,
		role,
		sortOrder,
		isEntry: sortOrder === 0,
		isExit: false,
	});
	return {
		currentChapter: 1,
		currentNodeId: 'node-1',
		currentMap: {
			id: 'overworld',
			mapType: 'overworld',
			name: 'The Atlas',
			templateKey: 'overworld-v1',
			parentNodeId: null,
			entryNodeId: 'node-1',
		},
		enterableLocation:
			state.scenario === 'village'
				? {
						id: 'map-village',
						mapType: 'village',
						name: "Wayfarer's Rest",
						templateKey: 'village-v1',
						parentNodeId: 'node-1',
						entryNodeId: 'village-entry',
					}
				: null,
		objectives: [],
		completedObjectiveIds: [],
		navigation: null,
		nodes: [
			{
				id: 'node-1',
				chapterNo: 1,
				regionNo: 1,
				name: state.scenario === 'village' ? 'Mossway Village' : 'Mossway Crossing',
				nodeType: currentNodeType(),
				templateKey: `${currentNodeType()}-v1`,
				config: {
					movementCost: 10,
					challengeCost: 0,
					event:
						state.scenario === 'combat'
							? { eventType: 'combat' }
							: state.scenario === 'village'
								? { eventType: 'village', settlementKey: 'mossway' }
								: state.scenario === 'event'
									? { eventType: 'narrative', prompt: 'Which light do you follow?', choices: [] }
									: undefined,
				},
				discovered: true,
				adjacent: true,
				mapMetadata: overworldMetadata('node-1', 0, state.scenario === 'village' ? 'entrance' : 'overworld'),
			},
			{
				id: 'node-2',
				chapterNo: 1,
				regionNo: 1,
				name: 'North Lantern Road',
				nodeType: 'travel',
				discovered: true,
				adjacent: true,
				mapMetadata: overworldMetadata('node-2', 1),
			},
			{
				id: 'node-3',
				chapterNo: 1,
				regionNo: 2,
				name: 'Old Stone Road',
				nodeType: 'dungeon',
				discovered: true,
				adjacent: true,
				mapMetadata: overworldMetadata('node-3', 2, 'entrance'),
			},
		],
		edges: [
			{ id: 'edge-1', fromNodeId: 'node-1', toNodeId: 'node-2', optionKey: 'north-lantern-road', sortOrder: 0 },
			{ id: 'edge-2', fromNodeId: 'node-1', toNodeId: 'node-3', optionKey: 'old-stone-road', sortOrder: 1 },
		],
	};
}

function adventure() {
	return {
		partyId: 'party-1',
		currentNodeId: 'node-1',
		land: {
			key: 'mistwood',
			chapterNo: 1,
			displayName: 'The Mistwood Marches',
			description: 'A lantern-lit frontier where every landmark marks a new promise.',
		},
		currentObjective: {
			key: 'mossway-crossing',
			displayName: 'Cross Mossway Crossing',
			description: 'Guide the party through the first stretch of the Marches.',
			landmarkKey: 'mossway-crossing',
		},
		history: [
			{
				landKey: 'mistwood',
				objectiveKey: 'old-gate',
				displayName: 'The Old Gate',
				description: 'The party found the first safe road through the mist.',
				landmarkKey: 'old-gate',
				nodeId: 'node-0',
				completedAt: '2026-08-19T18:30:00.000Z',
			},
		],
	};
}

function voteState() {
	return {
		accepted: true,
		partyId: 'party-1',
		nodeId: 'node-1',
		deadlineAt: '2030-08-20T00:00:00.000Z',
		resolvedEdgeId: null,
		votes: state.selectedEdgeId ? [{ userId: 'user-1', edgeId: state.selectedEdgeId }] : [],
	};
}

function partyEvent() {
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		worldDate: '2026-08-20',
		eventType: 'narrative',
		prompt: 'Which light do you follow?',
		choices: [
			{
				key: 'lantern',
				displayName: 'Follow the lanterns',
				description: 'Take the warm road.',
				requirements: { movementUnits: 0, recoveryPoints: 0 },
			},
			{
				key: 'stars',
				displayName: 'Read the stars',
				description: 'Trust the high path.',
				requirements: { movementUnits: 1, recoveryPoints: 0 },
			},
		],
		selectedChoiceKey: state.selectedEventChoice,
		resolved: state.eventResolved,
		votes: state.selectedEventChoice ? [{ userId: 'user-1', choiceKey: state.selectedEventChoice }] : [],
	};
}

function dailyProgress() {
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		worldDate: '2026-08-20',
		movementUnits: 8,
		movementCost: 10,
		movementSatisfied: false,
		recoveryPoints: 4,
		challengeContribution: 0,
		challengeProgress: 0,
		challengeCost: 0,
		challengeCleared: true,
		status: 'provisional',
		members: [
			{ userId: 'user-1', movementUnits: 8, recoveryPoints: 4, status: 'provisional' },
			{ userId: 'user-2', movementUnits: 6, recoveryPoints: 3, status: 'provisional' },
		],
	};
}

function dailyRecap() {
	return {
		partyId: 'party-1',
		worldDate: '2026-08-20',
		resolvedAt: '2026-08-21T00:05:00.000Z',
		resolution: {
			sourceNode: { id: 'node-1', name: 'Mossway Crossing', nodeType: 'travel' },
			destinationNode: { id: 'node-1', name: 'Mossway Crossing', nodeType: 'travel' },
			outcome: 'held',
			movement: { units: 8, cost: 10, satisfied: false },
			recoveryPoints: 4,
			challenge: { progressBefore: 0, contribution: 0, progressAfter: 0, cost: 0, cleared: true },
			route: null,
			event:
				state.scenario === 'combat' ? { eventType: 'combat', outcome: 'ongoing', selectedChoiceKey: null, selectionReason: null } : null,
			combats:
				state.scenario === 'combat'
					? [
							{
								completed: false,
								members: [
									{
										userId: 'user-1',
										displayName: 'Hero',
										cards: [{ key: 'class:basic-attack', displayName: 'Basic Attack' }],
										healthBefore: 20,
										recovery: 4,
										cardHealing: 0,
										damageTaken: 2,
										healthAfter: 22,
										maxHealth: 30,
									},
								],
								enemies: [
									{
										id: 'enemy-1',
										displayName: 'Wolf',
										healthBefore: 12,
										damageTaken: 8,
										healthAfter: 4,
										maxHealth: 12,
										defeated: false,
									},
								],
							},
						]
					: [],
			rewards: [],
			navigation: null,
		},
	};
}

function village() {
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		settlement: { key: 'mossway', displayName: 'Mossway Village', description: 'A warm market at the edge of the mist.' },
		merchant: { key: 'wayfarer-market', displayName: 'The Wayfarer Market', role: 'Traveling merchant' },
		currency: { key: 'gold', displayName: 'Gold', balance: 120 },
		offers: [
			{
				key: 'herb',
				kind: 'item',
				displayName: 'Herb',
				details: {
					description: 'A fresh bundle of restorative leaves gathered along the trail.',
					equipmentSlot: null,
					effect: { kind: 'heal', amount: 10 },
				},
				currencyKey: 'gold',
				unitPrice: 10,
				ownedQuantity: 1,
			},
			{
				key: 'nut',
				kind: 'item',
				displayName: 'Nut',
				details: {
					description: 'A dense, sun-baked nut that steadies a weary traveler.',
					equipmentSlot: null,
					effect: { kind: 'heal', amount: 20 },
				},
				currencyKey: 'gold',
				unitPrice: 25,
				ownedQuantity: 0,
			},
			{
				key: 'short-sword',
				kind: 'equipment',
				displayName: 'Short Sword',
				details: {
					description: 'A dependable light blade made for a traveler’s first real battles.',
					equipmentSlot: 'weapon',
					effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
				},
				currencyKey: 'gold',
				unitPrice: 100,
				ownedQuantity: 0,
			},
			{
				key: 'leather-armor',
				kind: 'equipment',
				displayName: 'Leather Armor',
				details: {
					description: 'Supple hide that turns a glancing blow into a survivable one.',
					equipmentSlot: 'body',
					effect: { kind: 'stat-modifiers', modifiers: { defense: 1, vitality: 1 } },
				},
				currencyKey: 'gold',
				unitPrice: 80,
				ownedQuantity: 0,
			},
			{
				key: 'leather-armlet',
				kind: 'equipment',
				displayName: 'Leather Armlet',
				details: {
					description: 'A fitted wrist guard that keeps a traveler quick on their feet.',
					equipmentSlot: 'arm',
					effect: { kind: 'stat-modifiers', modifiers: { defense: 1, agility: 1 } },
				},
				currencyKey: 'gold',
				unitPrice: 60,
				ownedQuantity: 0,
			},
			{
				key: 'padded-vest',
				kind: 'equipment',
				displayName: 'Padded Vest',
				details: {
					description: 'Quilted layers that soften the first bite of a wild creature’s attack.',
					equipmentSlot: 'body',
					effect: { kind: 'stat-modifiers', modifiers: { defense: 1, vitality: 1 } },
				},
				currencyKey: 'gold',
				unitPrice: 90,
				ownedQuantity: 0,
			},
			{
				key: 'copper-band',
				kind: 'equipment',
				displayName: 'Copper Band',
				details: {
					description: 'A warm copper ring worn by travelers who prefer a little extra force behind a blow.',
					equipmentSlot: 'ring',
					effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
				},
				currencyKey: 'gold',
				unitPrice: 75,
				ownedQuantity: 0,
			},
		],
	};
}

function inventory() {
	return {
		currencies: [
			{
				key: 'gold',
				kind: 'currency',
				displayName: 'Gold',
				details: {
					description: 'The common coin of every road, market, and waystation.',
					equipmentSlot: null,
					effect: null,
				},
				quantity: 120,
			},
		],
		items: [
			{
				key: 'herb',
				kind: 'item',
				displayName: 'Herb',
				details: {
					description: 'A fresh bundle of restorative leaves gathered along the trail.',
					equipmentSlot: null,
					effect: { kind: 'heal', amount: 10 },
				},
				quantity: 1,
			},
		],
		equipment: [
			{
				key: 'short-sword',
				kind: 'equipment',
				displayName: 'Short Sword',
				details: {
					description: 'A dependable light blade made for a traveler’s first real battles.',
					equipmentSlot: 'weapon',
					effect: { kind: 'stat-modifiers', modifiers: { strength: 1 } },
				},
				quantity: 1,
			},
			{
				key: 'leather-armor',
				kind: 'equipment',
				displayName: 'Leather Armor',
				details: {
					description: 'Supple hide that turns a glancing blow into a survivable one.',
					equipmentSlot: 'body',
					effect: { kind: 'stat-modifiers', modifiers: { defense: 1, vitality: 1 } },
				},
				quantity: 1,
			},
		],
	};
}

function loadout() {
	return { weapon: null, body: null, head: null, arm: null, boots: null, ring: null, shirt: null };
}

function effectPreview(kind, baseAmount, overrides = {}) {
	return {
		effects: [
			{
				kind,
				baseAmount,
				manualTargetBonus: null,
				rallyBonus: null,
				targetCount: null,
				distribution: null,
				...overrides,
			},
		],
	};
}

function encounter() {
	const plan = state.selectedPlan ?? { itemLoadoutKeys: [], plays: [] };
	const selectedCount = (cardKey) => plan.plays.filter((play) => play.cardKey === cardKey).length;
	const warriorCards = [
		{
			key: 'class:basic-attack',
			sourceKind: 'class',
			sourceKey: 'basic-attack',
			classKey: 'warrior',
			unlockLevel: 1,
			displayName: 'Basic Attack',
			description: 'A reliable strike against one standing enemy.',
			targetMode: 'enemy',
			repeatable: true,
			locked: false,
			selectedCount: selectedCount('class:basic-attack'),
			preview: effectPreview('damage', 5, { targetCount: 1, distribution: 'single' }),
		},
		{
			key: 'class:shield-wall',
			sourceKind: 'class',
			sourceKey: 'shield-wall',
			classKey: 'warrior',
			unlockLevel: 2,
			displayName: 'Shield Wall',
			description: 'Brace against the next assault, reducing incoming pressure while the party regains its footing.',
			targetMode: 'none',
			repeatable: false,
			locked: false,
			selectedCount: selectedCount('class:shield-wall'),
			preview: effectPreview('guard', 4),
		},
		{
			key: 'item:herb',
			sourceKind: 'item',
			sourceKey: 'herb',
			classKey: null,
			unlockLevel: 1,
			displayName: 'Herb',
			description: 'Restore a small measure of health.',
			targetMode: 'ally',
			repeatable: true,
			locked: false,
			selectedCount: selectedCount('item:herb'),
			preview: effectPreview('heal', 10),
		},
	];
	const clericCards = [
		{
			key: 'class:basic-attack',
			sourceKind: 'class',
			sourceKey: 'basic-attack',
			classKey: 'cleric',
			unlockLevel: 1,
			displayName: 'Basic Attack',
			description: 'A reliable strike against one standing enemy.',
			targetMode: 'enemy',
			repeatable: true,
			locked: false,
			selectedCount: 0,
			preview: effectPreview('damage', 4, { targetCount: 1, distribution: 'single' }),
		},
		{
			key: 'class:mend',
			sourceKind: 'class',
			sourceKey: 'mend',
			classKey: 'cleric',
			unlockLevel: 2,
			displayName: 'Mend',
			description: 'Restore an ally’s health.',
			targetMode: 'ally',
			repeatable: false,
			locked: true,
			selectedCount: 0,
			preview: effectPreview('heal', 4),
		},
	];
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		worldDate: '2026-08-20',
		status: 'active',
		enemies: [{ id: 'enemy-1', archetypeKey: 'wolf', displayName: 'Wolf', maxHealth: 12, currentHealth: 12 }],
		members: [
			{
				userId: 'user-1',
				currentHealth: 20,
				maxHealth: 20,
				classKey: 'warrior',
				movementUnits: 8,
				playSlots: 3,
				cards: warriorCards,
				plan,
				reservedItems: [],
			},
			{
				userId: 'user-2',
				currentHealth: 18,
				maxHealth: 20,
				classKey: 'cleric',
				movementUnits: 6,
				playSlots: 3,
				cards: clericCards,
				plan: { itemLoadoutKeys: [], plays: [] },
				reservedItems: [],
			},
		],
	};
}

function healthStatus() {
	if (state.healthSyncReadyAt && Date.now() >= state.healthSyncReadyAt) {
		state.healthLastSyncAt = new Date().toISOString();
		state.healthSyncReadyAt = null;
	}
	return { status: 'active', lastSyncAt: state.healthLastSyncAt, healthUserId: 'health-user-1' };
}

async function handler(request) {
	const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
	const path = url.pathname;

	if (path === '/health') return new Response('ok');
	if (path === '/__reset' && request.method === 'POST') {
		resetState();
		return json({ ok: true });
	}
	if (path === '/__scenario' && request.method === 'POST') {
		const payload = await body(request);
		state.scenario = payload.scenario ?? 'branch';
		state.walkedTo = null;
		state.walkCount = 0;
		state.dungeonDiscovered = new Set(['tile-entry']);
		state.dungeonWalkDelayMs = Math.max(0, Number(payload.dungeonWalkDelayMs ?? 0));
		state.dungeonRejectNext = Boolean(payload.dungeonRejectNext);
		state.decisionStartedAt =
			state.scenario === 'village' || state.scenario === 'village-interior' || state.scenario === 'dungeon-grid'
				? null
				: '2026-08-20T00:00:00.000Z';
		return json({ ok: true, scenario: state.scenario });
	}
	if (path === '/__last-mutation') return json(state.lastMutation);
	if (path === '/__walk-count') return json({ count: state.walkCount ?? 0 });

	if (path === '/api/v1/me' && request.method === 'GET') return json(user);
	if (path === '/api/v1/parties' && request.method === 'GET') return json([party()]);
	if (path === '/api/v1/me/character')
		return json({
			userId: 'user-1',
			name: 'Hero',
			classKey: 'warrior',
			className: 'Warrior',
			backgroundKey: 'wanderer',
			backgroundName: 'Wanderer',
			backgroundTags: ['wanderer'],
			stats: { strength: 4, agility: 3, vitality: 4, insight: 2 },
			flavorTitle: 'The Trailward',
			flavorSummary: 'A steady traveler.',
			backstory: 'Hero knows how to keep walking.',
			createdAt: '2026-01-01T00:00:00.000Z',
		});
	if (path === '/api/v1/me/progression')
		return json({ userId: 'user-1', experience: 120, level: 2, nextLevelExperience: 400, unlocks: [] });
	if (path === '/api/v1/me/inventory') return json(inventory());
	if (path === '/api/v1/me/loadout') return json(loadout());
	if (path === '/api/v1/me' && request.method === 'PATCH') {
		const payload = await body(request);
		user.timezone = payload.timezone ?? user.timezone;
		return json(user);
	}
	if (path.startsWith('/api/v1/me/loadout/') && request.method === 'PUT') return json(loadout());
	if (path.startsWith('/api/v1/me/loadout/') && request.method === 'DELETE') return new Response(null, { status: 204 });
	if (path.startsWith('/api/v1/me/progress/'))
		return json({
			localDate: path.split('/').at(-1),
			steps: 8_400,
			sleepMinutes: 450,
			movementUnits: 8,
			recoveryPoints: 4,
			status: 'complete',
		});
	if (path === '/api/v1/me/health') return json(healthStatus());
	if (path === '/api/v1/me/health/sync' && request.method === 'POST') {
		state.healthSyncReadyAt = Date.now() + 1_000;
		return json({ queued: true, from: '2026-08-19', to: '2026-08-20' });
	}

	if (path === '/api/v1/parties/party-1') return json(party());
	if (path === '/api/v1/parties/party-1/roster') return json(partyRoster());
	if (path === '/api/v1/parties/party-1/locations/map-village/enter' && request.method === 'POST') {
		state.scenario = 'village-interior';
		state.decisionStartedAt = null;
		state.lastMutation = { path, body: null };
		return json(party());
	}
	if (path === '/api/v1/parties/party-1/dungeon/walk' && request.method === 'POST') {
		const payload = await body(request);
		state.lastMutation = { path, body: payload };
		if (state.dungeonWalkDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, state.dungeonWalkDelayMs));
		if (state.dungeonRejectNext && payload.mode === 'manual') {
			state.dungeonRejectNext = false;
			return json({ detail: 'The dungeon rejects this step.' }, 409);
		}
		state.walkCount = (state.walkCount ?? 0) + 1;
		if (payload.mode === 'manual') {
			const dungeon = map();
			const nodesById = new Map(dungeon.nodes.map((node) => [node.id, node]));
			const deltas = {
				up: [0, -1],
				down: [0, 1],
				left: [-1, 0],
				right: [1, 0],
			};
			let currentNodeId = state.walkedTo ?? 'tile-entry';
			const pathNodeIds = [];
			let haltedReason = null;
			for (const step of payload.steps ?? []) {
				const current = nodesById.get(currentNodeId);
				const delta = deltas[step];
				if (!current || !delta || current.mapMetadata.tileX === null || current.mapMetadata.tileY === null) {
					haltedReason = 'wall';
					break;
				}
				const next = dungeon.nodes.find(
					(node) =>
						node.mapMetadata.floorNo === current.mapMetadata.floorNo &&
						node.mapMetadata.tileX === current.mapMetadata.tileX + delta[0] &&
						node.mapMetadata.tileY === current.mapMetadata.tileY + delta[1],
				);
				if (!next) {
					haltedReason = 'wall';
					break;
				}
				currentNodeId = next.id;
				pathNodeIds.push(next.id);
				state.dungeonDiscovered.add(next.id);
			}
			state.walkedTo = currentNodeId;
			return json({
				partyId: 'party-1',
				nodeId: currentNodeId,
				tileBalance: 8,
				stepsTaken: pathNodeIds.length,
				pathNodeIds,
				revealedCount: pathNodeIds.length,
				floorChanged: false,
				encounterTriggeredNodeId: null,
				haltedReason,
				navigation: dungeonNavigation(),
			});
		}
		// Auto-explore follows the fixture corridor: entry → a → b → c → d → spawn.
		const corridor = ['tile-entry', 'tile-a', 'tile-b', 'tile-c', 'tile-d', 'tile-spawn'];
		const currentIndex = corridor.indexOf(state.walkedTo ?? 'tile-entry');
		const next = corridor[Math.min(corridor.length - 1, currentIndex + 1)] ?? 'tile-b';
		state.walkedTo = next;
		state.dungeonDiscovered.add(next);
		return json({
			partyId: 'party-1',
			nodeId: next,
			tileBalance: 8,
			stepsTaken: 1,
			pathNodeIds: [next],
			revealedCount: 2,
			floorChanged: false,
			encounterTriggeredNodeId: null,
			haltedReason: null,
			navigation: dungeonNavigation(),
		});
	}
	if (path === '/api/v1/parties/party-1/map' && request.method === 'GET') return json(map());
	if (path === '/api/v1/parties/party-1/event' && request.method === 'GET') return json(partyEvent());
	if (path === '/api/v1/parties/party-1/event/choices/me' && request.method === 'PUT') {
		const payload = await body(request);
		state.selectedEventChoice = payload.choiceKey ?? null;
		state.lastMutation = { path, body: payload };
		return json(partyEvent());
	}
	if (path === '/api/v1/parties/party-1/adventure') return json(adventure());
	if (path === '/api/v1/parties/party-1/progress') return json(dailyProgress());
	if (path === '/api/v1/parties/party-1/recap') return json(dailyRecap());
	if (path === '/api/v1/parties/party-1/village') return json(village());
	if (path === '/api/v1/parties/party-1/encounter') return json(encounter());
	if (path === '/api/v1/parties/party-1/progression') return json({ items: [], nextCursor: null });
	if (path === '/api/v1/parties/party-1/branch-votes/node-1' && request.method === 'GET') {
		if (!state.decisionStartedAt) return json({ error: 'No active vote' }, 404);
		return json(voteState());
	}
	if (path === '/api/v1/parties/party-1/village/departures' && request.method === 'POST') {
		state.decisionStartedAt = '2026-08-20T00:00:00.000Z';
		return json(voteState());
	}
	if (path === '/api/v1/parties/party-1/branch-votes/node-1' && request.method === 'PUT') {
		const payload = await body(request);
		state.lastMutation = { path, body: payload };
		state.selectedEdgeId = payload.edgeId;
		return json(voteState());
	}
	if (path === '/api/v1/parties/party-1/encounter/plan/me' && request.method === 'PUT') {
		state.selectedPlan = await body(request);
		state.lastMutation = { path, body: state.selectedPlan };
		return json(encounter());
	}
	if (path === '/api/v1/parties/party-1/item-uses' && request.method === 'POST') {
		const payload = await body(request);
		state.lastMutation = { path, body: payload };
		return json({
			itemKey: payload.itemKey,
			targetUserId: payload.targetUserId,
			healedAmount: 10,
			currentHealth: 20,
			maxHealth: 20,
			remainingQuantity: 0,
		});
	}

	return json({ error: `Mock backend route not found: ${request.method} ${path}` }, 404);
}

const server = createServer((request, response) => {
	handler(request)
		.then(async (result) => {
			response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
			response.end(Buffer.from(await result.arrayBuffer()));
		})
		.catch((error) => {
			response.writeHead(500, { 'Content-Type': 'application/json' });
			response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Mock backend failure' }));
		});
});

server.listen(port, '127.0.0.1');
