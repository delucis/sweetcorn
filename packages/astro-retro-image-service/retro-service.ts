import type { ImageOutputFormat, LocalImageService } from 'astro';
import service, { type SharpImageServiceConfig } from 'astro/assets/services/sharp';
import { AstroError } from 'astro/errors';
import type { FitEnum } from 'sharp';
import thresholdMaps from './threshold-maps.json';

type ImageFit = 'fill' | 'contain' | 'cover' | 'none' | 'scale-down' | (string & {});
type BaseServiceTransform = {
	src: string;
	width?: number;
	height?: number;
	format: string;
	quality?: string | null;
	fit?: ImageFit;
	position?: string;
};

type Algorithm = 'bayer-2' | 'bayer-4' | 'bayer-8' | 'bayer-16' | 'white-noise' | 'threshold';

let sharp: typeof import('sharp');
async function loadSharp() {
	let sharpImport: typeof import('sharp');
	try {
		sharpImport = (await import('sharp')).default;
	} catch {
		throw new AstroError('Missing sharp module');
	}

	// Disable the `sharp` `libvips` cache as it errors when the file is too small and operations are happening too fast (runs into a race condition) https://github.com/lovell/sharp/issues/3935#issuecomment-1881866341
	sharpImport.cache(false);

	return sharpImport;
}

const fitMap: Record<ImageFit, keyof FitEnum> = {
	fill: 'fill',
	contain: 'inside',
	cover: 'cover',
	none: 'outside',
	'scale-down': 'inside',
	outside: 'outside',
	inside: 'inside',
};

export default {
	...service,

	async getURL(options, imageConfig) {
		let url = await service.getURL(options, imageConfig);
		if (options.dither) {
			url += `&dither=${options.dither}`;
		}
		return url;
	},

	async validateOptions(options, imageConfig) {
		const validatedOptions = await service.validateOptions!(options, imageConfig);
		if (imageConfig.service.config.defaultDitherAlgorithm) {
			validatedOptions.dither ??= imageConfig.service.config.defaultDitherAlgorithm;
		}
		return validatedOptions;
	},

	async parseURL(url, imageConfig) {
		const parsed = (await service.parseURL(url, imageConfig))!;
		parsed.dither ??= url.searchParams.get('dither');
		return parsed;
	},

	async transform(inputBuffer, transformOptions, config) {
		const algorithm: Algorithm = transformOptions.dither;
		if (!algorithm) return service.transform(inputBuffer, transformOptions, config);

		if (!sharp) sharp = await loadSharp();
		const transform: BaseServiceTransform = transformOptions as BaseServiceTransform;

		// Return SVGs as-is
		// TODO: Sharp has some support for SVGs, we could probably support this once Sharp is the default and only service.
		if (transform.format === 'svg') return { data: inputBuffer, format: 'svg' };

		const image = sharp(inputBuffer, {
			failOnError: false,
			pages: -1,
			limitInputPixels: config.service.config.limitInputPixels,
		});

		// always call rotate to adjust for EXIF data orientation
		image.rotate();

		resizeImageLikeAstro(transform, image);

		// Convert image to greyscale before dithering.
		// We use gamma to linearize the colorspace, and improve the perceptual quality.
		image.gamma(2.2, 1).greyscale();

		// Get raw pixel data for this image.
		const rawPixels = await image.raw().toBuffer({ resolveWithObject: true });

		const thresholdMap: number[][] | undefined =
			thresholdMaps[algorithm as keyof typeof thresholdMaps];
		const diffusionKernel: number[][] | undefined =
			diffusionKernels[algorithm as keyof typeof diffusionKernels];

		if (thresholdMap) {
			applyThresholdMap(rawPixels, thresholdMap);
		} else if (diffusionKernel) {
			applyDiffusionKernel(rawPixels, diffusionKernel);
		} else if (algorithm === 'white-noise') {
			// White noise dithering (pretty rough and ugly)
			for (let index = 0; index < rawPixels.data.length; index++) {
				const pixelValue = rawPixels.data[index];
				rawPixels.data[index] = pixelValue / 255 < Math.random() ? 0 : 255;
			}
		} else if (algorithm === 'threshold') {
			// Basic quantization
			for (let index = 0; index < rawPixels.data.length; index++) {
				const pixelValue = rawPixels.data[index];
				rawPixels.data[index] = pixelValue < 128 ? 0 : 255;
			}
		}

		// Astro supports outputting different formats, but dithered images like this respond quite
		// predictably to different compression methods. PNG and lossless WebP outperform lossy
		// formats for this type of image, with lossless WebP producing slightly smaller images, so we
		// use that here.
		const outputImage = sharp(rawPixels.data, { raw: rawPixels.info }).webp({ lossless: true });

		const { data, info } = await outputImage.toBuffer({ resolveWithObject: true });

		// Sharp can sometimes return a SharedArrayBuffer when using WebAssembly.
		// SharedArrayBuffers need to be copied into an ArrayBuffer in order to be manipulated.
		const needsCopy = 'buffer' in data && data.buffer instanceof SharedArrayBuffer;

		return {
			data: needsCopy ? new Uint8Array(data) : data,
			format: info.format as ImageOutputFormat,
		};
	},
} satisfies LocalImageService<SharpImageServiceConfig & { defaultDitherAlgorithm?: Algorithm }>;

