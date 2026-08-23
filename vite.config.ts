import { defineConfig } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import { fileURLToPath } from 'node:url';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const reactReconcilerConstants = fileURLToPath(new URL('./src/lib/react-reconciler-constants.ts', import.meta.url));

const config = defineConfig({
	resolve: {
		tsconfigPaths: true,
		alias: {
			'react-reconciler/constants': reactReconcilerConstants,
			'react-reconciler/constants.js': reactReconcilerConstants,
		},
	},
	ssr: {
		noExternal: ['@pixi/react'],
	},
	server: { port: 3001, allowedHosts: ['.tanguyen.dev'] },
	plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
});

export default config;
