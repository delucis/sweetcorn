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
					label: 'Start here',
					items: ['getting-started', 'algorithms', 'dithering-on-the-web'],
				},
				{
					label: 'Guides',
					items: ['guides/node', 'guides/astro', 'guides/byo-algorithm'],
				},
				'acknowledgements',
			],
			social: [
				{
					href: 'https://github.com/delucis/sweetcorn',
					icon: 'github',
					label: 'GitHub',
				},
			],
			title: 'sweetcorn',
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://delucis.github.io/sweetcorn/og.webp',
					},
				},
				{
					tag: 'meta',
					attrs: {
						property: 'og:image:alt',
						content: 'sweetcorn: image dithering for Node.js',
					},
				},
			],
		}),
	],
});
