import { expect, test } from '@playwright/test';
import type { APIRequestContext, Locator, Page } from '@playwright/test';

const mockBackendUrl = 'http://127.0.0.1:3010';

async function authenticate(page: Page) {
	await page.context().addCookies([
		{
			name: 'healthrpg_session',
			value: 'test-token',
			url: 'http://127.0.0.1:3002',
		},
	]);
}

async function lastMutation(request: APIRequestContext) {
	const response = await request.get(`${mockBackendUrl}/__last-mutation`);
	return response.json() as Promise<{ path: string | null; body: unknown }>;
}

async function walkCount(request: APIRequestContext) {
	const response = await request.get(`${mockBackendUrl}/__walk-count`);
	return (response.json() as Promise<{ count: number }>).then((payload) => payload.count);
}

test.beforeEach(async ({ request }) => {
	await request.post(`${mockBackendUrl}/__reset`);
});

test('renders the public landing page', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /Make the next step part of the story/i })).toBeVisible();
	await expect(page.getByRole('link', { name: /Continue with Google/i })).toBeVisible();
});

test('explains a failed Google sign-in and can dismiss the notice', async ({ page }) => {
	await page.goto('/?error=oauth_failed');

	const alert = page.getByRole('alert');
	await expect(alert).toContainText(/Google sign-in did not complete/i);
	await expect(alert.getByRole('link', { name: /Try Google sign-in again/i })).toBeVisible();

	await alert.getByRole('link', { name: 'Dismiss notification' }).click();
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('alert')).not.toBeVisible();
});

test('uses an accessible confirmation dialog for consequential party actions', async ({ page, request }) => {
	await authenticate(page);
	await page.goto('/parties/party-1');

	await page.getByRole('button', { name: /Leave party/i }).click();
	const dialog = page.getByRole('alertdialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('heading', { name: /Leave this party/i })).toBeVisible();

	await dialog.getByRole('button', { name: 'Cancel' }).click();
	await expect(dialog).not.toBeVisible();
	await expect.poll(async () => lastMutation(request)).toEqual({ path: null, body: null });
});

test('inspects a revealed branch on the party atlas', async ({ page }) => {
	await authenticate(page);
	await page.goto('/parties/party-1');

	const partyMenu = page.getByTestId('gameplay-section-nav');
	await expect(partyMenu).toContainText('Field');
	await expect(partyMenu).toContainText('Party');
	await expect(partyMenu).toContainText('Chronicle');
	await expect(page.getByRole('heading', { name: 'The road ahead', level: 2 })).toBeVisible();
	await expect(page.getByTestId('world-map')).toBeVisible();
	await expect(page.getByTestId('world-map-party-marker')).toBeVisible();
	await expect(page.getByTestId('daily-command-center')).toContainText('Your vote is needed');
	await expect
		.poll(async () =>
			page
				.getByTestId('world-map')
				.locator('.world-map-node')
				.first()
				.evaluate((node) => {
					const orb = node.querySelector<HTMLElement>('.world-map-node-orb');
					const art = node.querySelector<HTMLElement>('.world-map-node-art');
					if (!orb || !art) return 0;
					return Math.round((art.getBoundingClientRect().width / orb.clientWidth) * 100);
				}),
		)
		.toBe(75);
	await expect(page.getByTestId('party-roster')).toBeVisible();
	await expect(page.getByTestId('gameplay-mechanics').first()).toContainText('Momentum');
	await expect(page.getByTestId('gameplay-mechanics').first()).toContainText('Travel requirement');
	await expect(page.getByTestId('gameplay-mechanics').first()).not.toContainText('Challenge');
	await expect(page.getByTestId('daily-resolution-recap')).toContainText('Daily resolution');
	await expect(page.getByTestId('daily-resolution-recap')).toContainText('The trail held');
	await expect(page.getByTestId('daily-resolution-recap')).toContainText('4 points');
	await page.locator('#party-chronicle').scrollIntoViewIfNeeded();
	const actionStrip = page.getByTestId('daily-action-strip');
	await expect(actionStrip).toBeVisible();
	await actionStrip.getByRole('link', { name: 'Choose a route' }).click();
	await expect(page.getByTestId('party-action')).toBeFocused();
	await expect(page.getByTestId('party-member-sheet')).toContainText('Hero');
	await expect(page.getByTestId('party-member-sheet').locator('.roster-sheet-avatar')).toBeVisible();
	await page.locator('[data-testid="party-member"][data-member-id="user-2"]').click();
	await expect(page.getByTestId('party-member-sheet')).toContainText('Mira');
	await expect(page.getByTestId('party-member-sheet')).toContainText('Cleric');
	await expect(page.getByTestId('party-member-sheet')).toContainText('Level 3');
	await expect(page.getByTestId('party-member-sheet')).toContainText('38 / 50');
	const fieldLink = partyMenu.getByRole('link', { name: 'Field' });
	await fieldLink.click();
	await expect.poll(async () => fieldLink.getAttribute('aria-current')).toBe('location');

	const currentNode = page.getByRole('button', { name: /Mossway Crossing, Current location/i });
	await currentNode.focus();
	await page.keyboard.press('ArrowUp');
	const nextNode = page.getByRole('button', { name: /North Lantern Road, Next possible route/i });
	await expect(nextNode).toBeFocused();
	await expect(nextNode).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByTestId('world-map-inspector')).toContainText('North Lantern Road');
	await expect(page.getByTestId('world-map-inspector')).toContainText(/Next possible route/i);
	await nextNode.click();
	await expect(page.getByTestId('world-map-inspector')).toBeFocused();
	const routeBridge = page.getByTestId('world-map-route-bridge');
	await expect(routeBridge).toContainText('Review route vote');
	await routeBridge.getByRole('link', { name: 'Review route vote' }).click();
	await expect(page.getByTestId('party-action')).toBeFocused();
});

