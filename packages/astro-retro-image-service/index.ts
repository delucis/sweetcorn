import type { AstroIntegration } from 'astro';

export default function astroRetroImageService() {
	return {
		name: 'astro-retro-image-service',
		hooks: {
			'astro:config:setup'({ updateConfig }) {
				updateConfig({
					image: {
						service: {
							entrypoint: 'astro-retro-image-service/retro-service',
							config: { algorithm: 'simple' },
						},
					},
				});
			},
		},
	} satisfies AstroIntegration;
}
