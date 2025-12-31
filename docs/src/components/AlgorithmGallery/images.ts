import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import diffusionKernels from '../../../../packages/sweetcorn/src/diffusion-kernels.ts';
import thresholdMaps from '../../../../packages/sweetcorn/src/threshold-maps.json';

import moon from '../../assets/9237597241_7bb0b5ff7b_o.jpg';
import bwPhoto from '../../assets/Manifestazione_antifascista.jpg';
import testPattern from '../../assets/PM5544_MK10.png';
import sweetcorn from '../../assets/VegCorn.jpg';
import transparentSweetcorn from '../../assets/transparency.png';

const algorithms = [
	'threshold',
	...Object.keys(thresholdMaps),
	'white-noise',
	...Object.keys(diffusionKernels),
] as Sweetcorn.Algorithm[];

interface PreviewOptions {
	preserveColour?: boolean;
	preserveAlpha?: boolean;
}

interface SourceImage {
	src: ImageMetadata;
	label: string;
	options: Array<PreviewOptions>;
	caption: string;
	captionLink: string;
}

interface ProcessedImage extends Omit<SourceImage, 'src'> {
	sources: Array<{
		label: string;
		image: { src: string; width: number; height: number };
		options: PreviewOptions;
	}>;
}

const images: Array<SourceImage> = [
	{
		src: moon,
		label: 'Greyscale moon',
		options: [{}],
		caption: 'The Moon. August 25th 1890 © Tyne & Wear Archives & Museums',
		captionLink: 'https://www.flickr.com/photos/twm_news/9237597241/',
	},
	{
		src: bwPhoto,
		label: 'Black-and-white photo',
		options: [{}],
		caption: 'Manifestazione antifascista (public domain)',
		captionLink: 'https://it.wikipedia.org/wiki/File:Manifestazione_antifascista.jpg',
	},
	{
		src: sweetcorn,
		label: 'Colour photo',
		options: [{}, { preserveColour: true }],
		caption: 'Sweetcorn (public domain)',
		captionLink: 'https://commons.wikimedia.org/wiki/File:VegCorn.jpg',
	},
	{
		src: testPattern,
		label: 'TV test pattern',
		options: [{}, { preserveColour: true }],
		caption: 'Reproduction Philips PM5544 test pattern by Neovo.Geesink (CC BY-SA 4.0)',
		captionLink: 'https://commons.wikimedia.org/wiki/File:PM5544_MK10.png',
	},
	{
		src: transparentSweetcorn,
		label: 'Illustration with transparency',
		options: [
			{},
			{ preserveColour: true },
			{ preserveAlpha: true },
			{ preserveColour: true, preserveAlpha: true },
		],
		caption: 'Apple sweetcorn emoji © Apple Inc.',
		captionLink: 'https://github.com/delucis/sweetcorn/blob/main/docs/src/assets/transparency.png',
	},
];

const getMinimalImage = async (...options: Parameters<typeof getImage>) => {
	const {
		src,
		attributes: { width, height },
	} = await getImage(...options);
	return { src, width, height };
};

const width = 300;

export const galleryImages: ProcessedImage[] = await Promise.all(
	images.map(async ({ src, label, caption, captionLink, options }) => {
		const sources = [
			// original, undithered image
			{ label: 'source image', image: await getMinimalImage({ src, width }), options: {} },
			// dithered versions of this image
			...(
				await Promise.all(
					algorithms.map(
						async (algorithm) =>
							await Promise.all(
								options.map(async (option) => {
									return {
										label: algorithm,
										image: await getMinimalImage({ src, width, dither: { algorithm, ...option } }),
										options: option,
									};
								})
							)
					)
				)
			).flat(),
		];

		return { sources, label, caption, captionLink, options };
	})
);
