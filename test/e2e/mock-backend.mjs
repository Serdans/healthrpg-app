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
	selectedAction: null,
	lastMutation: { path: null, body: null },
	healthLastSyncAt: initialHealthSync,
	healthSyncReadyAt: null,
};

function resetState() {
	state.scenario = 'branch';
	state.decisionStartedAt = '2026-08-20T00:00:00.000Z';
	state.selectedEdgeId = null;
	state.selectedAction = null;
	state.lastMutation = { path: null, body: null };
	state.healthLastSyncAt = initialHealthSync;
	state.healthSyncReadyAt = null;
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
	if (state.scenario === 'village') return 'village';
	if (state.scenario === 'combat') return 'combat';
	if (state.scenario === 'event') return 'narrative';
	return 'travel';
}

function party() {
	return {
		id: 'party-1',
		name: 'Lantern Walkers',
		status: 'active',
		memberCapacity: 6,
		currentNode: {
			id: 'node-1',
			chapterNo: 1,
			regionNo: 1,
			name: state.scenario === 'village' ? 'Mossway Village' : 'Mossway Crossing',
			nodeType: currentNodeType(),
			templateKey: `${currentNodeType()}-v1`,
			config: {
				movementCost: 10,
				obstacleCost: 0,
				event: state.scenario === 'event' ? { eventType: 'narrative', prompt: 'Which light do you follow?', choices: [] } : undefined,
			},
		},
		gateProgress: 4,
		decisionStartedAt: state.decisionStartedAt,
		members: [
			{ userId: 'user-1', role: 'leader', displayName: 'Hero' },
			{ userId: 'user-2', role: 'member', displayName: 'Mira' },
		],
	};
}

