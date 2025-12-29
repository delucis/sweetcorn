import type { Sharp } from 'sharp';
import { customProcessors } from './custom-processors.js';
import diffusionKernels from './diffusion-kernels.js';
import { applyDiffusionKernel, applyThresholdMap } from './processors.js';
import thresholdMaps from './threshold-maps.json' with { type: 'json' };
import type { SweetcornOptions } from './types.js';

export type { DitheringAlgorithm } from './types.js';
export type { SweetcornOptions };

let sharp: typeof import('sharp');
async function loadSharp(): Promise<typeof import('sharp')> {
	let sharpImport: typeof import('sharp');
	try {
		sharpImport = (await import('sharp')).default;
	} catch {
		throw new Error('Missing sharp module');
	}

	// Disable the `sharp` `libvips` cache as it errors when the file is too small and operations are happening too fast (runs into a race condition) https://github.com/lovell/sharp/issues/3935#issuecomment-1881866341
	sharpImport.cache(false);

	return sharpImport;
}

/**
 * Create a dithered image — turn smooth pixels into crunchy kernels! 🌽
 * @param image A Sharp image instance, e.g. created using `sharp('my-file.png')`.
 * @param options Options configuring Sweetcorn.
 * @returns A new Sharp image instance.
 */
export default async function sweetcorn(image: Sharp, options: SweetcornOptions): Promise<Sharp> {
	// Clone the input image to avoid mutating it.
	// Also, force it to a PNG to ensure we have a valid input. Some inputs such as "raw", can have
	// issues with channel manipulations like our alpha channel handling below.
	image = image.clone().toFormat('png');

	/** Alpha channel extracted before any other manipulations have been applied. */
	let alphaChannel: Buffer | undefined;
	if (!options.preserveColour) {
		if (options.preserveAlpha) {
			alphaChannel = await image.clone().extractChannel('alpha').toBuffer();
		}
		// Alpha channel shouldn’t be dithered, so we remove it (and add it back later if needed.)
		image.removeAlpha();
	}

	// We use gamma to linearize the colorspace, and improve the perceptual quality.
	image.gamma(2.2, 1);
	// Convert image to greyscale before dithering.
	if (!options.preserveColour) {
		image.greyscale();
	}

	// Get raw pixel data for this image.
	const { data: pixels, info } = await image.raw().toBuffer({ resolveWithObject: true });

	const thresholdMap: number[][] | undefined =
		options.thresholdMap || thresholdMaps[options.algorithm as keyof typeof thresholdMaps];
	const diffusionKernel: number[][] | undefined =
		options.diffusionKernel || diffusionKernels[options.algorithm as keyof typeof diffusionKernels];
	const customProcessor = customProcessors[options.algorithm as keyof typeof customProcessors];

	// Dither raw pixel data in place.
	if (thresholdMap) {
		applyThresholdMap(pixels, info, thresholdMap);
	} else if (diffusionKernel) {
		applyDiffusionKernel(pixels, info, diffusionKernel);
	} else if (customProcessor) {
		customProcessor(pixels, info);
	}

	// Convert raw pixel data back into a Sharp image.
	if (!sharp) sharp = await loadSharp();
	const outputImage = sharp(pixels, { raw: info });

	// Enforce black-and-white output when colour hasn’t been requested and there’s no alpha channel.
	if (!options.preserveColour && !alphaChannel) {
		outputImage.toColourspace('b-w');
	}

	// Ensure alpha channel is included/excluded as required.
	if (alphaChannel) {
		outputImage.joinChannel(alphaChannel);
	} else if (info.channels > 3 && !options.preserveAlpha) {
		outputImage.removeAlpha();
	}

	return outputImage;
}
