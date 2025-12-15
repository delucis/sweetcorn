import type { AstroIntegration } from 'astro';
import type { SweetcornImageConfig } from './types';

export default function sweetcornAstro<T extends string = never, D extends string = never>(
	config: SweetcornImageConfig<T, D> = {}
) {
	return {
		name: '@sweetcorn/astro',
		hooks: {
			'astro:config:setup'({ updateConfig, addWatchFile }) {
				updateConfig({
					image: {
						service: {
							entrypoint: '@sweetcorn/astro/service',
							config,
						},
					},
					// TODO: Remove this once sweetcorn is bundled to JS (or use it only for local dev)
					vite: {
						ssr: {
							noExternal: ['sweetcorn'],
						},
					},
				});

				// TODO: Probably worth removing once this is published. Mostly useful for active development.
				const serviceUrl = new URL('./service.ts', import.meta.url);
				addWatchFile(serviceUrl);
			},
		},
	} satisfies AstroIntegration;
}
