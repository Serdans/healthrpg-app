import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [storybookTest({ configDir: dirname })],
	test: {
		name: 'storybook',
		testTimeout: 30_000,
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({}),
			instances: [{ browser: 'chromium' }],
		},
	},
});
