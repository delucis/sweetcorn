import type diffusionKernels from './diffusion-kernels.js';
import type thresholdMaps from './threshold-maps.json';

export type DitheringAlgorithm =
	| keyof typeof thresholdMaps
	| keyof typeof diffusionKernels
	| 'white-noise'
	| 'threshold';

export interface SweetcornOptions {
	/**
	 * The name of one of Sweetcorn’s built-in dithering algorithms to use.
	 *
	 * @see https://delucis.github.io/sweetcorn/algorithms/
	 *
	 * @example
	 * algorithm: 'floyd-steinberg'
	 */
	algorithm?: DitheringAlgorithm | undefined;

	/**
	 * A custom threshold map to use for ordered dithering.
	 *
	 * @see https://delucis.github.io/sweetcorn/guides/byo-algorithm/#defining-a-custom-threshold-map-for-sweetcorn
	 *
	 * @example
	 * thresholdMap: [
	 *   [0, 0.5],
	 *   [0.75, 0.25],
	 * ]
	 */
	thresholdMap?: number[][] | undefined;

	/**
	 * A custom diffusion kernel to use for error diffusion dithering.
	 *
	 * @see https://delucis.github.io/sweetcorn/guides/byo-algorithm/#defining-a-custom-diffusion-kernel-for-sweetcorn
	 *
	 * @example
	 * diffusionKernel: [
	 *   [0, 0, 0.2],
	 *   [0.1, 0.4, 0.1],
	 *   [0, 0.2, 0],
	 * ]
	 */
	diffusionKernel?: number[][] | undefined;
}

/** Any array-like structure indexed by numbers and with a `length`, e.g. an `Array` or `Buffer`. */
export interface ArrayOrBuffer<T> {
	length: number;
	[n: number]: T;
}
