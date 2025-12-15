import type { Sharp } from 'sharp';
import thresholdMaps from './threshold-maps.json' with { type: 'json' };
import diffusionKernels from './diffusion-kernels';
import type { DitheringAlgorithm } from './types';

export type { DitheringAlgorithm };

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

interface SweetcornOptions {
	algorithm?: DitheringAlgorithm | undefined;
	thresholdMap?: number[][] | undefined;
	diffusionKernel?: number[][] | undefined;
}

export default async function sweetcorn(
	image: Sharp,
	options: SweetcornOptions
): Promise<Sharp> {
	const { algorithm } = options;

	if (!sharp) sharp = await loadSharp();

	// Convert image to greyscale before dithering.
	// We use gamma to linearize the colorspace, and improve the perceptual quality.
	image.gamma(2.2, 1).greyscale();

	// Get raw pixel data for this image.
	const rawPixels = await image.raw().toBuffer({ resolveWithObject: true });

	const thresholdMap: number[][] | undefined = options.thresholdMap ||
		thresholdMaps[algorithm as keyof typeof thresholdMaps];
	const diffusionKernel: number[][] | undefined =
		options.diffusionKernel || diffusionKernels[algorithm as keyof typeof diffusionKernels];

	if (thresholdMap) {
		applyThresholdMap(rawPixels, thresholdMap);
	} else if (diffusionKernel) {
		applyDiffusionKernel(rawPixels, diffusionKernel);
	} else if (algorithm === 'white-noise') {
		// White noise dithering (pretty rough and ugly)
		for (let index = 0; index < rawPixels.data.length; index++) {
			const pixelValue = rawPixels.data[index]!;
			rawPixels.data[index] = pixelValue / 255 < Math.random() ? 0 : 255;
		}
	} else if (algorithm === 'threshold') {
		// Basic quantization
		for (let index = 0; index < rawPixels.data.length; index++) {
			const pixelValue = rawPixels.data[index]!;
			rawPixels.data[index] = pixelValue < 128 ? 0 : 255;
		}
	}

	// Astro supports outputting different formats, but dithered images like this respond quite
	// predictably to different compression methods. PNG and lossless WebP outperform lossy
	// formats for this type of image, with lossless WebP producing slightly smaller images, so we
	// use that here.
	const outputImage = sharp(rawPixels.data, { raw: rawPixels.info });

	return outputImage;
}

function applyDiffusionKernel(
	rawPixels: { data: Buffer<ArrayBufferLike>; info: import('sharp').OutputInfo },
	kernel: number[][]
): void {
	const kernelWidth = kernel[0]!.length;
	const kernelHeight = kernel.length;
	const kernelRadius = Math.floor((kernelWidth - 1) / 2);

	for (let index = 0; index < rawPixels.data.length; index++) {
		const original = rawPixels.data[index]!;
		const quantized = original < 128 ? 0 : 255;
		rawPixels.data[index] = quantized;
		const error = original - quantized;

		const [x, y] = [index % rawPixels.info.width, Math.floor(index / rawPixels.info.width)];

		const width = rawPixels.info.width;
		const height = rawPixels.info.height;

		for (let diffX = 0; diffX < kernelWidth; diffX++) {
			for (let diffY = 0; diffY < kernelHeight; diffY++) {
				const diffusionWeight = kernel[diffY]![diffX]!;
				if (diffusionWeight === 0) continue;

				const offsetX = diffX - kernelRadius;
				const offsetY = diffY;

				const neighborX = x + offsetX;
				const neighborY = y + offsetY;

				// Ensure we don't go out of bounds
				if (neighborX >= 0 && neighborY >= 0 && neighborX < width && neighborY < height) {
					const neighborIndex = neighborY * width + neighborX;
					rawPixels.data[neighborIndex] = clamp(
						rawPixels.data[neighborIndex]! + error * diffusionWeight
					);
				}
			}
		}
	}
}

function clamp(value: number, min = 0, max = 255): number {
	return Math.min(Math.max(value, min), max);
}

/** Applies a threshold map to the raw pixel data for ordered dithering. */
function applyThresholdMap(
	rawPixels: { data: Buffer<ArrayBufferLike>; info: import('sharp').OutputInfo },
	thresholdMap: number[][]
): void {
	const mapWidth = thresholdMap[0]!.length;
	const mapHeight = thresholdMap.length;
	for (let index = 0; index < rawPixels.data.length; index++) {
		const pixelValue = rawPixels.data[index]!;
		const [x, y] = [index % rawPixels.info.width, Math.floor(index / rawPixels.info.width)];
		const threshold = thresholdMap[y % mapHeight]![x % mapWidth]!;
		rawPixels.data[index] = pixelValue < threshold ? 0 : 255;
	}
}
