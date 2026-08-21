import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const sourceDirectory = fileURLToPath(new URL('../src', import.meta.url));

export default defineConfig({
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			'#': sourceDirectory,
			'@': sourceDirectory,
		},
	},
});
