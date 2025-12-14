/**
 * Error diffusion dither kernels.
 *
 * Each kernel uses a 2D array to represent how the error from a pixel’s quantization should be
 * distributed to neighbouring pixels. The central pixel in the first row is the current pixel,
 * so its value is always 0, same for any preceding pixels as we process pixels from left to right
 * and error should only be distributed to unvisited pixels.
 *
 * For example, the simplest kernel here distributes half the error to the pixel on the right, and
 * half the error to the pixel directly below:
 * ```
 * ┌─────┬─────┐
 * │  *  │ 0.5 │
 * ├─────┼─────┤
 * │ 0.5 │     │
 * └─────┴─────┘
 * ```
 * In our code this is represented as:
 * ```js
 * [
 *   [0, 0.5],
 *   [0.5, 0],
 * ]
 * ```
 *
 * Each non-zero value in the kernel represents the fraction of the error to distribute to that
 * pixel. The sum of all values in a kernel is usually ≤1.
 *
 */
export default {
	'simple-diffusion': [
		[0, 0.5],
		[0.5, 0],
	],
	'floyd-steinberg': [
		[0, 0, 7 / 16],
		[3 / 16, 5 / 16, 1 / 16],
	],
	'false-floyd-steinberg': [
		[0, 3 / 8],
		[3 / 8, 2 / 8],
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
	burkes: [
		[0, 0, 0, 8 / 32, 4 / 32],
		[2 / 32, 4 / 32, 8 / 32, 4 / 32, 2 / 32],
	],
	atkinson: [
		[0, 0, 1 / 8, 1 / 8],
		[1 / 8, 1 / 8, 1 / 8, 0],
		[0, 1 / 8, 0, 0],
	],
	// see: https://hbfs.wordpress.com/2013/12/31/dithering/
	pigeon: [
		[0, 0, 0, 2 / 14, 1 / 14],
		[0, 2 / 14, 2 / 14, 2 / 14, 0],
		[1 / 14, 0, 1 / 14, 0, 1 / 14],
	],
	sierra: [
		[0, 0, 0, 5 / 32, 3 / 32],
		[2 / 32, 4 / 32, 5 / 32, 4 / 32, 2 / 32],
		[0, 2 / 32, 3 / 32, 2 / 32, 0],
	],
	'sierra-two-row': [
		[0, 0, 0, 4 / 16, 3 / 16],
		[1 / 16, 2 / 16, 3 / 16, 2 / 16, 1 / 16],
	],
	'sierra-lite': [
		[0, 0, 2 / 4],
		[1 / 4, 1 / 4, 0],
	],
};