/**
 * Resizes the image using the same logic as Astro's built-in image service.
 * @see https://github.com/withastro/astro/blob/8cab2a4f7ee0cfbcf0ddaec0878da637e7854b9d/packages/astro/src/assets/services/sharp.ts#L78C3-L98C4
 * @param transform Image service transform object
 * @param image Sharp image instance
 */
function resizeImageLikeAstro(transform: BaseServiceTransform, image: import('sharp').Sharp) {
	// If `fit` isn't set then use old behavior:
	// - Do not use both width and height for resizing, and prioritize width over height
	// - Allow enlarging images

	const withoutEnlargement = Boolean(transform.fit);
	if (transform.width && transform.height && transform.fit) {
		const fit: keyof FitEnum = fitMap[transform.fit] ?? 'inside';
		image.resize({
			width: Math.round(transform.width),
			height: Math.round(transform.height),
			fit,
			position: transform.position,
			withoutEnlargement,
		});
	} else if (transform.height && !transform.width) {
		image.resize({
			height: Math.round(transform.height),
			withoutEnlargement,
		});
	} else if (transform.width) {
		image.resize({
			width: Math.round(transform.width),
			withoutEnlargement,
		});
	}
}

function applyDiffusionKernel(
	rawPixels: { data: Buffer<ArrayBufferLike>; info: import('sharp').OutputInfo },
	kernel: number[][]
) {
	const kernelWidth = kernel[0].length;
	const kernelHeight = kernel.length;
	const kernelRadius = Math.floor((kernelWidth - 1) / 2);

	for (let index = 0; index < rawPixels.data.length; index++) {
		const original = rawPixels.data[index];
		const quantized = original < 128 ? 0 : 255;
		rawPixels.data[index] = quantized;
		const error = original - quantized;

		const [x, y] = [index % rawPixels.info.width, Math.floor(index / rawPixels.info.width)];

		const width = rawPixels.info.width;
		const height = rawPixels.info.height;

		for (let diffX = 0; diffX < kernelWidth; diffX++) {
			for (let diffY = 0; diffY < kernelHeight; diffY++) {
				const diffusionWeight = kernel[diffY][diffX];
				if (diffusionWeight === 0) continue;

				const offsetX = diffX - kernelRadius;
				const offsetY = diffY;

				const neighborX = x + offsetX;
				const neighborY = y + offsetY;

				// Ensure we don't go out of bounds
				if (neighborX >= 0 && neighborY >= 0 && neighborX < width && neighborY < height) {
					const neighborIndex = neighborY * width + neighborX;
					rawPixels.data[neighborIndex] = clamp(
						rawPixels.data[neighborIndex] + error * diffusionWeight,
						0,
						255
					);
				}

				// const x = (index % width) + diffX;
				// const y = Math.floor(index / width) + diffY;
				// if (x >= 0 && x < width && y >= 0 && y < height) {
				// 	const neighborIndex = y * width + x;
				// 	rawPixels.data[neighborIndex] += error * kernel[diffY][diffX];
				// }
			}
		}
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

const diffusionKernels = {
	'simple-diffusion': [
		[0, 0.5],
		[0.5, 0],
	],
	'floyd-steinberg': [
		[0, 0, 7 / 16],
		[3 / 16, 5 / 16, 1 / 16],
	],
	'jarvis-judice-ninke': [
		[0, 0, 0, 7 / 48, 5 / 48],
		[3 / 48, 5 / 48, 7 / 48, 5 / 48, 3 / 48],
		[1 / 48, 3 / 48, 5 / 48, 3 / 48, 1 / 48],
	],
	stucki: [
		[0, 0, 0, 8 / 42, 4 / 42],
		[2 / 42, 4 / 42, 8 / 42, 4 / 42, 2 / 42],
		[1 / 42, 2 / 42, 4 / 42, 2 / 42, 1 / 42],
	],
	atkinson: [
		[0, 0, 1 / 8, 1 / 8],
		[1 / 8, 1 / 8, 1 / 8, 0],
		[0, 1 / 8, 0, 0],
	],
};

/** Applies a threshold map to the raw pixel data for ordered dithering. */
function applyThresholdMap(
	rawPixels: { data: Buffer<ArrayBufferLike>; info: import('sharp').OutputInfo },
	thresholdMap: number[][]
) {
	const mapWidth = thresholdMap[0].length;
	const mapHeight = thresholdMap.length;
	for (let index = 0; index < rawPixels.data.length; index++) {
		const pixelValue = rawPixels.data[index];
		const [x, y] = [index % rawPixels.info.width, Math.floor(index / rawPixels.info.width)];
		const threshold = thresholdMap[y % mapHeight][x % mapWidth];
		rawPixels.data[index] = pixelValue < threshold ? 0 : 255;
	}
}
