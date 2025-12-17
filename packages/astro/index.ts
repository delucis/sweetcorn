/// <reference types="./image-props.d.ts" />

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

			/**
			 * Add the names of user-defined algorithms to the type for the `dither` prop.
			 * These are merged into the `Sweetcorn.Astro` interface in `image-props.d.ts`.
			 */
			'astro:config:done'({ injectTypes }) {
				const customAlgorithms = [
					...Object.keys(config.customDiffusionKernels || {}),
					...Object.keys(config.customThresholdMaps || {}),
				];
				if (customAlgorithms.length > 0) {
					injectTypes({
						filename: 'custom-algorithms.d.ts',
						content:
							'declare namespace Sweetcorn {\n' +
							'	export interface Astro {\n' +
							'		/** Custom dithering algorithms provided by the user. */\n' +
							`		CustomAlgorithms: ${customAlgorithms.map((a) => JSON.stringify(a)).join(' | ')};\n` +
							'	}\n' +
							'}',
					});
				}
			},
		},
	} satisfies AstroIntegration;
}
