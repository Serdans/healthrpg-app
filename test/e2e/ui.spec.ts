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

	await expect(page.getByTestId('world-map')).toBeVisible();
	await expect(page.getByTestId('world-map-party-marker')).toBeVisible();
	await page.getByRole('button', { name: /North Lantern Road, Next possible route/i }).click();
	await expect(page.getByTestId('world-map-inspector')).toContainText('North Lantern Road');
	await expect(page.getByTestId('world-map-inspector')).toContainText(/Next possible route/i);
});

test('opens a village departure vote and casts a route vote', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'village' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByRole('heading', { name: 'Mossway Village', level: 2 })).toBeVisible();
	await page.getByRole('button', { name: /Start departure vote/i }).click();
	await expect(page.getByRole('button', { name: /Departure vote open/i })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Choose the next trail' })).toBeVisible();

	await page.locator('button.choice-card').filter({ hasText: 'North Lantern Road' }).click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/branch-votes/node-1',
			body: { edgeId: 'edge-1' },
		});
	await expect(page.locator('button.choice-card').filter({ hasText: 'North Lantern Road' })).toHaveAttribute('data-selected', 'true');
});

test('submits a combat action and uses a field item', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'combat' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByRole('heading', { name: 'Hold the line together.' })).toBeVisible();
	await page.getByRole('button', { name: /Shield Wall/i }).click();
	await page.getByRole('button', { name: /Choose action/i }).click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/api/v1/parties/party-1/encounter/actions/me',
			body: { actionKey: 'shield-wall', targetEnemyId: 'enemy-1', targetUserId: null },
		});

	await page.getByRole('button', { name: /Use item/i }).click();
	await expect(page.getByText(/Restored 10 health/i)).toBeVisible();
});

test('shows queued health sync feedback', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'branch' } });
	await authenticate(page);
	await page.goto('/settings');

	await page.getByRole('button', { name: /Sync now/i }).click();
	await expect(page.getByText(/Health sync queued/i)).toBeVisible();
	await expect(page.getByText(/Refreshing 2026-08-19 through 2026-08-20/i)).toBeVisible();
});
