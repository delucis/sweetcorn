import starlight from '@astrojs/starlight';
import astroRetroImageService from 'astro-retro-image-service';
import { defineConfig } from 'astro/config';
import starlightThemeFlexoki from 'starlight-theme-flexoki';

export default defineConfig({
	integrations: [
		astroRetroImageService(),
		starlight({
			plugins: [starlightThemeFlexoki({ accentColor: 'orange' })],
			editLink: {
				baseUrl: 'https://github.com/delucis/astro-retro-image-service/edit/main/docs/',
			},
			sidebar: [
				{
					label: 'Start Here',
					items: ['getting-started', 'configuration'],
				},
			],
			social: [
				{
					href: 'https://github.com/delucis/astro-retro-image-service',
					icon: 'github',
					label: 'GitHub',
				},
			],
			title: 'astro-retro-image-service',
		}),
	],
});
