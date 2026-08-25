import { expect, test } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';

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
	await page.waitForTimeout(700);
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
	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(300);
	await page.keyboard.up('ArrowRight');

	await expect.poll(async () => walkCount(request)).toBe(1);
	await page.waitForTimeout(2_200);
	await expect.poll(async () => walkCount(request)).toBe(1);
	await expect(grid).toHaveAttribute('data-party-node-id', 'tile-a');
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

test('builds and saves a daily card plan', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const combatScene = page.getByTestId('combat-scene');
	await expect(combatScene).toBeVisible();
	await expect(page.getByTestId('battlefield')).toBeVisible();
	await combatScene.scrollIntoViewIfNeeded();
	const cardFan = page.getByTestId('battle-card-fan');
	await cardFan.scrollIntoViewIfNeeded();
	const viewportMetrics = await cardFan.evaluate((fan) => {
		const cards = [...fan.querySelectorAll<HTMLElement>('.battle-fan-card')];
		const cardRects = cards.map((card) => card.getBoundingClientRect());
		const fanRect = fan.getBoundingClientRect();
		const overlaps = cardRects.slice(1).some((rect, index) => rect.left < cardRects[index].right - 4);
		const queueRect = document.querySelector<HTMLElement>('[data-testid="battle-play-queue"]')?.getBoundingClientRect();
		const handColumnRect = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const sceneElement = document.querySelector<HTMLElement>('[data-testid="combat-scene"]');
		const categoryRects = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-card-filter-"]')].map((filter) =>
			filter.getBoundingClientRect(),
		);
		const battlefieldRect = document.querySelector<HTMLElement>('[data-testid="battlefield"]')?.getBoundingClientRect();
		const statusRect = document.querySelector<HTMLElement>('[data-testid="battle-status"]')?.getBoundingClientRect();
		const partyAndEnemyRects = [...document.querySelectorAll<HTMLElement>('.battle-party-member, .battle-enemy')].map((entity) =>
			entity.getBoundingClientRect(),
		);
		const enemyRects = [...document.querySelectorAll<HTMLElement>('.battle-enemy')].map((enemy) => enemy.getBoundingClientRect());
		const partyRects = [...document.querySelectorAll<HTMLElement>('.battle-party-member')].map((partyMember) =>
			partyMember.getBoundingClientRect(),
		);
		const fanOffsets = cards.map((card) => Number.parseFloat(card.style.getPropertyValue('--fan-offset')));
		const fanRotations = cards.map((card) => Number.parseFloat(card.style.getPropertyValue('--fan-rotation')));
		const fanDrops = cards.map((card) => Number.parseFloat(card.style.getPropertyValue('--fan-drop')));
		const intersectsSideFormation = partyAndEnemyRects.some((entityRect) =>
			cardRects.some(
				(cardRect) =>
					cardRect.left < entityRect.right &&
					cardRect.right > entityRect.left &&
					cardRect.top < entityRect.bottom &&
					cardRect.bottom > entityRect.top,
			),
		);
		const intersectsEnemy = (rectA: DOMRect, rectB: DOMRect) =>
			rectA.left < rectB.right && rectA.right > rectB.left && rectA.top < rectB.bottom && rectA.bottom > rectB.top;
		const categoriesIntersectEnemies = categoryRects.some((categoryRect) =>
			enemyRects.some((enemyRect) => intersectsEnemy(categoryRect, enemyRect)),
		);
		const categoriesStayInsideHand = categoryRects.every(
			(categoryRect) =>
				handColumnRect !== undefined && categoryRect.left >= handColumnRect.left - 1 && categoryRect.right <= handColumnRect.right + 1,
		);
		return {
			fanTop: Math.round(Math.min(...cardRects.map((rect) => rect.top))),
			fanBottom: Math.round(Math.max(...cardRects.map((rect) => rect.bottom))),
			overlaps,
			intersectsSideFormation,
			queueLeft: queueRect ? Math.round(queueRect.left) : null,
			queueRight: queueRect ? Math.round(queueRect.right) : null,
			queueCenter: queueRect ? Math.round((queueRect.left + queueRect.right) / 2) : null,
			handCenter: handColumnRect ? Math.round((handColumnRect.left + handColumnRect.right) / 2) : null,
			categoriesIntersectEnemies,
			categoriesStayInsideHand,
			innerFrameRemoved: sceneElement ? getComputedStyle(sceneElement, '::before').content === 'none' : false,
			handLeft: Math.round(fanRect.left),
			fanWidth: Math.round(fanRect.width),
			battlefieldTop: battlefieldRect ? Math.round(battlefieldRect.top) : null,
			battlefieldBottom: battlefieldRect ? Math.round(battlefieldRect.bottom) : null,
			statusBottom: statusRect ? Math.round(statusRect.bottom) : null,
			partyTop: partyRects.length > 0 ? Math.round(Math.min(...partyRects.map((rect) => rect.top))) : null,
			partyBottom: partyRects.length > 0 ? Math.round(Math.max(...partyRects.map((rect) => rect.bottom))) : null,
			viewportHeight: window.innerHeight,
			fanCardCount: cards.length,
			firstFanOffset: fanOffsets[0] ?? 0,
			lastFanOffset: fanOffsets.at(-1) ?? 0,
			firstFanRotation: fanRotations[0] ?? 0,
			lastFanRotation: fanRotations.at(-1) ?? 0,
			firstFanDrop: fanDrops[0] ?? 0,
			centerFanDrop: fanDrops[Math.floor((fanDrops.length - 1) / 2)] ?? 0,
			lastFanDrop: fanDrops.at(-1) ?? 0,
		};
	});
	expect(viewportMetrics.fanTop).toBeGreaterThanOrEqual(0);
	expect(viewportMetrics.fanBottom).toBeLessThanOrEqual(viewportMetrics.viewportHeight);
	expect(viewportMetrics.overlaps).toBe(true);
	expect(viewportMetrics.intersectsSideFormation).toBe(false);
	expect(viewportMetrics.queueCenter).toBe(viewportMetrics.handCenter);
	expect(viewportMetrics.categoriesIntersectEnemies).toBe(false);
	expect(viewportMetrics.categoriesStayInsideHand).toBe(true);
	expect(viewportMetrics.innerFrameRemoved).toBe(true);
	expect(viewportMetrics.fanWidth).toBeGreaterThan(0);
	if (viewportMetrics.fanCardCount > 2) {
		expect(viewportMetrics.firstFanDrop).toBeCloseTo(viewportMetrics.lastFanDrop, 5);
		expect(viewportMetrics.firstFanDrop).toBeGreaterThan(viewportMetrics.centerFanDrop);
	}
	expect(viewportMetrics.partyTop).toBeGreaterThanOrEqual((viewportMetrics.battlefieldTop ?? 0) - 1);
	expect(viewportMetrics.partyTop).toBeGreaterThanOrEqual((viewportMetrics.statusBottom ?? 0) - 1);
	expect(viewportMetrics.partyBottom).toBeLessThanOrEqual((viewportMetrics.battlefieldBottom ?? Number.POSITIVE_INFINITY) + 1);
	expect(viewportMetrics.firstFanOffset + viewportMetrics.lastFanOffset).toBeCloseTo(0, 5);
	expect(viewportMetrics.firstFanRotation + viewportMetrics.lastFanRotation).toBeCloseTo(0, 5);
	await expect(page.getByTestId('battle-enemy').first()).toContainText('Wolf');
	await expect(page.getByTestId('battle-party-member').first()).toContainText('Hero');
	await expect
		.poll(async () =>
			page
				.getByTestId('battle-party-member')
				.first()
				.locator('.battle-party-art')
				.evaluate((art) => {
					const { width, height } = art.getBoundingClientRect();
					return Math.round((width / height) * 100) / 100;
				}),
		)
		.toBe(1);
	await expect(page.getByTestId('battle-enemy').first().locator('.battle-enemy-art')).toHaveCSS('background-size', '300% 300%');
	await expect(page.getByTestId('combat-scene').getByRole('heading', { name: 'Battle encounter' })).toBeAttached();
	await expect(page.getByTestId('combat-scene').getByText('Hold the line together.')).toHaveCount(0);
	await expect(page.getByTestId('daily-command-center')).toContainText('Your card plan is needed');
	await expect(page.getByTestId('combat-scene').getByTestId('gameplay-mechanics')).toHaveCount(0);
	await expect(page.getByTestId('battle-deck-toggle')).toHaveCount(0);
	await expect(page.getByTestId('battle-play-queue')).toHaveAttribute('data-queue-state', 'collapsed');
	await expect(page.getByTestId('battle-command-tray')).toContainText('0/3');
	await expect(page.getByTestId('battle-card-class-basic-attack')).toContainText('Damage 5');
	await page.getByTestId('battle-card-filter-class').click();
	await expect(page.getByTestId('battle-card-filter-class')).toHaveAttribute('aria-selected', 'true');
	await expect(page.getByTestId('battle-card-item-herb')).toHaveCount(0);
	await page.getByTestId('battle-card-filter-all').click();
	await cardFan.scrollIntoViewIfNeeded();
	const scrollBeforeCardSelect = await page.evaluate(() => window.scrollY);
	const shieldWall = page.getByTestId('battle-card-class-shield-wall');
	await shieldWall.evaluate((card) => (card as HTMLButtonElement).click());
	await expect(shieldWall).toContainText('Guard 4');
	await expect(page.getByTestId('battle-card-preview-detail')).toContainText('Guard 4');
	await expect(shieldWall).toHaveAttribute('data-queued', 'true');
	await expect(shieldWall).toHaveAttribute('data-queued-order', '1');
	await expect(shieldWall.locator('.battle-fan-card-queued-badge')).toContainText('1');
	await expect(page.getByTestId('battle-queued-card-1')).toHaveAttribute('data-card-key', 'class:shield-wall');
	await expect(page.getByTestId('battle-queued-card-1')).toHaveAttribute('data-category', 'class');
	await expect(page.getByTestId('battle-play-queue')).toHaveAttribute('data-queue-state', 'expanded');
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCardSelect);
	await page.getByTestId('battle-queued-card-1').evaluate((card) => (card as HTMLButtonElement).click());
	await expect(page.getByTestId('battle-play-queue')).toContainText('Plan · 0/3');
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCardSelect);
	await page.getByTestId('battle-card-item-herb').evaluate((card) => (card as HTMLButtonElement).click());
	const herbCard = page.getByTestId('battle-card-item-herb');
	await expect(herbCard).toHaveAttribute('data-queued-count', '1');
	await expect(page.getByTestId('battle-queued-card-1')).toHaveAttribute('data-category', 'item');
	await page.getByTestId('battle-card-class-basic-attack').evaluate((card) => (card as HTMLButtonElement).click());
	await page.getByTestId('battle-card-class-basic-attack').evaluate((card) => (card as HTMLButtonElement).click());
	await expect(page.getByTestId('battle-card-class-basic-attack')).toHaveAttribute('data-queued-count', '2');
	const queueFanMetrics = await page.evaluate(() => {
		const scene = document.querySelector<HTMLElement>('[data-testid="combat-scene"]')?.getBoundingClientRect();
		const queue = document.querySelector<HTMLElement>('[data-testid="battle-play-queue"]')?.getBoundingClientRect();
		const handColumn = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const queueListElement = document.querySelector<HTMLElement>('.battle-play-queue-list');
		const queueList = queueListElement?.getBoundingClientRect();
		const lockPlan = document.querySelector<HTMLElement>('[data-testid="battle-save-plan"]')?.getBoundingClientRect();
		const lockAction = document.querySelector<HTMLElement>('.battle-plan-action')?.getBoundingClientRect();
		const queueListStyles = queueListElement ? getComputedStyle(queueListElement).overflow : null;
		const cards = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-queued-card-"]')].map((card) =>
			card.getBoundingClientRect(),
		);
		const cardWrappers = [...document.querySelectorAll<HTMLElement>('.battle-play-queue-list > div')];
		const queueOffsets = cardWrappers.map((wrapper) => Number.parseFloat(getComputedStyle(wrapper).getPropertyValue('--queue-fan-offset')));
		const queueRotations = cardWrappers.map((wrapper) =>
			Number.parseFloat(getComputedStyle(wrapper).getPropertyValue('--queue-fan-rotation')),
		);
		const queueDrops = cardWrappers.map((wrapper) => Number.parseFloat(getComputedStyle(wrapper).getPropertyValue('--queue-fan-drop')));
		return {
			sceneLeft: scene?.left ?? 0,
			queueWidth: queue?.width ?? 0,
			queueCenter: queue ? (queue.left + queue.right) / 2 : 0,
			handCenter: handColumn ? (handColumn.left + handColumn.right) / 2 : 0,
			queueBottom: queue?.bottom ?? 0,
			handTop: handColumn?.top ?? 0,
			queueListTop: queueList?.top ?? 0,
			queueListBottom: queueList?.bottom ?? 0,
			lockWidth: lockPlan?.width ?? 0,
			lockActionWidth: lockAction?.width ?? 0,
			lockHeight: lockPlan?.height ?? 0,
			queueListOverflow: queueListStyles,
			cardsInsideScene:
				Boolean(scene) && cards.every((card) => card.top >= (scene?.top ?? 0) + 1 && card.bottom <= (scene?.bottom ?? 0) - 1),
			lockActionRight: lockAction?.right ?? 0,
			firstCardLeft: cards[0]?.left ?? 0,
			cardBottom: cards.length > 0 ? Math.max(...cards.map((card) => card.bottom)) : 0,
			overlaps: cards.slice(1).some((card, index) => card.left < cards[index].right - 2),
			firstOffset: queueOffsets[0] ?? 0,
			lastOffset: queueOffsets.at(-1) ?? 0,
			firstRotation: queueRotations[0] ?? 0,
			lastRotation: queueRotations.at(-1) ?? 0,
			queueCardCount: cardWrappers.length,
			firstDrop: queueDrops[0] ?? 0,
			centerDrop: queueDrops[Math.floor((queueDrops.length - 1) / 2)] ?? 0,
			lastDrop: queueDrops.at(-1) ?? 0,
		};
	});
	expect(queueFanMetrics.overlaps).toBe(true);
	expect(queueFanMetrics.queueCenter).toBeCloseTo(queueFanMetrics.handCenter, 0);
	expect(queueFanMetrics.queueBottom).toBeLessThanOrEqual(queueFanMetrics.handTop + 1);
	expect(queueFanMetrics.firstOffset + queueFanMetrics.lastOffset).toBeCloseTo(0, 5);
	expect(queueFanMetrics.firstRotation + queueFanMetrics.lastRotation).toBeCloseTo(0, 5);
	if (queueFanMetrics.queueCardCount > 2) {
		expect(queueFanMetrics.firstDrop).toBeCloseTo(queueFanMetrics.lastDrop, 5);
		expect(queueFanMetrics.firstDrop).toBeGreaterThan(queueFanMetrics.centerDrop);
	}
	expect(queueFanMetrics.firstCardLeft).toBeGreaterThanOrEqual(queueFanMetrics.sceneLeft + 12);
	expect(queueFanMetrics.lockWidth).toBeLessThan(queueFanMetrics.queueWidth);
	expect(queueFanMetrics.lockActionWidth - queueFanMetrics.lockWidth).toBeLessThan(32);
	expect(queueFanMetrics.lockHeight).toBeLessThan(40);
	expect(queueFanMetrics.queueListOverflow).toBe('visible');
	expect(queueFanMetrics.cardsInsideScene).toBe(true);
	expect(queueFanMetrics.queueBottom - queueFanMetrics.cardBottom).toBeLessThan(48);
	expect(queueFanMetrics.lockActionRight).toBeGreaterThan(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCardSelect);
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

	await page.getByTestId('battle-queued-card-1').click();
	await expect(page.getByTestId('battle-status')).toContainText(/review your cards and save/i);
});

