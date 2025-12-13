import type { AstroIntegration } from 'astro';
import type { DitheringAlgorithm } from './types';

export default function astroRetroImageService({
	defaultDitherAlgorithm,
}: { defaultDitherAlgorithm?: DitheringAlgorithm } = {}) {
	return {
		name: 'astro-retro-image-service',
		hooks: {
			'astro:config:setup'({ updateConfig, addWatchFile }) {
				updateConfig({
					image: {
						service: {
							entrypoint: 'astro-retro-image-service/retro-service',
							config: { defaultDitherAlgorithm },
						},
					},
				});

				const serviceUrl = new URL('./retro-service.ts', import.meta.url);
				addWatchFile(serviceUrl);
			},
		},
	} satisfies AstroIntegration;
}
