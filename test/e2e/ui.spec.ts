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

test('opens a village departure vote and casts a route vote', async ({ page, request }) => {
	await request.post(`${mockBackendUrl}/__scenario`, { data: { scenario: 'village' } });
	await authenticate(page);
	await page.goto('/parties/party-1');

	await expect(page.getByRole('heading', { name: 'Mossway Village' })).toBeVisible();
	await page.getByRole('button', { name: /Start departure vote/i }).click();
	await expect(page.getByRole('button', { name: /Departure vote open/i })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Choose the next trail' })).toBeVisible();

	await page.getByRole('button', { name: /North Lantern Road/i }).click();
	await expect
		.poll(async () => lastMutation(request))
		.toEqual({
			path: '/v1/parties/party-1/votes',
			body: { nodeId: 'node-1', edgeId: 'edge-1' },
		});
	await expect(page.getByRole('button', { name: /North Lantern Road/i })).toHaveAttribute('data-selected', 'true');
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
			path: '/v1/parties/party-1/encounter/action',
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