test('keeps the selected fan and lock action inside a phone battle viewport', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await page.setViewportSize({ width: 390, height: 844 });
	await authenticate(page);
	await page.goto('/parties/party-1');

	const combatScene = page.getByTestId('combat-scene');
	await combatScene.scrollIntoViewIfNeeded();
	await page.getByTestId('battle-card-class-shield-wall').click();
	await page.getByTestId('battle-card-item-herb').click();
	await page.getByTestId('battle-card-class-basic-attack').click();

	const metrics = await page.evaluate(() => {
		const scene = document.querySelector<HTMLElement>('[data-testid="combat-scene"]')?.getBoundingClientRect();
		const queue = document.querySelector<HTMLElement>('[data-testid="battle-play-queue"]')?.getBoundingClientRect();
		const handColumn = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const queueHeadingElement = document.querySelector<HTMLElement>('.battle-play-queue-heading');
		const queueHeading = queueHeadingElement?.getBoundingClientRect();
		const queueHeadingPaddingLeft = queueHeadingElement ? Number.parseFloat(getComputedStyle(queueHeadingElement).paddingLeft) : 0;
		const action = document.querySelector<HTMLElement>('.battle-plan-action')?.getBoundingClientRect();
		const lock = document.querySelector<HTMLElement>('[data-testid="battle-save-plan"]')?.getBoundingClientRect();
		const sceneElement = document.querySelector<HTMLElement>('[data-testid="combat-scene"]');
		const handViewport = document.querySelector<HTMLElement>('.battle-card-hand-viewport')?.getBoundingClientRect();
		const queueListElement = document.querySelector<HTMLElement>('.battle-play-queue-list');
		const queueList = queueListElement?.getBoundingClientRect();
		const targetNote = document.querySelector<HTMLElement>('.battle-fan-target-note')?.getBoundingClientRect();
		const cards = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-queued-card-"]')].map((card) =>
			card.getBoundingClientRect(),
		);
		const handCards = [...document.querySelectorAll<HTMLElement>('.battle-fan-card')].map((card) => card.getBoundingClientRect());
		const badges = [...document.querySelectorAll<HTMLElement>('.battle-fan-card-queued-badge')].map((badge) =>
			badge.getBoundingClientRect(),
		);
		const queueListOverflow = queueListElement ? getComputedStyle(queueListElement).overflow : null;
		const categoryRects = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-card-filter-"]')].map((filter) =>
			filter.getBoundingClientRect(),
		);
		const enemyRects = [...document.querySelectorAll<HTMLElement>('.battle-enemy')].map((enemy) => enemy.getBoundingClientRect());
		const intersects = (rectA: DOMRect, rectB: DOMRect) =>
			rectA.left < rectB.right && rectA.right > rectB.left && rectA.top < rectB.bottom && rectA.bottom > rectB.top;
		return {
			viewportWidth: window.innerWidth,
			documentWidth: document.documentElement.scrollWidth,
			sceneLeft: scene?.left ?? 0,
			sceneRight: scene?.right ?? 0,
			sceneBottom: scene?.bottom ?? 0,
			queueLeft: queue?.left ?? 0,
			queueRight: queue?.right ?? 0,
			queueCenter: queue ? (queue.left + queue.right) / 2 : 0,
			handCenter: handColumn ? (handColumn.left + handColumn.right) / 2 : 0,
			queueTop: queue?.top ?? 0,
			queueBottom: queue?.bottom ?? 0,
			handColumnTop: handColumn?.top ?? 0,
			queueHeadingLeft: (queueHeading?.left ?? 0) + queueHeadingPaddingLeft,
			actionRight: action?.right ?? 0,
			actionTop: action?.top ?? 0,
			actionBottom: action?.bottom ?? 0,
			lockLeft: lock?.left ?? 0,
			lockRight: lock?.right ?? 0,
			lockWidth: lock?.width ?? 0,
			actionWidth: action?.width ?? 0,
			lockBottom: lock?.bottom ?? 0,
			innerFrameRemoved: sceneElement ? getComputedStyle(sceneElement, '::before').content === 'none' : false,
			queueListOverflow,
			cardsInsideScene:
				Boolean(scene) && cards.every((card) => card.top >= (scene?.top ?? 0) + 1 && card.bottom <= (scene?.bottom ?? 0) - 1),
			handViewportLeft: handViewport?.left ?? 0,
			handViewportTop: handViewport?.top ?? 0,
			handViewportBottom: handViewport?.bottom ?? 0,
			queueListTop: queueList?.top ?? 0,
			queueListBottom: queueList?.bottom ?? 0,
			targetNoteBottom: targetNote?.bottom ?? 0,
			cards,
			handCards,
			badges,
			categoriesIntersectEnemies: categoryRects.some((categoryRect) => enemyRects.some((enemyRect) => intersects(categoryRect, enemyRect))),
		};
	});
	expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
	expect(metrics.queueLeft).toBeGreaterThanOrEqual(metrics.sceneLeft - 1);
	expect(metrics.queueRight).toBeLessThanOrEqual(metrics.sceneRight + 1);
	expect(metrics.actionRight).toBeLessThanOrEqual(metrics.sceneRight - 6);
	expect(metrics.actionBottom).toBeLessThanOrEqual(metrics.sceneBottom - 6);
	expect(metrics.lockLeft).toBeGreaterThanOrEqual(metrics.sceneLeft - 1);
	expect(metrics.lockRight).toBeLessThanOrEqual(metrics.actionRight - 4);
	expect(metrics.actionWidth - metrics.lockWidth).toBeLessThan(32);
	expect(metrics.actionRight - metrics.lockRight).toBeGreaterThanOrEqual(0);
	expect(metrics.actionRight - metrics.lockRight).toBeLessThan(32);
	expect(metrics.lockBottom).toBeLessThanOrEqual(metrics.actionBottom - 4);
	expect(metrics.innerFrameRemoved).toBe(true);
	expect(metrics.queueListOverflow).toBe('visible');
	expect(metrics.cardsInsideScene).toBe(true);
	expect(metrics.queueCenter).toBeCloseTo(metrics.handCenter, 0);
	expect(metrics.queueBottom).toBeLessThanOrEqual(metrics.handColumnTop + 1);
	expect(metrics.categoriesIntersectEnemies).toBe(false);
	expect(metrics.targetNoteBottom).toBeLessThanOrEqual(metrics.actionTop + 1);
	for (const card of metrics.cards) {
		expect(card.left).toBeGreaterThanOrEqual(metrics.sceneLeft + 12);
		expect(card.right).toBeLessThanOrEqual(metrics.sceneRight - 7);
		expect(card.top).toBeGreaterThanOrEqual(metrics.queueTop - 1);
		expect(card.bottom).toBeLessThanOrEqual(metrics.queueBottom + 2);
	}
	for (const card of metrics.handCards) {
		expect(card.top).toBeGreaterThanOrEqual(metrics.handViewportTop - 1);
		expect(card.bottom).toBeLessThanOrEqual(metrics.handViewportBottom + 1);
	}
	for (const badge of metrics.badges) {
		expect(badge.top).toBeGreaterThanOrEqual(metrics.handViewportTop - 1);
		expect(badge.bottom).toBeLessThanOrEqual(metrics.handViewportBottom + 1);
	}
	expect(metrics.queueHeadingLeft).toBeGreaterThanOrEqual(metrics.sceneLeft + 12);
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
