import type { DitheringAlgorithm } from 'sweetcorn';

export interface SweetcornImageConfig<T extends string = never, D extends string = never> {
	/**
	 * The dithering algorithm to apply to all images processed by Astro by default.
	 *
	 * This can be overridden on a per-image basis by specifying the `dither` prop
	 * and disabled by setting `dither` to `false`.
	 *
	 * @see https://delucis.github.io/sweetcorn/guides/astro/#defaultditheralgorithm
	 *
	 * @example
	 * defaultDitherAlgorithm: 'floyd-steinberg',
	 */
	defaultDitherAlgorithm?: NoInfer<DitheringAlgorithm | T | D>;

	/**
	 * Custom threshold maps that can be used by name in the `dither` prop and
	 * `defaultDitherAlgorithm` option.
	 *
	 * @see https://delucis.github.io/sweetcorn/guides/astro/#customthresholdmaps
	 *
	 * @example
	 * customThresholdMaps: {
	 *   'my-map': [
	 *     [0, 0.5],
	 *     [0.75, 0.25],
	 *   ],
	 * },
	 */
	customThresholdMaps?: Record<T, number[][]>;

	/**
	 * Custom diffusion kernels that can be used by name in the `dither` prop and
	 * `defaultDitherAlgorithm` option.
	 *
	 * @see https://delucis.github.io/sweetcorn/guides/astro/#customdiffusionkernels
	 *
	 * @example
	 * customDiffusionKernels: {
	 *   'my-kernel': [
	 *     [0, 0, 0.2],
	 *     [0.1, 0.4, 0.1],
	 *     [0, 0.2, 0],
	 *   ],
	 * },
	 */
	customDiffusionKernels?: Record<D, number[][]>;
}