test('keeps the party shell navigable on a phone-sized viewport', async ({ page }) => {
	await authenticate(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.goto('/parties/party-1');

	await expect(page.getByTestId('gameplay-section-nav')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'The travelers beside you', level: 2 })).toBeVisible();
	await expect(page.getByTestId('map-scene')).toHaveCSS('animation-name', 'none');
	await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('opens a village departure vote and casts a route vote', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'village' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByRole('heading', { name: 'Mossway Village', level: 2 })).toBeVisible();
	await page.getByRole('button', { name: /Start departure vote/i }).click();
	await expect(page.getByRole('button', { name: /Departure vote open/i })).toBeVisible();
	await expect(page.getByTestId('party-action').getByRole('heading', { name: 'Choose the next trail' })).toBeVisible();

	await page.locator('button.choice-card').filter({ hasText: 'North Lantern Road' }).click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/branch-votes/node-1',
			body: { edgeId: 'edge-1' },
		});
	await expect(page.locator('button.choice-card').filter({ hasText: 'North Lantern Road' })).toHaveAttribute('data-selected', 'true');
});

test('enters a nested village map from the overworld', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'village' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await page.getByRole('button', { name: /Mossway Village, Current location/i }).click();
	const locationEntry = page.getByTestId('world-map-location-entry');
	await expect(locationEntry).toContainText("Wayfarer's Rest");
	await locationEntry.getByRole('button', { name: /Enter Wayfarer's Rest/i }).click();

	await expect(page.getByTestId('interior-map')).toBeVisible();
	await expect(page.getByTestId('map-scene')).toHaveAttribute('data-map-type', 'village');
	await expect(page.getByTestId('interior-map-party-marker')).toBeVisible();
	await expect(page.getByLabel('Interior map legend')).toContainText('Party');
	await expect(page.getByTestId('interior-map-inspector')).toContainText('Village interior');
	await expect(page.getByTestId('location-objectives')).toContainText('Lantern Square');
	await expect(page.getByRole('button', { name: /Lantern Square, Current location/i })).toBeVisible();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/locations/map-village/enter',
			body: null,
		});
});

