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
	await expect(page.getByTestId('gameplay-mechanics').first()).toContainText('Journey');
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

test('walks a tile-based dungeon with auto-explore and manual steps', async ({ page, request }) => {
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
	// The world renders to a single canvas now.
	const canvas = page.getByTestId('dungeon-grid-canvas');
	await expect(canvas).toBeVisible();
	expect(await canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);
	// The live-region announces the party's tile.
	await expect(page.getByTestId('dungeon-live-status')).toContainText(/Party is at/);

	await page.getByTestId('dungeon-explore').click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/dungeon/walk',
			body: { mode: 'auto' },
		});

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
	await expect(page.getByTestId('dungeon-live-status')).not.toHaveText(atEntry ?? '');

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

test('submits a combat action and uses a field item', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByTestId('combat-scene')).toBeVisible();
	await expect(page.getByTestId('battlefield')).toBeVisible();
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
	await expect(page.getByTestId('combat-scene').locator('.battle-command-ribbon')).toContainText('Commanding');
	await expect(page.getByTestId('daily-command-center')).toContainText('Your command is needed');
	await expect(page.getByTestId('combat-scene').getByTestId('gameplay-mechanics')).toContainText('Momentum');
	await page.getByTestId('battle-action-signature').click();
	await page.getByTestId('battle-item-target').selectOption('user-2');
	await page.getByTestId('battle-save-command').click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/encounter/actions/me',
			body: { actionKey: 'shield-wall', targetEnemyId: 'enemy-1', targetUserId: null },
		});
	await expect(page.getByTestId('battle-status')).toContainText(/command is locked in/i);

	await page.getByTestId('battle-action-basic').click();
	await expect(page.getByTestId('battle-status')).toContainText(/review your changes and save/i);

	await page.getByRole('button', { name: /Use item/i }).click();
	await expect(page.getByText(/Restored 10 health for Mira/i)).toBeVisible();
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
