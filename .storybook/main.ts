import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
	stories: ['../src/**/*.stories.@(ts|tsx)'],
	addons: ['@storybook/addon-a11y'],
	framework: '@storybook/react-vite',
	core: {
		disableTelemetry: true,
		allowedHosts: ['.tanguyen.dev'],
		builder: {
			name: '@storybook/builder-vite',
			options: {
				viteConfigPath: './.storybook/vite.config.ts',
			},
		},
	},
};

export default config;