test('uses the village inn and purchases a recovery item', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'village' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByRole('heading', { name: 'Mossway Village', level: 2 })).toBeVisible();
	await page.getByRole('button', { name: /Rest.*75 Gold/i }).click();
	await expect(page.getByRole('status').filter({ hasText: /Your traveler is at 20\/20 HP/i })).toBeVisible();
	await expect(page.getByTestId('village-balance')).toHaveText('45');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/village/inn',
			body: null,
		});

	await page.getByRole('button', { name: 'Purchase' }).first().click();
	await expect(page.getByRole('status').filter({ hasText: /Bought 1 × Herb/i })).toBeVisible();
	await expect(page.getByTestId('village-balance')).toHaveText('35');
	await expect(page.getByText('Owned: 2', { exact: true })).toBeVisible();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/village/purchases',
			body: { catalogKey: 'herb', quantity: 1 },
		});
});

test('walks a tile-based dungeon with automatic advance and manual steps', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const grid = page.getByTestId('dungeon-grid');
	await expect(grid).toBeVisible();
	await expect(grid).toHaveAttribute('data-dungeon-renderer', 'pixi');
	await expect(grid).toHaveAttribute('data-dungeon-theme', 'atmospheric');
	await expect(grid).toHaveAttribute('data-dungeon-floor', '0');
	await expect(grid).toHaveAttribute('data-tile-balance', '9');
	await expect(page.getByTestId('map-scene')).toHaveAttribute('data-map-type', 'dungeon');
	await expect(page.locator('.game-panel-dungeon')).toBeVisible();
	await expect(page.getByTestId('dungeon-navigator')).toContainText('You are the Navigator');
	await expect(page.getByTestId('dungeon-advance')).toBeEnabled();
	// The world renders to a single canvas now.
	const canvas = page.getByTestId('dungeon-grid-canvas');
	await expect(canvas).toBeVisible();
	expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);
	// The live-region announces the party's tile.
	await expect(page.getByTestId('dungeon-live-status')).toContainText(/Party is at/);

	await page.getByTestId('dungeon-advance').click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'auto' },
		});
	await expect(page.getByTestId('dungeon-navigator')).toContainText('You are the Navigator');
	await expect(page.getByTestId('dungeon-advance')).toBeEnabled();

	// Manual stepping: arrow keys send single-tile walk requests.
	const atEntry = await page.getByTestId('dungeon-live-status').textContent();
	await page.getByTestId('dungeon-grid-viewport').focus();
	await page.keyboard.press('ArrowRight');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['right'] },
		});
	if (atEntry !== null) await expect(page.getByTestId('dungeon-live-status')).not.toHaveText(atEntry);

	// Holding a direction chains steps at hop cadence, PMD style.
	const before = await walkCount(request);
	await page.keyboard.down('ArrowRight');
	await expect.poll(async () => walkCount(request)).toBeGreaterThanOrEqual(before + 2);
	await page.keyboard.up('ArrowRight');
	await expect.poll(async () => (await walkCount(request)) - before).toBeGreaterThanOrEqual(2);
});

test('walks up and down through fog-covered dungeon tiles', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const grid = page.getByTestId('dungeon-grid');
	const viewport = page.getByTestId('dungeon-grid-viewport');
	await viewport.focus();

	await page.keyboard.press('ArrowUp');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['up'] },
		});
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-treasure');

	await page.keyboard.press('ArrowDown');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['down'] },
		});
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-entry');
});

