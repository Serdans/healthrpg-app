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

test('keeps the newer direction active when the previous key is released', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'dungeon-grid', dungeonWalkDelayMs: 200 } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await page.getByTestId('dungeon-grid-viewport').focus();
	const before = await walkCount(request);
	await page.keyboard.down('ArrowRight');
	await page.keyboard.down('ArrowLeft');
	await page.keyboard.up('ArrowRight');

	await expect.poll(async () => walkCount(request)).toBeGreaterThanOrEqual(before + 2);
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'manual', steps: ['left'] },
		});
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
	const viewportMetrics = await cardFan.evaluate((fan) => {
		const cards = [...fan.querySelectorAll<HTMLElement>('.battle-fan-card')];
		const fanSlots = [...fan.querySelectorAll<HTMLElement>('.battle-fan-card-slot')];
		const cardRects = cards.map((card) => card.getBoundingClientRect());
		const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		const cardEntries = cards.map((card, index) => {
			const dropRem = Number.parseFloat(fanSlots[index]?.style.getPropertyValue('--fan-drop') ?? '');
			return {
				queued: card.dataset.queued === 'true',
				rect: cardRects[index],
				drop: Number.isFinite(dropRem) && Number.isFinite(rootFontSize) ? dropRem * rootFontSize : 0,
			};
		});
		const idleCardRects = cardEntries.filter(({ queued }) => !queued).map(({ rect }) => rect);
		const queuedCardRects = cardEntries.filter(({ queued }) => queued).map(({ rect }) => rect);
		const fanMaxDrop = Math.max(0, ...cardEntries.map(({ drop }) => drop));
		const centerCardEntry = cardEntries.length > 0 ? cardEntries[Math.floor((cardEntries.length - 1) / 2)] : null;
		const outerCardEntries = cardEntries.length >= 3 ? [cardEntries[0], cardEntries.at(-1)!] : [];
		const fanRect = fan.getBoundingClientRect();
		const overlaps = cardRects.slice(1).some((rect, index) => rect.left < cardRects[index].right - 4);
		const handColumnRect = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const handViewportRect = document.querySelector<HTMLElement>('.battle-card-hand-viewport')?.getBoundingClientRect();
		const handViewportElement = document.querySelector<HTMLElement>('.battle-card-hand-viewport');
		const handViewportStyles = handViewportElement ? getComputedStyle(handViewportElement) : null;
		const sceneElement = document.querySelector<HTMLElement>('[data-testid="combat-scene"]');
		const stageRect = document.querySelector<HTMLElement>('.battle-stage')?.getBoundingClientRect();
		const categoryRects = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-card-filter-"]')].map((filter) =>
			filter.getBoundingClientRect(),
		);
		const battlefieldRect = document.querySelector<HTMLElement>('[data-testid="battlefield"]')?.getBoundingClientRect();
		const arenaRect = document.querySelector<HTMLElement>('[data-testid="battlefield-arena"]')?.getBoundingClientRect();
		const statusRect = document.querySelector<HTMLElement>('[data-testid="battle-status"]')?.getBoundingClientRect();
		const commandTrayElement = document.querySelector<HTMLElement>('[data-testid="battle-command-tray"]');
		const targetNoteElement = document.querySelector<HTMLElement>('.battle-fan-target-note');
		const targetNoteRect = targetNoteElement?.getBoundingClientRect();
		const partyAndEnemyRects = [...document.querySelectorAll<HTMLElement>('.battle-party-member, .battle-enemy')].map((entity) =>
			entity.getBoundingClientRect(),
		);
		const partyRects = [...document.querySelectorAll<HTMLElement>('.battle-party-member')].map((partyMember) =>
			partyMember.getBoundingClientRect(),
		);
		const arenaActorRects = [...document.querySelectorAll<HTMLElement>('.battle-arena-target')].map((actor) =>
			actor.getBoundingClientRect(),
		);
		const labelRects = [...document.querySelectorAll<HTMLElement>('.battle-arena-label')].map((label) => label.getBoundingClientRect());
		const fanOffsets = fanSlots.map((slot) => Number.parseFloat(slot.style.getPropertyValue('--fan-offset')));
		const fanRotations = fanSlots.map((slot) => Number.parseFloat(slot.style.getPropertyValue('--fan-rotation')));
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
		const categoriesIntersectActors = categoryRects.some((categoryRect) =>
			arenaActorRects.some((actorRect) => intersectsEnemy(categoryRect, actorRect)),
		);
		const categoriesStayInsideHand = categoryRects.every(
			(categoryRect) =>
				handColumnRect !== undefined && categoryRect.left >= handColumnRect.left - 1 && categoryRect.right <= handColumnRect.right + 1,
		);
		const fanPeek = Number.parseFloat(
			getComputedStyle(document.querySelector<HTMLElement>('[data-testid="battle-card-hand-frame"]') as HTMLElement).getPropertyValue(
				'--battle-fan-peek',
			),
		);
		const idleFanBottom = idleCardRects.length > 0 ? Math.max(...idleCardRects.map((cardRect) => cardRect.bottom)) : null;
		const cardsRespectPeek =
			Boolean(handViewportRect && stageRect && Number.isFinite(fanPeek) && Number.isFinite(fanMaxDrop)) &&
			cardEntries.every(
				({ queued, rect }) =>
					rect.top >= handViewportRect!.top - 1 &&
					(queued ? rect.bottom <= handViewportRect!.bottom + 2 : rect.bottom <= stageRect!.bottom + fanPeek + fanMaxDrop + 12),
			);
		const idleCardsPeekBelowStage = Boolean(stageRect && idleFanBottom !== null) && idleFanBottom! >= stageRect!.bottom + 1;
		const queuedCardsStayInsideHandViewport =
			Boolean(handViewportRect) && queuedCardRects.every((cardRect) => cardRect.bottom <= handViewportRect!.bottom + 2);
		const actorsStayInsideArena = arenaActorRects.every(
			(actorRect) =>
				arenaRect !== undefined &&
				actorRect.left >= arenaRect.left - 1 &&
				actorRect.right <= arenaRect.right + 1 &&
				actorRect.bottom <= (battlefieldRect?.bottom ?? Number.POSITIVE_INFINITY) + 1,
		);
		const labelsStayInsideBattlefield = labelRects.every(
			(labelRect) =>
				battlefieldRect !== undefined &&
				labelRect.left >= battlefieldRect.left - 1 &&
				labelRect.right <= battlefieldRect.right + 1 &&
				labelRect.top >= battlefieldRect.top - 1,
		);
		const labelsClearActors = labelRects.every((labelRect) => arenaActorRects.every((actorRect) => !intersectsEnemy(labelRect, actorRect)));
		const battleCanvasIsPixi = document.querySelector('[data-testid="battle-arena-canvas"]')?.getAttribute('data-renderer') === 'pixi';
		return {
			fanTop: Math.round(Math.min(...cardRects.map((rect) => rect.top))),
			fanBottom: Math.round(Math.max(...cardRects.map((rect) => rect.bottom))),
			fanPeek,
			fanMaxDrop,
			outerCardsAreNotRaised: centerCardEntry !== null && outerCardEntries.every(({ rect }) => rect.top >= centerCardEntry.rect.top - 2),
			fanArcIsSymmetric: outerCardEntries.length === 0 || Math.abs(outerCardEntries[0].drop - outerCardEntries[1].drop) <= 0.1,
			idleCardsPeekBelowStage,
			fanBottomWithinPeek:
				Boolean(stageRect && cardRects.length > 0 && Number.isFinite(fanPeek) && Number.isFinite(fanMaxDrop)) &&
				Math.max(...cardRects.map((rect) => rect.bottom)) <= stageRect!.bottom + fanPeek + fanMaxDrop + 12,
			overlaps,
			intersectsSideFormation,
			handCenter: handColumnRect ? Math.round((handColumnRect.left + handColumnRect.right) / 2) : null,
			categoriesIntersectActors,
			categoriesStayInsideHand,
			cardsRespectPeek,
			queuedCardsStayInsideHandViewport,
			handVerticallyClipsFan: handViewportStyles?.overflowY === 'hidden',
			innerFrameRemoved: sceneElement ? getComputedStyle(sceneElement, '::before').content === 'none' : false,
			handLeft: Math.round(fanRect.left),
			fanWidth: Math.round(fanRect.width),
			battlefieldTop: battlefieldRect ? Math.round(battlefieldRect.top) : null,
			battlefieldBottom: battlefieldRect ? Math.round(battlefieldRect.bottom) : null,
			actorsStayInsideArena,
			labelsStayInsideBattlefield,
			labelsClearActors,
			battleCanvasIsPixi,
			trayBackgroundIsTransparent: commandTrayElement ? getComputedStyle(commandTrayElement).backgroundColor === 'rgba(0, 0, 0, 0)' : false,
			targetNoteInsideScene:
				Boolean(sceneElement && targetNoteRect) &&
				targetNoteRect!.top >= (sceneElement?.getBoundingClientRect().top ?? 0) &&
				targetNoteRect!.bottom <= (sceneElement?.getBoundingClientRect().bottom ?? 0),
			targetNoteAboveHand: Boolean(targetNoteRect && handViewportRect) && targetNoteRect!.bottom <= handViewportRect!.top + 1,
			targetNoteClearOfCards:
				Boolean(targetNoteRect) &&
				cardRects.every(
					(cardRect) =>
						targetNoteRect!.right <= cardRect.left ||
						targetNoteRect!.left >= cardRect.right ||
						targetNoteRect!.bottom <= cardRect.top ||
						targetNoteRect!.top >= cardRect.bottom,
				),
			targetNoteFits: targetNoteElement ? targetNoteElement.scrollHeight <= targetNoteElement.clientHeight + 1 : false,
			statusBottom: statusRect ? Math.round(statusRect.bottom) : null,
			partyTop: partyRects.length > 0 ? Math.round(Math.min(...partyRects.map((rect) => rect.top))) : null,
			partyBottom: partyRects.length > 0 ? Math.round(Math.max(...partyRects.map((rect) => rect.bottom))) : null,
			viewportHeight: window.innerHeight,
			fanCardCount: cards.length,
			firstFanOffset: fanOffsets[0] ?? 0,
			lastFanOffset: fanOffsets.at(-1) ?? 0,
			firstFanRotation: fanRotations[0] ?? 0,
			lastFanRotation: fanRotations.at(-1) ?? 0,
		};
	});
	expect(viewportMetrics.fanTop).toBeGreaterThanOrEqual(0);
	expect(viewportMetrics.fanBottom).toBeLessThanOrEqual(
		viewportMetrics.viewportHeight + viewportMetrics.fanPeek + viewportMetrics.fanMaxDrop + 12,
	);
	expect(viewportMetrics.outerCardsAreNotRaised).toBe(true);
	expect(viewportMetrics.fanArcIsSymmetric).toBe(true);
	expect(viewportMetrics.fanBottomWithinPeek).toBe(true);
	expect(viewportMetrics.idleCardsPeekBelowStage).toBe(true);
	expect(viewportMetrics.queuedCardsStayInsideHandViewport).toBe(true);
	expect(viewportMetrics.cardsRespectPeek).toBe(true);
	expect(viewportMetrics.handVerticallyClipsFan).toBe(true);
	expect(viewportMetrics.overlaps).toBe(true);
	expect(viewportMetrics.intersectsSideFormation).toBe(false);
	expect(viewportMetrics.categoriesIntersectActors).toBe(false);
	expect(viewportMetrics.categoriesStayInsideHand).toBe(true);
	expect(viewportMetrics.actorsStayInsideArena).toBe(true);
	expect(viewportMetrics.labelsStayInsideBattlefield).toBe(true);
	expect(viewportMetrics.labelsClearActors).toBe(true);
	expect(viewportMetrics.battleCanvasIsPixi).toBe(true);
	expect(viewportMetrics.trayBackgroundIsTransparent).toBe(true);
	expect(viewportMetrics.targetNoteInsideScene).toBe(true);
	expect(viewportMetrics.targetNoteAboveHand).toBe(true);
	expect(viewportMetrics.targetNoteClearOfCards).toBe(true);
	expect(viewportMetrics.targetNoteFits).toBe(true);
	expect(viewportMetrics.innerFrameRemoved).toBe(true);
	expect(viewportMetrics.fanWidth).toBeGreaterThan(0);
	if (viewportMetrics.fanCardCount > 2) expect(viewportMetrics.firstFanRotation + viewportMetrics.lastFanRotation).toBeCloseTo(0, 5);
	expect(viewportMetrics.partyTop).toBeGreaterThanOrEqual((viewportMetrics.battlefieldTop ?? 0) - 1);
	expect(viewportMetrics.partyTop).toBeGreaterThanOrEqual((viewportMetrics.statusBottom ?? 0) - 1);
	expect(viewportMetrics.partyBottom).toBeLessThanOrEqual((viewportMetrics.battlefieldBottom ?? Number.POSITIVE_INFINITY) + 1);
	expect(viewportMetrics.firstFanOffset + viewportMetrics.lastFanOffset).toBeCloseTo(0, 5);
	expect(viewportMetrics.firstFanRotation + viewportMetrics.lastFanRotation).toBeCloseTo(0, 5);
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
	await expect(page.getByTestId('battle-card-preview-layer')).toHaveAttribute('aria-hidden', 'true');
	await expect(hoverPreview).toHaveCSS('pointer-events', 'none');
	await expect(page.getByTestId('battle-card-hand-viewport')).toHaveCSS('touch-action', 'pan-x');
	const previewBounds = await hoverPreview.boundingBox();
	if (!previewBounds) throw new Error('Battle preview bounds are missing.');
	await page.mouse.move(previewBounds.x + previewBounds.width / 2, previewBounds.y + previewBounds.height / 2);
	await expect(hoverPreview).toBeVisible();
	const hoverCardLayout = await hoverPreview.evaluate((card) => {
		const description = card.querySelector<HTMLElement>('.battle-card-description');
		const meta = card.querySelector<HTMLElement>('.battle-card-meta');
		if (!description || !meta) throw new Error('Hover card text layout is missing.');
		const descriptionStyles = getComputedStyle(description);
		return {
			display: descriptionStyles.display,
			overflowY: descriptionStyles.overflowY,
			lineClamp: descriptionStyles.getPropertyValue('-webkit-line-clamp'),
			descriptionBottom: description.offsetTop + description.offsetHeight,
			metaTop: meta.offsetTop,
		};
	});
	expect(hoverCardLayout.display).not.toBe('-webkit-box');
	expect(hoverCardLayout.overflowY).toBe('auto');
	expect(hoverCardLayout.lineClamp).toBe('none');
	expect(hoverCardLayout.descriptionBottom).toBeLessThanOrEqual(hoverCardLayout.metaTop + 1);
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
	await page.waitForTimeout(150);
	await expect(page.getByTestId('battle-card-preview')).toHaveCount(0);
	await expect(queuedShieldWall.locator('.battle-fan-card-surface')).toHaveCSS('visibility', 'visible');
	await expect(queuedShieldWall.locator('xpath=..')).toHaveAttribute('data-preview-active', 'false');
	const focusedStack = await queuedShieldWall.evaluate((card) => {
		const slot = card.parentElement;
		const siblingStackOrders = slot?.parentElement
			? [...slot.parentElement.querySelectorAll<HTMLElement>('.battle-fan-card-slot')]
					.filter((candidate) => candidate !== slot)
					.map((candidate) => Number.parseInt(getComputedStyle(candidate).zIndex, 10))
					.filter((value) => Number.isFinite(value))
			: [];
		return {
			focused: slot?.dataset.focused === 'true',
			stackOrder: slot ? Number.parseInt(getComputedStyle(slot).zIndex, 10) : 0,
			maxSiblingStackOrder: Math.max(0, ...siblingStackOrders),
		};
	});
	expect(focusedStack.focused).toBe(true);
	expect(focusedStack.stackOrder).toBeGreaterThan(focusedStack.maxSiblingStackOrder);
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
	const fanMetrics = await page.evaluate(() => {
		const scene = document.querySelector<HTMLElement>('[data-testid="combat-scene"]')?.getBoundingClientRect();
		const stage = document.querySelector<HTMLElement>('.battle-stage')?.getBoundingClientRect();
		const handColumn = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const handViewport = document.querySelector<HTMLElement>('.battle-card-hand-viewport')?.getBoundingClientRect();
		const planSummary = document.querySelector<HTMLElement>('[data-testid="battle-plan-summary"]')?.getBoundingClientRect();
		const lockPlan = document.querySelector<HTMLElement>('[data-testid="battle-save-plan"]')?.getBoundingClientRect();
		const lockAction = document.querySelector<HTMLElement>('[data-testid="battle-plan-action"]')?.getBoundingClientRect();
		const handFrame = document.querySelector<HTMLElement>('[data-testid="battle-card-hand-frame"]');
		const cards = [...document.querySelectorAll<HTMLElement>('.battle-fan-card')];
		const cardRects = cards.map((card) => card.getBoundingClientRect());
		const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		const cardEntries = cards.map((card, index) => {
			const dropRem = Number.parseFloat(card.parentElement?.style.getPropertyValue('--fan-drop') ?? '');
			return {
				queued: card.dataset.queued === 'true',
				rect: cardRects[index],
				drop: Number.isFinite(dropRem) && Number.isFinite(rootFontSize) ? dropRem * rootFontSize : 0,
			};
		});
		const idleCardRects = cardEntries.filter(({ queued }) => !queued).map(({ rect }) => rect);
		const queuedCardRects = cardEntries.filter(({ queued }) => queued).map(({ rect }) => rect);
		const fanMaxDrop = Math.max(0, ...cardEntries.map(({ drop }) => drop));
		const fanPeek = Number.parseFloat(
			getComputedStyle(document.querySelector<HTMLElement>('[data-testid="battle-card-hand-frame"]') as HTMLElement).getPropertyValue(
				'--battle-fan-peek',
			),
		);
		const fanTop = cardRects.length > 0 ? Math.min(...cardRects.map((card) => card.top)) : null;
		const idleFanBottom = idleCardRects.length > 0 ? Math.max(...idleCardRects.map((card) => card.bottom)) : null;
		const cardSlots = [...document.querySelectorAll<HTMLElement>('.battle-fan-card-slot')];
		const fanOffsets = cardSlots.map((slot) => Number.parseFloat(slot.style.getPropertyValue('--fan-offset')));
		const fanRotations = cardSlots.map((slot) => Number.parseFloat(slot.style.getPropertyValue('--fan-rotation')));
		return {
			sceneLeft: scene?.left ?? 0,
			sceneRight: scene?.right ?? 0,
			sceneTop: scene?.top ?? 0,
			sceneBottom: scene?.bottom ?? 0,
			handTop: handColumn?.top ?? 0,
			handBottom: handColumn?.bottom ?? 0,
			handViewportTop: handViewport?.top ?? 0,
			handViewportBottom: handViewport?.bottom ?? 0,
			planInsideHeader: Boolean(planSummary && handColumn && planSummary.top >= handColumn.top && planSummary.bottom <= handColumn.bottom),
			lockWidth: lockPlan?.width ?? 0,
			lockActionWidth: lockAction?.width ?? 0,
			lockHeight: lockPlan?.height ?? 0,
			lockActionLeft: lockAction?.left ?? 0,
			lockActionRight: lockAction?.right ?? 0,
			lockActionTop: lockAction?.top ?? 0,
			lockActionBottom: lockAction?.bottom ?? 0,
			lockActionInsideScene:
				Boolean(scene && lockAction) &&
				lockAction!.left >= scene!.left - 1 &&
				lockAction!.right <= scene!.right + 1 &&
				lockAction!.top >= scene!.top - 1 &&
				lockAction!.bottom <= scene!.bottom + 1,
			lockActionBesideHand: Boolean(handViewport && lockAction) && lockAction!.left >= handViewport!.right - 1,
			readyTopOffset: fanTop !== null && lockPlan ? lockPlan.top - fanTop : 0,
			fanPeek,
			idleCardsPeekBelowStage: Boolean(stage && idleFanBottom !== null) && idleFanBottom! >= stage!.bottom + 1,
			queuedCardsInsideHandViewport:
				Boolean(handViewport) &&
				queuedCardRects.every((card) => card.top >= handViewport!.top - 1 && card.bottom <= handViewport!.bottom + 2),
			fanBottomWithinPeek:
				Boolean(stage && cardRects.length > 0) &&
				Number.isFinite(fanPeek) &&
				Number.isFinite(fanMaxDrop) &&
				Math.max(...cardRects.map((card) => card.bottom)) <= stage!.bottom + fanPeek + fanMaxDrop + 12,
			cardsInsideScene:
				Boolean(scene && stage) &&
				cardRects.every((card) => card.top >= scene!.top + 1 && card.bottom <= stage!.bottom + fanPeek + fanMaxDrop + 12),
			cardsRespectPeek:
				Boolean(handViewport && stage) &&
				cardEntries.every(
					({ queued, rect }) =>
						rect.top >= handViewport!.top - 1 &&
						(queued ? rect.bottom <= handViewport!.bottom + 2 : rect.bottom <= stage!.bottom + fanPeek + fanMaxDrop + 12),
				),
			handHasLeftOverflow: handFrame?.dataset.hasLeftOverflow === 'true',
			handHasRightOverflow: handFrame?.dataset.hasRightOverflow === 'true',
			firstCardLeft: cardRects[0]?.left ?? 0,
			overlaps: cardRects.slice(1).some((card, index) => card.left < cardRects[index].right - 2),
			firstOffset: fanOffsets[0] ?? 0,
			lastOffset: fanOffsets.at(-1) ?? 0,
			firstRotation: fanRotations[0] ?? 0,
			lastRotation: fanRotations.at(-1) ?? 0,
			fanMaxDrop,
			fanCardCount: cardSlots.length,
		};
	});
	expect(fanMetrics.overlaps).toBe(true);
	expect(fanMetrics.cardsInsideScene).toBe(true);
	expect(fanMetrics.cardsRespectPeek).toBe(true);
	expect(fanMetrics.queuedCardsInsideHandViewport).toBe(true);
	expect(fanMetrics.idleCardsPeekBelowStage).toBe(true);
	expect(fanMetrics.fanBottomWithinPeek).toBe(true);
	expect(fanMetrics.planInsideHeader).toBe(true);
	expect(fanMetrics.firstOffset + fanMetrics.lastOffset).toBeCloseTo(0, 5);
	expect(fanMetrics.firstRotation + fanMetrics.lastRotation).toBeCloseTo(0, 5);
	expect(fanMetrics.firstCardLeft).toBeGreaterThanOrEqual(fanMetrics.sceneLeft + 12);
	expect(Math.abs(fanMetrics.lockActionWidth - fanMetrics.lockWidth)).toBeLessThan(2);
	expect(fanMetrics.lockHeight).toBeLessThan(40);
	expect(fanMetrics.lockActionInsideScene).toBe(true);
	expect(fanMetrics.lockActionBesideHand).toBe(true);
	expect(fanMetrics.readyTopOffset).toBeGreaterThanOrEqual(-18);
	expect(fanMetrics.readyTopOffset).toBeLessThanOrEqual(12);
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
	const initialFanGeometry = await page.evaluate(() => {
		const stage = document.querySelector<HTMLElement>('.battle-stage')?.getBoundingClientRect();
		const frame = document.querySelector<HTMLElement>('.battle-card-hand-frame');
		const viewport = document.querySelector<HTMLElement>('.battle-card-hand-viewport');
		const idleCards = [...document.querySelectorAll<HTMLElement>('.battle-fan-card')].filter((card) => card.dataset.queued !== 'true');
		const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		const idleCardEntries = idleCards.map((card) => {
			const dropRem = Number.parseFloat(card.parentElement?.style.getPropertyValue('--fan-drop') ?? '');
			return {
				rect: card.getBoundingClientRect(),
				drop: Number.isFinite(dropRem) && Number.isFinite(rootFontSize) ? dropRem * rootFontSize : 0,
			};
		});
		const idleFanBottom = idleCardEntries.length > 0 ? Math.max(...idleCardEntries.map(({ rect }) => rect.bottom)) : null;
		const fanMaxDrop = Math.max(0, ...idleCardEntries.map(({ drop }) => drop));
		const centerCardEntry = idleCardEntries.length > 0 ? idleCardEntries[Math.floor((idleCardEntries.length - 1) / 2)] : null;
		const outerCardEntries = idleCardEntries.length >= 3 ? [idleCardEntries[0], idleCardEntries.at(-1)!] : [];
		const fanPeek = Number.parseFloat(frame ? getComputedStyle(frame).getPropertyValue('--battle-fan-peek') : '');
		return {
			idleCardsPeekBelowStage: Boolean(stage && idleFanBottom !== null) && idleFanBottom! >= stage!.bottom + 1,
			fanBottomWithinPeek:
				Boolean(stage && idleFanBottom !== null) && Number.isFinite(fanPeek) && idleFanBottom! <= stage!.bottom + fanPeek + fanMaxDrop + 12,
			outerCardsAreNotRaised: centerCardEntry !== null && outerCardEntries.every(({ rect }) => rect.top >= centerCardEntry.rect.top - 2),
			handVerticallyClipsFan: viewport !== null && getComputedStyle(viewport).overflowY === 'hidden',
		};
	});
	expect(initialFanGeometry.idleCardsPeekBelowStage).toBe(true);
	expect(initialFanGeometry.fanBottomWithinPeek).toBe(true);
	expect(initialFanGeometry.outerCardsAreNotRaised).toBe(true);
	expect(initialFanGeometry.handVerticallyClipsFan).toBe(true);
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
	await expect(mobilePreview).toHaveCSS('pointer-events', 'none');
	const mobileCardLayout = await mobilePreview.evaluate((card) => {
		const description = card.querySelector<HTMLElement>('.battle-card-description');
		const meta = card.querySelector<HTMLElement>('.battle-card-meta');
		if (!description || !meta) throw new Error('Mobile selected card text layout is missing.');
		return {
			descriptionBottom: description.offsetTop + description.offsetHeight,
			metaTop: meta.offsetTop,
			metaBottom: meta.offsetTop + meta.offsetHeight,
			cardBottom: meta.offsetParent instanceof HTMLElement ? meta.offsetParent.clientHeight : 0,
		};
	});
	expect(mobileCardLayout.descriptionBottom).toBeLessThanOrEqual(mobileCardLayout.metaTop + 1);
	expect(mobileCardLayout.metaBottom).toBeLessThanOrEqual(mobileCardLayout.cardBottom + 1);
	const mobilePreviewBounds = await mobilePreview.boundingBox();
	const mobileSceneBounds = await combatScene.boundingBox();
	expect(mobilePreviewBounds).not.toBeNull();
	expect(mobileSceneBounds).not.toBeNull();
	if (!mobilePreviewBounds || !mobileSceneBounds) throw new Error('Mobile battle preview geometry is missing.');
	const mobilePreviewGeometry = await mobilePreview.evaluate((preview) => {
		const previewElement = preview as HTMLElement;
		const sourceSlot = document.querySelector<HTMLElement>('.battle-fan-card-slot[data-preview-active="true"]');
		const source = sourceSlot?.querySelector<HTMLElement>('.battle-fan-card-surface');
		if (!source) throw new Error('Mobile selected card source surface is missing.');
		return {
			sourceVisibility: getComputedStyle(source).visibility,
			sourcePreviewActive: sourceSlot?.dataset.previewActive,
			previewCardKey: previewElement.dataset.cardKey,
			sourceCardKey: sourceSlot?.querySelector<HTMLElement>('.battle-fan-card')?.dataset.cardKey,
			sourceRatio: source.offsetWidth / source.offsetHeight,
			previewRatio: previewElement.offsetWidth / previewElement.offsetHeight,
			visualRatio: previewElement.getBoundingClientRect().width / previewElement.getBoundingClientRect().height,
		};
	});
	expect(mobilePreviewGeometry.sourceVisibility).toBe('hidden');
	expect(mobilePreviewGeometry.sourcePreviewActive).toBe('true');
	expect(mobilePreviewGeometry.sourceCardKey).toBe(mobilePreviewGeometry.previewCardKey);
	expect(mobilePreviewGeometry.previewRatio).toBeCloseTo(mobilePreviewGeometry.sourceRatio, 2);
	expect(mobilePreviewGeometry.visualRatio).toBeCloseTo(mobilePreviewGeometry.sourceRatio, 2);
	expect(mobilePreviewBounds.y).toBeGreaterThanOrEqual(mobileSceneBounds.y - 1);
	expect(mobilePreviewBounds.y + mobilePreviewBounds.height).toBeLessThanOrEqual(mobileSceneBounds.y + mobileSceneBounds.height + 1);
	expect(await mobilePreview.evaluate((preview) => preview.closest('.battle-card-hand-viewport') === null)).toBe(true);
	await touchTap(shieldWall);
	await expect(page.getByTestId('battle-plan-summary')).toContainText('Plan 1/3');
	await expect(page.getByTestId('battle-card-preview')).toHaveCount(0);
	const queuedShieldWall = page.getByTestId('battle-queued-card-1');
	const handViewportControl = page.getByTestId('battle-card-hand-viewport');
	await expect(queuedShieldWall).toHaveAttribute('data-card-key', 'class:shield-wall');
	await expect(queuedShieldWall).toHaveClass(/battle-fan-card-focused/);
	await expect(queuedShieldWall.locator('.battle-fan-card-surface')).toHaveCSS('visibility', 'visible');
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

	const handFrameControl = page.getByTestId('battle-card-hand-frame');
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
	await expect(page.getByTestId('battle-card-hand-fade-start')).toHaveCount(0);
	await expect(page.getByTestId('battle-card-hand-fade-end')).toHaveCount(0);

	const metrics = await page.evaluate(() => {
		const scene = document.querySelector<HTMLElement>('[data-testid="combat-scene"]')?.getBoundingClientRect();
		const stage = document.querySelector<HTMLElement>('.battle-stage')?.getBoundingClientRect();
		const tray = document.querySelector<HTMLElement>('[data-testid="battle-command-tray"]')?.getBoundingClientRect();
		const battlefield = document.querySelector<HTMLElement>('[data-testid="battlefield"]')?.getBoundingClientRect();
		const commandCenter = document.querySelector<HTMLElement>('[data-testid="battle-command-center"]')?.getBoundingClientRect();
		const handColumn = document.querySelector<HTMLElement>('.battle-hand-column')?.getBoundingClientRect();
		const handViewport = document.querySelector<HTMLElement>('.battle-card-hand-viewport')?.getBoundingClientRect();
		const planSummary = document.querySelector<HTMLElement>('[data-testid="battle-plan-summary"]')?.getBoundingClientRect();
		const action = document.querySelector<HTMLElement>('[data-testid="battle-plan-action"]')?.getBoundingClientRect();
		const lock = document.querySelector<HTMLElement>('[data-testid="battle-save-plan"]')?.getBoundingClientRect();
		const handFrame = document.querySelector<HTMLElement>('[data-testid="battle-card-hand-frame"]');
		const sceneElement = document.querySelector<HTMLElement>('[data-testid="combat-scene"]');
		const targetNoteElement = document.querySelector<HTMLElement>('.battle-fan-target-note');
		const targetNote = targetNoteElement?.getBoundingClientRect();
		const cardElements = [...document.querySelectorAll<HTMLElement>('.battle-fan-card')];
		const badges = [...document.querySelectorAll<HTMLElement>('.battle-card-hand-viewport .battle-fan-card-queued-badge')].map((badge) =>
			badge.getBoundingClientRect(),
		);
		const handViewportElement = document.querySelector<HTMLElement>('.battle-card-hand-viewport');
		const handStyles = handViewportElement ? getComputedStyle(handViewportElement) : null;
		const handScrollbarStyles = handViewportElement ? getComputedStyle(handViewportElement, '::-webkit-scrollbar') : null;
		const fanPeek = Number.parseFloat(handFrame ? getComputedStyle(handFrame).getPropertyValue('--battle-fan-peek') : '');
		const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
		if (handViewportElement) handViewportElement.scrollLeft = 0;
		const cardEntries = cardElements.map((card) => ({ queued: card.dataset.queued === 'true', rect: card.getBoundingClientRect() }));
		const cards = cardEntries.map(({ rect }) => rect);
		const queuedCardRects = cardEntries.filter(({ queued }) => queued).map(({ rect }) => rect);
		const fanDrops = [...document.querySelectorAll<HTMLElement>('.battle-fan-card-slot')].map((slot) => {
			const dropRem = Number.parseFloat(slot.style.getPropertyValue('--fan-drop'));
			return Number.isFinite(dropRem) && Number.isFinite(rootFontSize) ? dropRem * rootFontSize : 0;
		});
		const fanMaxDrop = Math.max(0, ...fanDrops);
		const fanTop = cards.length > 0 ? Math.min(...cards.map((card) => card.top)) : null;
		const firstCardAtStart = cards.at(0);
		const maxHandScroll = handViewportElement ? Math.max(0, handViewportElement.scrollWidth - handViewportElement.clientWidth) : 0;
		if (handViewportElement) handViewportElement.scrollLeft = maxHandScroll;
		const cardsAtEnd = [...document.querySelectorAll<HTMLElement>('.battle-fan-card')].map((card) => card.getBoundingClientRect());
		const lastCardAtEnd = cardsAtEnd.at(-1);
		const edgeFadeCards = [
			...document.querySelectorAll<HTMLElement>(
				'.battle-fan-card[data-edge-fade-left="true"], .battle-fan-card[data-edge-fade-right="true"]',
			),
		];
		const categoryRects = [...document.querySelectorAll<HTMLElement>('[data-testid^="battle-card-filter-"]')].map((filter) =>
			filter.getBoundingClientRect(),
		);
		const actorRects = [...document.querySelectorAll<HTMLElement>('.battle-arena-target')].map((actor) => actor.getBoundingClientRect());
		const labelRects = [...document.querySelectorAll<HTMLElement>('.battle-arena-label')].map((label) => label.getBoundingClientRect());
		const labelEntries = [...document.querySelectorAll<HTMLElement>('.battle-arena-label')].map((label) => ({
			side: label.dataset.arenaSide,
			row: label.dataset.arenaRow,
			rect: label.getBoundingClientRect(),
		}));
		const intersects = (rectA: DOMRect, rectB: DOMRect) =>
			rectA.left < rectB.right && rectA.right > rectB.left && rectA.top < rectB.bottom && rectA.bottom > rectB.top;
		const labelsOverlap = labelEntries.some((left, index) =>
			labelEntries
				.slice(index + 1)
				.some((right) => left.side === right.side && left.row === right.row && intersects(left.rect, right.rect)),
		);
		return {
			viewportWidth: window.innerWidth,
			documentWidth: document.documentElement.scrollWidth,
			trayHeight: tray?.height ?? 0,
			trayBottomAlignedWithStage: Boolean(stage && tray) && Math.abs(tray!.bottom - stage!.bottom) <= 1,
			actorsInsideBattlefield: actorRects.every(
				(actor) =>
					battlefield !== undefined &&
					actor.left >= battlefield.left - 1 &&
					actor.right <= battlefield.right + 1 &&
					actor.bottom <= battlefield.bottom + 1,
			),
			labelsInsideBattlefield: labelRects.every(
				(label) =>
					battlefield !== undefined &&
					label.left >= battlefield.left - 1 &&
					label.right <= battlefield.right + 1 &&
					label.top >= battlefield.top - 1,
			),
			labelsClearActors: labelRects.every((label) => actorRects.every((actor) => !intersects(label, actor))),
			labelsClearCards: labelRects.every((label) => cards.every((card) => !intersects(label, card))),
			labelsOverlap,
			actorsClearCards: actorRects.every((actor) => cards.every((card) => !intersects(actor, card))),
			sceneLeft: scene?.left ?? 0,
			sceneRight: scene?.right ?? 0,
			sceneBottom: scene?.bottom ?? 0,
			commandCenterWidth: commandCenter?.width ?? 0,
			planInsideHeader: Boolean(planSummary && handColumn && planSummary.left >= handColumn.left && planSummary.right <= handColumn.right),
			lockLeft: lock?.left ?? 0,
			lockWidth: lock?.width ?? 0,
			readyTopOffset: fanTop !== null && lock ? lock.top - fanTop : 0,
			actionWidth: action?.width ?? 0,
			actionBesideHand: Boolean(handViewport && action) && action!.left >= handViewport!.right - 1,
			actionInsideScene:
				Boolean(scene && action) &&
				action!.left >= scene!.left - 1 &&
				action!.right <= scene!.right + 1 &&
				action!.top >= scene!.top - 1 &&
				action!.bottom <= scene!.bottom + 1,
			handHasLeftOverflow: handFrame?.dataset.hasLeftOverflow === 'true',
			handHasRightOverflow: handFrame?.dataset.hasRightOverflow === 'true',
			handViewportMaskRemoved:
				Boolean(handStyles) &&
				handStyles!.getPropertyValue('mask-image') === 'none' &&
				handStyles!.getPropertyValue('-webkit-mask-image') === 'none',
			edgeFadeCardCount: edgeFadeCards.length,
			edgeFadeCardMasksPresent:
				edgeFadeCards.length > 0 &&
				edgeFadeCards.every((card) => {
					const surface = card.querySelector<HTMLElement>('.battle-fan-card-surface');
					if (!surface) return false;
					const styles = getComputedStyle(surface);
					return styles.getPropertyValue('mask-image') !== 'none' || styles.getPropertyValue('-webkit-mask-image') !== 'none';
				}),
			edgeFadeCardSoftStopsPresent:
				edgeFadeCards.length > 0 &&
				edgeFadeCards.every(
					(card) =>
						card.style.getPropertyValue('--battle-card-mask-left-soft').trim().length > 0 &&
						card.style.getPropertyValue('--battle-card-mask-right-soft').trim().length > 0,
				),
			handScrollbarHidden: (handStyles?.getPropertyValue('scrollbar-width') ?? '') === 'none' || handScrollbarStyles?.display === 'none',
			innerFrameRemoved: sceneElement ? getComputedStyle(sceneElement, '::before').content === 'none' : false,
			handViewportInsideScene:
				Boolean(scene && handViewport) && handViewport!.left >= (scene?.left ?? 0) + 1 && handViewport!.right <= (scene?.right ?? 0) - 1,
			handAndActionUseCommandWidth:
				Boolean(commandCenter && handViewport && action) && handViewport!.width + action!.width >= commandCenter!.width - 8,
			handScrollWidth: handViewportElement?.scrollWidth ?? 0,
			handClientWidth: handViewportElement?.clientWidth ?? 0,
			firstCardAtStartLeft: firstCardAtStart?.left ?? 0,
			lastCardAtEndRight: lastCardAtEnd?.right ?? 0,
			handViewportTop: handViewport?.top ?? 0,
			handViewportBottom: handViewport?.bottom ?? 0,
			targetNoteFits: targetNoteElement ? targetNoteElement.scrollHeight <= targetNoteElement.clientHeight + 1 : false,
			targetNoteHeight: targetNoteElement?.getBoundingClientRect().height ?? 0,
			actionHeight: action?.height ?? 0,
			cardsReachHandBottom:
				Boolean(handViewport) && cards.length > 0 && Math.max(...cards.map((card) => card.bottom)) >= handViewport!.bottom - 8,
			fanPeek,
			queuedCardsInsideHandViewport:
				Boolean(handViewport) &&
				queuedCardRects.every((card) => card.top >= handViewport!.top - 1 && card.bottom <= handViewport!.bottom + 2),
			fanBottomWithinPeek:
				Boolean(stage && cards.length > 0) &&
				Number.isFinite(fanPeek) &&
				Math.max(...cards.map((card) => card.bottom)) <= stage!.bottom + fanPeek + fanMaxDrop + 12,
			handVerticallyClipsFan: handStyles?.overflowY === 'hidden',
			targetNoteAboveHand: Boolean(targetNote && handViewport) && targetNote!.bottom <= handViewport!.top + 1,
			cards,
			badges,
			fanMaxDrop,
			categoriesIntersectActors: categoryRects.some((categoryRect) => actorRects.some((actorRect) => intersects(categoryRect, actorRect))),
		};
	});
	expect(metrics.trayHeight).toBeLessThanOrEqual(15.5 * 16 + 1);
	expect(metrics.trayBottomAlignedWithStage).toBe(true);
	expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth);
	expect(metrics.actorsInsideBattlefield).toBe(true);
	expect(metrics.labelsInsideBattlefield).toBe(true);
	expect(metrics.labelsClearActors).toBe(true);
	expect(metrics.labelsClearCards).toBe(true);
	expect(metrics.labelsOverlap).toBe(false);
	expect(metrics.actorsClearCards).toBe(true);
	expect(metrics.planInsideHeader).toBe(true);
	expect(metrics.actionInsideScene).toBe(true);
	expect(metrics.actionBesideHand).toBe(true);
	expect(metrics.readyTopOffset).toBeGreaterThanOrEqual(-18);
	expect(metrics.readyTopOffset).toBeLessThanOrEqual(12);
	expect(metrics.targetNoteHeight).toBeLessThanOrEqual(2.5 * 16 + 1);
	expect(metrics.actionHeight).toBeLessThanOrEqual(2.5 * 16 + 1);
	expect(metrics.lockLeft).toBeGreaterThanOrEqual(metrics.sceneLeft - 1);
	expect(metrics.actionWidth).toBeGreaterThanOrEqual(metrics.lockWidth - 2);
	expect(metrics.handHasLeftOverflow).toBe(true);
	expect(metrics.handHasRightOverflow).toBe(false);
	expect(metrics.handViewportMaskRemoved).toBe(true);
	expect(metrics.edgeFadeCardCount).toBeGreaterThan(0);
	expect(metrics.edgeFadeCardMasksPresent).toBe(true);
	expect(metrics.edgeFadeCardSoftStopsPresent).toBe(true);
	expect(metrics.handScrollbarHidden).toBe(true);
	expect(metrics.innerFrameRemoved).toBe(true);
	expect(metrics.handViewportInsideScene).toBe(true);
	expect(metrics.handAndActionUseCommandWidth).toBe(true);
	expect(metrics.handScrollWidth).toBeGreaterThan(metrics.handClientWidth);
	expect(metrics.firstCardAtStartLeft).toBeGreaterThanOrEqual(metrics.sceneLeft + 12);
	expect(metrics.lastCardAtEndRight).toBeLessThanOrEqual(metrics.sceneRight - 7);
	expect(metrics.categoriesIntersectActors).toBe(false);
	expect(metrics.targetNoteFits).toBe(true);
	expect(metrics.cardsReachHandBottom).toBe(true);
	expect(metrics.queuedCardsInsideHandViewport).toBe(true);
	expect(metrics.fanBottomWithinPeek).toBe(true);
	expect(metrics.handVerticallyClipsFan).toBe(true);
	expect(metrics.targetNoteAboveHand).toBe(true);
	for (const card of metrics.cards) {
		expect(card.top).toBeGreaterThanOrEqual(metrics.handViewportTop - 1);
		expect(card.bottom).toBeLessThanOrEqual(metrics.sceneBottom + metrics.fanPeek + metrics.fanMaxDrop + 12);
	}
	for (const badge of metrics.badges) {
		expect(badge.top).toBeGreaterThanOrEqual(metrics.handViewportTop - 1);
		expect(badge.bottom).toBeLessThanOrEqual(metrics.handViewportBottom + 2);
	}
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