function map() {
	return {
		currentChapter: 1,
		currentNodeId: 'node-1',
		nodes: [
			{
				id: 'node-1',
				chapterNo: 1,
				regionNo: 1,
				name: state.scenario === 'village' ? 'Mossway Village' : 'Mossway Crossing',
				nodeType: currentNodeType(),
				discovered: true,
				adjacent: true,
			},
			{ id: 'node-2', chapterNo: 1, regionNo: 1, name: 'North Lantern Road', nodeType: 'travel', discovered: true, adjacent: true },
			{ id: 'node-3', chapterNo: 1, regionNo: 2, name: 'Old Stone Road', nodeType: 'dungeon', discovered: true, adjacent: true },
		],
		edges: [
			{ id: 'edge-1', fromNodeId: 'node-1', toNodeId: 'node-2', optionKey: 'north-lantern-road', sortOrder: 0 },
			{ id: 'edge-2', fromNodeId: 'node-1', toNodeId: 'node-3', optionKey: 'old-stone-road', sortOrder: 1 },
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

function dailyProgress() {
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		worldDate: '2026-08-20',
		movementUnits: 8,
		movementCost: 10,
		movementSatisfied: false,
		recoveryPoints: 4,
		gateContribution: 4,
		gateProgress: 4,
		gateCost: 10,
		gateUnlocked: false,
		status: 'provisional',
		members: [
			{ userId: 'user-1', movementUnits: 8, recoveryPoints: 4, status: 'provisional' },
			{ userId: 'user-2', movementUnits: 6, recoveryPoints: 3, status: 'provisional' },
		],
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
			{ key: 'field-herb', kind: 'item', displayName: 'Field Herb', currencyKey: 'gold', unitPrice: 10, ownedQuantity: 1 },
			{ key: 'trail-blade', kind: 'equipment', displayName: 'Trail Blade', currencyKey: 'gold', unitPrice: 100, ownedQuantity: 0 },
		],
	};
}

function inventory() {
	return {
		currencies: [{ key: 'gold', kind: 'currency', displayName: 'Gold', quantity: 120 }],
		items: [{ key: 'field-herb', kind: 'item', displayName: 'Field Herb', quantity: 1 }],
		equipment: [{ key: 'trail-blade', kind: 'equipment', displayName: 'Trail Blade', quantity: 1 }],
	};
}

function loadout() {
	return { weapon: null, armor: null, accessory: null };
}

function encounter() {
	return {
		partyId: 'party-1',
		nodeId: 'node-1',
		worldDate: '2026-08-20',
		status: 'active',
		enemies: [{ id: 'enemy-1', archetypeKey: 'moss-wolf', displayName: 'Moss Wolf', maxHealth: 30, currentHealth: 30, pressure: 2 }],
		members: [
			{
				userId: 'user-1',
				currentHealth: 20,
				maxHealth: 20,
				classKey: 'warrior',
				signatureAction: {
					key: 'shield-wall',
					displayName: 'Shield Wall',
					description: 'Guard the party from incoming pressure.',
					targetMode: 'enemy',
				},
				selectedActionKey: state.selectedAction?.actionKey ?? null,
				actionMode: state.selectedAction?.actionKey ? 'ability' : 'basic',
				targetEnemyId: state.selectedAction?.targetEnemyId ?? null,
				targetUserId: state.selectedAction?.targetUserId ?? null,
				targetMode: 'manual',
			},
			{
				userId: 'user-2',
				currentHealth: 18,
				maxHealth: 20,
				classKey: 'cleric',
				signatureAction: { key: 'mend', displayName: 'Mend', description: 'Restore health to an ally.', targetMode: 'ally' },
				selectedActionKey: null,
				actionMode: 'basic',
				targetEnemyId: null,
				targetUserId: null,
				targetMode: 'none',
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
		state.decisionStartedAt = state.scenario === 'village' ? null : '2026-08-20T00:00:00.000Z';
		return json({ ok: true, scenario: state.scenario });
	}
	if (path === '/__last-mutation') return json(state.lastMutation);

	if (path === '/v1/me') return json(user);
	if (path === '/v1/me/parties') return json([party()]);
	if (path === '/v1/me/character')
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
	if (path === '/v1/me/progression') return json({ userId: 'user-1', experience: 120, level: 2, nextLevelExperience: 400, unlocks: [] });
	if (path === '/v1/me/inventory') return json(inventory());
	if (path === '/v1/me/loadout') return json(loadout());
	if (path === '/v1/me/preferences' && request.method === 'PATCH') {
		const payload = await body(request);
		user.timezone = payload.timezone ?? user.timezone;
		return json(user);
	}
	if (path.startsWith('/v1/me/loadout/') && request.method === 'PUT') return json(loadout());
	if (path.startsWith('/v1/me/loadout/') && request.method === 'DELETE') return new Response(null, { status: 204 });
	if (path.startsWith('/v1/progress/'))
		return json({
			localDate: path.split('/').at(-1),
			steps: 8_400,
			sleepMinutes: 450,
			movementUnits: 8,
			recoveryPoints: 4,
			status: 'complete',
		});
	if (path === '/v1/health/status') return json(healthStatus());
	if (path === '/v1/health/sync' && request.method === 'POST') {
		state.healthSyncReadyAt = Date.now() + 1_000;
		return json({ queued: true, from: '2026-08-19', to: '2026-08-20' });
	}

	if (path === '/v1/parties/party-1') return json(party());
	if (path === '/v1/parties/party-1/map') return json(map());
	if (path === '/v1/parties/party-1/daily-progress') return json(dailyProgress());
	if (path === '/v1/parties/party-1/village') return json(village());
	if (path === '/v1/parties/party-1/encounter') return json(encounter());
	if (path === '/v1/parties/party-1/progression') return json({ items: [], nextCursor: null });
	if (path === '/v1/parties/party-1/votes/node-1') {
		if (!state.decisionStartedAt) return json({ error: 'No active vote' }, 404);
		return json(voteState());
	}
	if (path === '/v1/parties/party-1/village/departure' && request.method === 'POST') {
		state.decisionStartedAt = '2026-08-20T00:00:00.000Z';
		return json(voteState());
	}
	if (path === '/v1/parties/party-1/votes' && request.method === 'POST') {
		const payload = await body(request);
		state.lastMutation = { path, body: payload };
		state.selectedEdgeId = payload.edgeId;
		return json(voteState());
	}
	if (path === '/v1/parties/party-1/encounter/action' && request.method === 'PUT') {
		state.selectedAction = await body(request);
		state.lastMutation = { path, body: state.selectedAction };
		return json(encounter());
	}
	if (path === '/v1/parties/party-1/items/use' && request.method === 'POST') {
		const payload = await body(request);
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
