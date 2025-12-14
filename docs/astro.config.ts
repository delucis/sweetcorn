import starlight from '@astrojs/starlight';
import sweetcorn from '@sweetcorn/astro';
import { defineConfig } from 'astro/config';
import starlightThemeFlexoki from 'starlight-theme-flexoki';

export default defineConfig({
	site: 'https://delucis.github.io',
	base: '/sweetcorn',
	integrations: [
		sweetcorn(),
		starlight({
			plugins: [starlightThemeFlexoki({ accentColor: 'yellow' })],
			editLink: {
				baseUrl: 'https://github.com/delucis/sweetcorn/edit/main/docs/',
			},
			sidebar: [
				{
					label: 'Start Here',
					items: ['getting-started', 'algorithms'],
				},
				{ label: 'Frameworks', items: ['frameworks/astro'] },
			],
			social: [
				{
					href: 'https://github.com/delucis/sweetcorn',
					icon: 'github',
					label: 'GitHub',
				},
			],
			title: 'sweetcorn',
		}),
	],
});
