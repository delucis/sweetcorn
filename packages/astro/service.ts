import type { ImageOutputFormat, LocalImageService } from 'astro';
import defaultSharpService, { type SharpImageServiceConfig } from 'astro/assets/services/sharp';
import { AstroError } from 'astro/errors';
import type { FitEnum } from 'sharp';
import sweetcorn from 'sweetcorn';
import type { SweetcornImageConfig } from './types';

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
	// Most of these are copied from Astro’s defaults.
	// See: https://github.com/withastro/astro/blob/8cab2a4f7ee0cfbcf0ddaec0878da637e7854b9d/packages/astro/src/assets/consts.ts#L29-L37
	propertiesToHash: ['src', 'width', 'height', 'format', 'quality', 'fit', 'position', 'dither'],

	async getURL(options, imageConfig) {
		let url = await defaultSharpService.getURL(options, imageConfig);
		if (options.dither) {
			url += `&dither=${options.dither}`;
		}
		if (options.preserveColour) {
			url += `&preserveColour`;
		}
		if (options.preserveAlpha) {
			url += `&preserveAlpha`;
		}
		return url;
	},

	async validateOptions(options, imageConfig) {
		const validatedOptions = await defaultSharpService.validateOptions!(options, imageConfig);
		if (validatedOptions.dither && typeof validatedOptions.dither === 'object') {
			validatedOptions.preserveColour = Boolean(validatedOptions.dither.preserveColour);
			validatedOptions.preserveAlpha = Boolean(validatedOptions.dither.preserveAlpha);
			validatedOptions.dither = validatedOptions.dither.algorithm;
		} else if (imageConfig.service.config.defaultDitherAlgorithm) {
			validatedOptions.dither ??= imageConfig.service.config.defaultDitherAlgorithm;
		}
		return validatedOptions;
	},

	async parseURL(url, imageConfig) {
		const parsed = (await defaultSharpService.parseURL(url, imageConfig))!;
		parsed.dither ??= url.searchParams.get('dither');
		parsed.preserveColour ??= url.searchParams.has('preserveColour');
		parsed.preserveAlpha ??= url.searchParams.has('preserveAlpha');
		return parsed;
	},

	async transform(inputBuffer, transform, config) {
		if (!transform.dither) {
			return defaultSharpService.transform(inputBuffer, transform, config);
		}

		const inputImage = await createImageLikeAstro(inputBuffer, config);
		resizeImageLikeAstro(transform as BaseServiceTransform, inputImage);

		const outputImage = await sweetcorn(inputImage, {
			algorithm: transform.dither,
			thresholdMap: config.service.config.customThresholdMaps?.[transform.dither],
			diffusionKernel: config.service.config.customDiffusionKernels?.[transform.dither],
			preserveColour: transform.preserveColour,
			preserveAlpha: transform.preserveAlpha,
		});

		// Astro supports outputting different formats, but dithered images like this respond quite
		// predictably to different compression methods. PNG and lossless WebP outperform lossy
		// formats for this type of image, with lossless WebP producing slightly smaller images, so we
		// use that here.
		outputImage.webp({ lossless: true });

		const { data, info } = await outputImage.toBuffer({ resolveWithObject: true });

		// Sharp can sometimes return a SharedArrayBuffer when using WebAssembly.
		// SharedArrayBuffers need to be copied into an ArrayBuffer in order to be manipulated.
		const needsCopy = 'buffer' in data && data.buffer instanceof SharedArrayBuffer;

		return {
			data: needsCopy ? new Uint8Array(data) : data,
			format: info.format as ImageOutputFormat,
		};
	},

	async getHTMLAttributes(options, imageConfig) {
		const attributes = await defaultSharpService.getHTMLAttributes!(options, imageConfig);
		if (options.dither) {
			const classNames = [attributes.class, 'sw-dithered', `sw-${options.dither}`];
			attributes.class = classNames.filter(Boolean).join(' ');
		}
		return attributes;
	},

	getSrcSet(options, imageConfig) {
		return defaultSharpService.getSrcSet!(options, imageConfig);
	},
} satisfies LocalImageService<SharpImageServiceConfig & SweetcornImageConfig<any, any>>;

/**
 * Creates a new Sharp image instance using the same logic as Astro's built-in image service.
 * @see https://github.com/withastro/astro/blob/8cab2a4f7ee0cfbcf0ddaec0878da637e7854b9d/packages/astro/src/assets/services/sharp.ts#L65-L72
 * @param inputBuffer Raw input image buffer
 * @param config Image service config
 */
async function createImageLikeAstro(
	inputBuffer: Uint8Array<ArrayBufferLike>,
	config: Parameters<typeof defaultSharpService.transform>[2]
) {
	if (!sharp) sharp = await loadSharp();

	const image = sharp(inputBuffer, {
		failOnError: false,
		pages: -1,
		limitInputPixels: config.service.config.limitInputPixels,
	});

	// always call rotate to adjust for EXIF data orientation
	image.rotate();

	return image;
}

/**
 * Resizes the image using the same logic as Astro's built-in image service.
 * @see https://github.com/withastro/astro/blob/8cab2a4f7ee0cfbcf0ddaec0878da637e7854b9d/packages/astro/src/assets/services/sharp.ts#L78-L98
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
