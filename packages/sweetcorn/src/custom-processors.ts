import type { ArrayOrBuffer, ImageInfo } from './types.js';

/**
 * A collection of pixel mutation processors that deviate from the standardized threshold map and
 * error diffusion algorithms.
 */
export const customProcessors: Record<
	'white-noise' | 'threshold',
	(pixels: ArrayOrBuffer<number>, info: ImageInfo) => void
> = {
	/**
	 * White noise dithering (pretty rough and ugly)
	 */
	'white-noise'(pixels, { channels }) {
		for (let index = 0; index < pixels.length; index += channels) {
			const threshold = Math.random();
			for (let channel = 0; channel < channels; channel++) {
				if (channel > 2) continue; // Skip alpha channel
				pixels[index + channel] = pixels[index + channel] / 255 < threshold ? 0 : 255;
			}
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
