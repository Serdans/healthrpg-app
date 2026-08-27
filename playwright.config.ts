import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/e2e',
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	timeout: 60_000,
	reporter: 'list',
	expect: { timeout: 15_000 },
	use: {
		baseURL: 'http://127.0.0.1:3002',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: [
		{
			command: 'node test/e2e/mock-backend.mjs',
			url: 'http://127.0.0.1:3010/health',
			reuseExistingServer: false,
			timeout: 120_000,
		},
		{
			command: 'pnpm dev --host 127.0.0.1 --port 3002',
			url: 'http://127.0.0.1:3002',
			reuseExistingServer: false,
			timeout: 120_000,
			env: {
				API_BASE_URL: 'http://127.0.0.1:3010',
				APP_ORIGIN: 'http://127.0.0.1:3002',
			},
		},
	],
});