test('stops buffered dungeon movement after releasing the key', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid', dungeonWalkDelayMs: 2_000 } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const grid = page.getByTestId('dungeon-grid');
	await page.getByTestId('dungeon-grid-viewport').focus();
	const walkRequest = page.waitForRequest(
		(candidate) => candidate.url().includes('/api/v1/parties/party-1/dungeon/walk') && candidate.method() === 'POST',
	);
	const walkResponse = page.waitForResponse(
		(response) => response.url().includes('/api/v1/parties/party-1/dungeon/walk') && response.request().method() === 'POST',
	);
	await page.keyboard.down('ArrowRight');
	await walkRequest;
	await page.keyboard.up('ArrowRight');

	await walkResponse;
	await expect.poll(async () => walkCount(request)).toBe(1);
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-a');
});

test('keeps the newer direction active when the previous key is released', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid', dungeonWalkDelayMs: 200 } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await page.getByTestId('dungeon-grid-viewport').focus();
	const rightRequest = page.waitForRequest(
		(candidate) => candidate.url().includes('/api/v1/parties/party-1/dungeon/walk') && candidate.method() === 'POST',
	);
	await page.keyboard.down('ArrowRight');
	await rightRequest;
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['right'] },
		});
	const leftRequest = page.waitForRequest(
		(candidate) => candidate.url().includes('/api/v1/parties/party-1/dungeon/walk') && candidate.method() === 'POST',
	);
	await page.keyboard.down('ArrowLeft');
	await leftRequest;
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['left'] },
		});
	await page.keyboard.up('ArrowRight');

	await expect.poll(async () => walkCount(request)).toBeGreaterThanOrEqual(2);
	await page.keyboard.up('ArrowLeft');
});

test('renders a manual dungeon step before the server responds', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid', dungeonWalkDelayMs: 500 } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const grid = page.getByTestId('dungeon-grid');
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-entry');
	await page.getByTestId('dungeon-grid-viewport').focus();
	await page.keyboard.press('ArrowRight');

	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-a');
	await expect(page.getByTestId('dungeon-live-status')).toContainText('tile-a');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['right'] },
		});
	await expect.poll(async () => walkCount(request)).toBe(1);
});

test('snaps a rejected dungeon step back and discards queued input', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, {
		data: { scenario: 'dungeon-grid', dungeonWalkDelayMs: 1_000, dungeonRejectNext: true },
	});
	await authenticate(page);
	await page.goto('/parties/party-1');

	const grid = page.getByTestId('dungeon-grid');
	await page.getByTestId('dungeon-grid-viewport').focus();
	await page.keyboard.press('ArrowRight');
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-a');

	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-entry');
	await expect(page.getByTestId('dungeon-grid-inspector')).toContainText('entry');
	await expect(page.getByText('The dungeon rejects this step.')).toBeVisible();
	await expect(grid).toHaveAttribute('data-party-recovery-count', '1');
	await expect(grid).toHaveAttribute('data-party-traveling', 'false');
	await expect.poll(async () => walkCount(request)).toBe(0);
});

test('selects a specific enemy target for an attack card', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await page.getByTestId('battle-card-class-basic-attack').click();
	const target = page.getByTestId('battle-enemy').first();
	await expect(target).toHaveClass(/battle-targetable/);
	await target.click();
	await expect(target).toHaveAttribute('data-selected', 'true');
	await expect(page.getByTestId('battle-target-ellipse')).toBeVisible();
	await page.getByTestId('battle-save-plan').click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/encounter/plan/me',
			body: {
				itemLoadoutKeys: [],
				plays: [{ cardKey: 'class:basic-attack', targetEnemyId: 'enemy-1', targetUserId: null }],
			},
		});
});

test('keeps a stale planned card visible until it is removed', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat-stale' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const staleCard = page.getByTestId('battle-queued-card-1');
	await expect(staleCard).toContainText('Card unavailable');
	await expect(staleCard).toHaveAttribute('data-plan-issue', 'missing-card');
	await expect(page.getByTestId('battle-save-plan')).toBeDisabled();
	await expect(page.getByTestId('battle-save-plan')).toHaveAttribute('data-plan-valid', 'false');

	await staleCard.click({ force: true });
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 0/3');
	await expect(page.getByTestId('battle-save-plan')).toBeEnabled();
	await expect.poll(async () => lastMutation(request)).toEqual({ path: null, body: null });
});

