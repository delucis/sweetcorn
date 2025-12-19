import type { Sharp } from 'sharp';
import { customProcessors } from './custom-processors.js';
import diffusionKernels from './diffusion-kernels.js';
import { applyDiffusionKernel, applyThresholdMap } from './processors.js';
import thresholdMaps from './threshold-maps.json' with { type: 'json' };
import type { SweetcornOptions } from './types.js';

export type { DitheringAlgorithm } from './types.js';

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
	image = image.clone();
	const { algorithm } = options;

	if (!sharp) sharp = await loadSharp();

	// Convert image to greyscale before dithering.
	// We use gamma to linearize the colorspace, and improve the perceptual quality.
	image.gamma(2.2, 1).greyscale();

	// Get raw pixel data for this image.
	const { data: pixels, info } = await image.raw().toBuffer({ resolveWithObject: true });

	const thresholdMap: number[][] | undefined =
		options.thresholdMap || thresholdMaps[algorithm as keyof typeof thresholdMaps];
	const diffusionKernel: number[][] | undefined =
		options.diffusionKernel || diffusionKernels[algorithm as keyof typeof diffusionKernels];
	const customProcessor = customProcessors[algorithm as keyof typeof customProcessors];

	if (thresholdMap) {
		applyThresholdMap(pixels, info.width, thresholdMap);
	} else if (diffusionKernel) {
		applyDiffusionKernel(pixels, info.width, info.height, diffusionKernel);
	} else if (customProcessor) {
		customProcessor(pixels);
	}

	// Convert raw pixel data back into a Sharp image.
	const outputImage = sharp(pixels, { raw: info });
	return outputImage;
}
