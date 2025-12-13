import type { ImageOutputFormat, LocalImageService } from 'astro';
import service, { type SharpImageServiceConfig } from 'astro/assets/services/sharp';
import { AstroError } from 'astro/errors';
import type { FitEnum } from 'sharp';

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
	simple: [
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

// Thanks to https://github.com/tromero/BayerMatrix
const thresholdMaps = {
	'bayer-2': [
		[0, 256],
		[384, 128],
	],
	'bayer-4': [
		[0, 128, 32, 160],
		[192, 64, 224, 96],
		[48, 176, 16, 144],
		[240, 112, 208, 80],
	],
	'bayer-8': [
		[0, 128, 32, 160, 8, 136, 40, 168],
		[192, 64, 224, 96, 200, 72, 232, 104],
		[48, 176, 16, 144, 56, 184, 24, 152],
		[240, 112, 208, 80, 248, 120, 216, 88],
		[12, 140, 44, 172, 4, 132, 36, 164],
		[204, 76, 236, 108, 196, 68, 228, 100],
		[60, 188, 28, 156, 52, 180, 20, 148],
		[252, 124, 220, 92, 244, 116, 212, 84],
	],
	'bayer-16': [
		[0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170],
		[192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106],
		[48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154],
		[240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90],
		[12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166],
		[204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102],
		[60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150],
		[252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86],
		[3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169],
		[195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105],
		[51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153],
		[243, 115, 211, 83, 251, 123, 219, 91, 241, 113, 209, 81, 249, 121, 217, 89],
		[15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165],
		[207, 79, 239, 111, 199, 71, 231, 103, 205, 77, 237, 109, 197, 69, 229, 101],
		[63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149],
		[255, 127, 223, 95, 247, 119, 215, 87, 253, 125, 221, 93, 245, 117, 213, 85],
	],
} satisfies Record<string, number[][]>;
