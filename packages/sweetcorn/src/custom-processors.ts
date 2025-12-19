import { ArrayOrBuffer } from './types.js';

/**
 * A collection of pixel mutation processors that deviate from the standardized threshold map and
 * error diffusion algorithms.
 */
export const customProcessors: Record<
	'white-noise' | 'threshold',
	(pixels: ArrayOrBuffer<number>) => void
> = {
	/**
	 * White noise dithering (pretty rough and ugly)
	 */
	'white-noise'(pixels) {
		for (let index = 0; index < pixels.length; index++) {
			const pixelValue = pixels[index]!;
			pixels[index] = pixelValue / 255 < Math.random() ? 0 : 255;
		}
	},

	/**
	 * Basic quantization. This could be represented as a threshold map of `[[128]]` but defining it
	 * like this allows it to be implemented more efficiently.
	 */
	threshold(pixels) {
		for (let index = 0; index < pixels.length; index++) {
			const pixelValue = pixels[index]!;
			pixels[index] = pixelValue < 128 ? 0 : 255;
		}
	},
};