test('builds and saves a daily card plan', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const combatScene = page.getByTestId('combat-scene');
	await expect(combatScene).toBeVisible();
	const battlefield = page.getByTestId('battlefield');
	await expect(battlefield).toBeVisible();
	await expect(battlefield).toHaveAttribute('data-battle-terrain', 'wilds');
	await expect(battlefield.getByTestId('battlefield-arena')).toBeAttached();
	await expect(battlefield.getByTestId('battle-arena-actor')).toHaveCount(3);
	await expect(battlefield.getByTestId('battle-arena-canvas')).toHaveAttribute('data-renderer', 'pixi');
	await expect(battlefield.getByTestId('battle-pixi-scene')).toHaveAttribute('data-battle-pixi-ready', 'true');
	await combatScene.scrollIntoViewIfNeeded();
	const cardFan = page.getByTestId('battle-card-fan');
	await cardFan.scrollIntoViewIfNeeded();
	await expect(cardFan.locator('.battle-fan-card')).toHaveCount(3);
	await expect(page.getByTestId('battle-card-hand-viewport')).toHaveAttribute('data-has-left-overflow', 'false');
	await expect(page.getByTestId('battle-enemy').first()).toContainText('Wolf');
	await expect(page.getByTestId('battle-party-member').first()).toContainText('Hero');
	await expect(page.getByTestId('combat-scene').getByRole('heading', { name: 'Battle encounter' })).toBeAttached();
	await expect(page.getByTestId('combat-scene').getByText('Hold the line together.')).toHaveCount(0);
	await expect(page.getByTestId('daily-command-center')).toContainText('Your card plan is needed');
	await expect(page.getByTestId('combat-scene').getByTestId('gameplay-mechanics')).toHaveCount(0);
	await expect(page.getByTestId('battle-deck-toggle')).toHaveCount(0);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 0/3');
	await expect(page.getByTestId('battle-command-tray')).toContainText('0/3');
	await expect(page.getByTestId('battle-card-class-basic-attack')).toContainText('Damage 5');
	await page.getByTestId('battle-card-filter-class').click();
	await expect(page.getByTestId('battle-card-filter-class')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.getByTestId('battle-card-item-herb')).toHaveCount(0);
	await page.getByTestId('battle-card-filter-all').click();
	await cardFan.scrollIntoViewIfNeeded();
	const shieldWall = page.getByTestId('battle-card-class-shield-wall');
	await shieldWall.hover();
	const hoverPreview = page.getByTestId('battle-card-preview');
	await expect(hoverPreview).toBeVisible();
	await expect(hoverPreview).toHaveAttribute('data-card-key', 'class:shield-wall');
	const previewBounds = await hoverPreview.boundingBox();
	if (!previewBounds) throw new Error('Battle preview bounds are missing.');
	await page.mouse.move(previewBounds.x + previewBounds.width / 2, previewBounds.y + previewBounds.height / 2);
	await expect(hoverPreview).toBeVisible();
	await expect(hoverPreview).toContainText('Brace against the next assault');
	await shieldWall.click();
	const queuedShieldWall = page.getByTestId('battle-queued-card-1');
	await expect(queuedShieldWall).toHaveAttribute('data-card-key', 'class:shield-wall');
	await expect(queuedShieldWall).toContainText('Guard 4');
	await expect(page.getByTestId('battle-card-preview-detail')).toContainText('Guard 4');
	await expect(queuedShieldWall).toHaveAttribute('data-queued', 'true');
	await expect(queuedShieldWall).toHaveAttribute('data-queued-order', '1');
	await expect(queuedShieldWall.locator('.battle-fan-card-queued-badge')).toContainText('1');
	await expect(page.getByTestId('battle-plan-boundary')).toBeVisible();
	await expect(page.getByTestId('battle-reorder-handle-1')).toBeVisible();
	await expect(queuedShieldWall).toHaveClass(/battle-fan-card-focused/);
	await page.mouse.move(0, 0);
	await expect(page.getByTestId('battle-card-preview')).toHaveCount(0);
	await expect(page.getByTestId('battle-card-class-shield-wall')).toHaveCount(0);
	await expect(queuedShieldWall).toHaveClass(/battle-fan-card-focused/);
	await queuedShieldWall.click({ force: true });
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 0/3');
	await page.getByTestId('battle-card-item-herb').click({ force: true });
	const herbCard = page.getByTestId('battle-card-item-herb');
	await expect(page.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'item:herb');
	await expect(herbCard).toHaveAttribute('data-queued', 'false');
	await expect(herbCard).toHaveAttribute('data-queued-count', '1');
	await page.getByTestId('battle-card-class-basic-attack').click({ force: true });
	await page.getByTestId('battle-card-class-basic-attack').click({ force: true });
	await expect(page.getByTestId('battle-queued-card-2')).toHaveAttribute('data-card-key', 'class:basic-attack');
	await expect(page.getByTestId('battle-queued-card-3')).toHaveAttribute('data-card-key', 'class:basic-attack');
	await expect(page.getByTestId('battle-card-class-basic-attack')).toHaveAttribute('data-queued', 'false');
	await expect(page.getByTestId('battle-card-class-basic-attack')).toHaveAttribute('data-queued-count', '2');
	const sceneBounds = await combatScene.boundingBox();
	const handBounds = await page.getByTestId('battle-card-hand-viewport').boundingBox();
	const actionBounds = await page.getByTestId('battle-plan-action').boundingBox();
	if (!sceneBounds || !handBounds || !actionBounds) throw new Error('Battle layout bounds are missing.');
	expect(handBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(handBounds.x + handBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	expect(actionBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(actionBounds.x + actionBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	const cardGeometry = await cardFan.locator('.battle-fan-card').evaluateAll((cards) => {
		const rects = cards.map((card) => card.getBoundingClientRect());
		return {
			count: rects.length,
			overlaps: rects.slice(1).some((rect, index) => rect.left < (rects[index]?.right ?? rect.left)),
		};
	});
	expect(cardGeometry.count).toBeGreaterThan(2);
	expect(cardGeometry.overlaps).toBe(true);
	await page.getByTestId('battle-save-plan').click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/encounter/plan/me',
			body: {
				itemLoadoutKeys: ['herb'],
				plays: [
					{ cardKey: 'item:herb', targetEnemyId: null, targetUserId: 'user-1' },
					{ cardKey: 'class:basic-attack', targetEnemyId: 'enemy-1', targetUserId: null },
					{ cardKey: 'class:basic-attack', targetEnemyId: 'enemy-1', targetUserId: null },
				],
			},
		});
	await expect(page.getByTestId('battle-status')).toContainText(/plan is locked in/i);

	const queuedHerb = page.getByTestId('battle-queued-card-1');
	await queuedHerb.click();
	await queuedHerb.click();
	await expect(page.getByTestId('battle-status')).toContainText(/review your cards and save/i);
});

test('keeps desktop battle controls inside the viewport', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await page.setViewportSize({ width: 1440, height: 900 });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const combatScene = page.getByTestId('combat-scene');
	await combatScene.scrollIntoViewIfNeeded();
	await expect(page.getByTestId('battlefield')).toBeVisible();
	await expect(page.getByTestId('battle-card-hand-viewport')).toBeVisible();
	await expect(page.getByTestId('battle-save-plan')).toBeVisible();

	const sceneBounds = await combatScene.boundingBox();
	const readyBounds = await page.getByTestId('battle-save-plan').boundingBox();
	if (!sceneBounds || !readyBounds) throw new Error('Battle controls are missing their layout bounds.');
	expect(readyBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(readyBounds.x + readyBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	expect(readyBounds.y).toBeGreaterThanOrEqual(sceneBounds.y);
	expect(readyBounds.y + readyBounds.height).toBeLessThanOrEqual(sceneBounds.y + sceneBounds.height);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

	await page.getByTestId('battle-card-class-basic-attack').hover();
	await expect(page.getByTestId('battle-card-preview')).toBeVisible();
	await page.mouse.move(0, 0);
	await expect(page.getByTestId('battle-card-preview')).toHaveCount(0);
});

test('keeps the selected fan and lock action inside a phone battle viewport', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await page.setViewportSize({ width: 390, height: 844 });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const combatScene = page.getByTestId('combat-scene');
	await combatScene.scrollIntoViewIfNeeded();
	await expect(page.getByTestId('battlefield')).toHaveAttribute('data-battle-terrain', 'wilds');
	await expect(page.getByTestId('battlefield-arena')).toBeAttached();
	const handViewportControl = page.getByTestId('battle-card-hand-viewport');
	const handFrameControl = page.getByTestId('battle-card-hand-frame');
	const savePlan = page.getByTestId('battle-save-plan');
	await expect(handViewportControl).toBeVisible();
	await expect(savePlan).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
	const sceneBounds = await combatScene.boundingBox();
	const handBounds = await handViewportControl.boundingBox();
	const saveBounds = await savePlan.boundingBox();
	if (!sceneBounds || !handBounds || !saveBounds) throw new Error('Phone battle layout bounds are missing.');
	expect(handBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(handBounds.x + handBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	expect(saveBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(saveBounds.x + saveBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	const touchTap = async (card: Locator) => {
		await card.dispatchEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true });
		await card.dispatchEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true });
		await card.dispatchEvent('click', { bubbles: true, detail: 1 });
	};
	const shieldWall = page.getByTestId('battle-card-class-shield-wall');
	await touchTap(shieldWall);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 0/3');
	const mobilePreview = page.getByTestId('battle-card-preview');
	await expect(mobilePreview).toBeVisible();
	await expect(mobilePreview).toContainText('Brace against the next assault');
	const mobilePreviewBounds = await mobilePreview.boundingBox();
	if (!mobilePreviewBounds) throw new Error('Mobile battle preview bounds are missing.');
	expect(mobilePreviewBounds.x).toBeGreaterThanOrEqual(sceneBounds.x);
	expect(mobilePreviewBounds.x + mobilePreviewBounds.width).toBeLessThanOrEqual(sceneBounds.x + sceneBounds.width);
	await touchTap(shieldWall);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 1/3');
	await expect(page.getByTestId('battle-card-preview')).toHaveCount(0);
	const queuedShieldWall = page.getByTestId('battle-queued-card-1');
	await expect(queuedShieldWall).toHaveAttribute('data-card-key', 'class:shield-wall');
	await expect(queuedShieldWall).toHaveClass(/battle-fan-card-focused/);
	await queuedShieldWall.focus();
	await expect(mobilePreview).toBeVisible();
	const selectedHandViewportBounds = await handViewportControl.boundingBox();
	if (!selectedHandViewportBounds) throw new Error('Selected hand viewport bounds are missing.');
	await page.mouse.move(
		selectedHandViewportBounds.x + selectedHandViewportBounds.width / 2,
		selectedHandViewportBounds.y + selectedHandViewportBounds.height / 2,
	);
	await page.mouse.wheel(240, 0);
	await expect.poll(() => handViewportControl.evaluate((viewport) => viewport.scrollLeft)).toBeGreaterThan(0);
	await expect(mobilePreview).toHaveCount(0);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 1/3');
	await touchTap(queuedShieldWall);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 0/3');
	await page.getByTestId('battle-card-item-herb').click();
	await page.getByTestId('battle-card-class-basic-attack').click();
	await expect(page.getByTestId('battle-save-plan')).toHaveAccessibleName('Ready — lock battle plan');

	await handViewportControl.evaluate((viewport) => {
		viewport.scrollLeft = 0;
		viewport.dispatchEvent(new Event('scroll'));
	});
	await expect(handFrameControl).toHaveAttribute('data-has-left-overflow', 'false');
	await expect(handFrameControl).toHaveAttribute('data-has-right-overflow', 'true');
	await expect(handViewportControl).toHaveAttribute('data-has-left-overflow', 'false');
	await expect(handViewportControl).toHaveAttribute('data-has-right-overflow', 'true');
	await expect(page.locator('.battle-fan-card[data-edge-fade-left="true"]')).toHaveCount(0);
	await expect(page.locator('.battle-fan-card[data-edge-fade-right="true"]')).toHaveCount(1);
	const handViewportBounds = await handViewportControl.boundingBox();
	if (!handViewportBounds) throw new Error('Hand viewport bounds are missing.');
	await page.mouse.move(handViewportBounds.x + handViewportBounds.width * 0.78, handViewportBounds.y + handViewportBounds.height * 0.45);
	await page.mouse.down();
	await page.mouse.move(handViewportBounds.x + handViewportBounds.width * 0.22, handViewportBounds.y + handViewportBounds.height * 0.45, {
		steps: 6,
	});
	await page.mouse.up();
	await expect.poll(() => handViewportControl.evaluate((viewport) => viewport.scrollLeft)).toBeGreaterThan(0);
	await expect(handViewportControl).toHaveAttribute('data-has-left-overflow', 'true');
	await handViewportControl.evaluate((viewport) => {
		viewport.scrollLeft = Math.floor((viewport.scrollWidth - viewport.clientWidth) / 2);
		viewport.dispatchEvent(new Event('scroll'));
	});
	await expect(handFrameControl).toHaveAttribute('data-has-left-overflow', 'true');
	await expect(handFrameControl).toHaveAttribute('data-has-right-overflow', 'true');
	await expect(handViewportControl).toHaveAttribute('data-has-left-overflow', 'true');
	await expect(handViewportControl).toHaveAttribute('data-has-right-overflow', 'true');
	await expect(page.locator('.battle-fan-card[data-edge-fade-left="true"]')).toHaveCount(1);
	await expect(page.locator('.battle-fan-card[data-edge-fade-right="true"]')).toHaveCount(1);
	await handViewportControl.evaluate((viewport) => {
		viewport.scrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
		viewport.dispatchEvent(new Event('scroll'));
	});
	await expect(handFrameControl).toHaveAttribute('data-has-left-overflow', 'true');
	await expect(handFrameControl).toHaveAttribute('data-has-right-overflow', 'false');
	await expect(handViewportControl).toHaveAttribute('data-has-left-overflow', 'true');
	await expect(handViewportControl).toHaveAttribute('data-has-right-overflow', 'false');
	await expect(page.locator('.battle-fan-card[data-edge-fade-left="true"]')).toHaveCount(1);
	await expect(page.locator('.battle-fan-card[data-edge-fade-right="true"]')).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('uses a consumable from the kit on a selected party member', async ({ page, request }) => {
	await authenticate(page);
	await page.goto('/inventory');

	await expect(page.getByRole('heading', { name: 'What are you carrying?' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Who needs a hand?' })).toBeVisible();
	await page.getByRole('button', { name: 'Use on traveler' }).click();

	const dialog = page.getByRole('alertdialog');
	await expect(dialog).toBeVisible();
	await dialog.getByRole('radio').nth(1).check();
	await dialog.getByRole('button', { name: 'Use item' }).click();

	await expect(page.getByRole('status')).toContainText('Herb used on Mira, restoring 10 HP.');
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/item-uses',
			body: { itemKey: 'herb', targetUserId: 'user-2' },
		});
});

test('shows queued health sync feedback', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'branch' } });
	await authenticate(page);
	await page.goto('/settings');

	await page.getByRole('button', { name: /Sync now/i }).click();
	await expect(page.getByText(/Health sync queued/i)).toBeVisible();
	await expect(page.getByText(/Refreshing 2026-08-19 through 2026-08-20/i)).toBeVisible();
});
