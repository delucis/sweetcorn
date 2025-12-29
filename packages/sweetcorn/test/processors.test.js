import assert from 'node:assert';
import { describe, it } from 'node:test';
import diffusionKernels from '../dist/diffusion-kernels.js';
import { applyDiffusionKernel, applyThresholdMap } from '../dist/processors.js';
import thresholdMaps from '../dist/threshold-maps.json' with { type: 'json' };

const monochrome2x2 = { width: 2, height: 2, channels: 1 };
const color2x2 = { width: 2, height: 2, channels: 3 };
const colorPlusAlpha2x2 = { width: 2, height: 2, channels: 4 };

// #region applyThresholdMap
describe('applyThresholdMap()', () => {
	it('mutates a pixel array', () => {
		const pixels = [127, 127, 127, 127];
		applyThresholdMap(pixels, monochrome2x2, [[64, 184]]);
		assert.deepEqual(pixels, [255, 0, 255, 0]);
	});

	describe('with monochrome images', () => {
		it('it sets all values to 0 or 255', () => {
			const pixels = [60, 120, 180, 240];
			applyThresholdMap(pixels, monochrome2x2, [[64, 184]]);
			assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
		});

		it('supports maps with multiple rows', () => {
			const pixels = [60, 120, 180, 240];
			applyThresholdMap(pixels, monochrome2x2, [
				[64, 184],
				[92, 255],
			]);
			assert.deepEqual(pixels, [0, 0, 255, 0]);
		});

		it('dithers using the built-in bayer-2 threshold map', () => {
			const pixels = [127, 127, 127, 127];
			applyThresholdMap(pixels, monochrome2x2, thresholdMaps['bayer-2']);
			assert.deepEqual(pixels, [255, 0, 0, 255]);
		});
	});

	describe('with color images', () => {
		it('it sets all values to 0 or 255', () => {
			// Red channel values only; green and blue are 0.
			const pixels = [60, 0, 0, 120, 0, 0, 180, 0, 0, 240, 0, 0];
			applyThresholdMap(pixels, color2x2, [[64, 184]]);
			assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
		});

		it('supports maps with multiple rows', () => {
			// Red channel values only; green and blue are 0.
			const pixels = [60, 0, 0, 120, 0, 0, 180, 0, 0, 240, 0, 0];
			applyThresholdMap(pixels, color2x2, [
				[64, 184],
				[92, 255],
			]);
			assert.deepEqual(pixels, [0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0]);
		});

		it('dithers using the built-in bayer-2 threshold map', () => {
			// Green channel values only; red and blue are 0.
			const pixels = [0, 127, 0, 0, 127, 0, 0, 127, 0, 0, 127, 0];
			applyThresholdMap(pixels, color2x2, thresholdMaps['bayer-2']);
			assert.deepEqual(pixels, [255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 255, 0]);
		});
	});

	describe('with alpha channel', () => {
		it('does not process the alpha channel', () => {
			// Green channel values only; red and blue are 0. Alpha channel is 200 throughout.
			const pixels = [0, 127, 0, 200, 0, 127, 0, 200, 0, 127, 0, 200, 0, 127, 0, 200];
			applyThresholdMap(pixels, colorPlusAlpha2x2, thresholdMaps['bayer-2']);
			assert.deepEqual(pixels, [255, 255, 255, 200, 0, 0, 0, 200, 0, 0, 0, 200, 0, 255, 0, 200]);
		});
	});
});

// #region applyDiffusionKernel
describe('applyDiffusionKernel()', () => {
	it('mutates a pixel array', () => {
		const pixels = [127, 127, 127, 127];
		applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
		assert.deepEqual(pixels, [0, 255, 255, 0]);
	});

	describe('with monochrome images', () => {
		it('sets all values to 0 or 255', () => {
			const pixels = [60, 120, 180, 250];
			applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
			assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
		});

		it('diffuses errors to neighbouring pixels', () => {
			const pixels = [60, 120, 180, 250];
			applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
			assert.deepEqual(pixels, [0, 255, 255, 255]);
		});
	});

	describe('with colour images', () => {
		it('sets all values to 0 or 255', () => {
			// Red channel values only; green and blue are 0.
			const pixels = [60, 0, 0, 120, 0, 0, 180, 0, 0, 250, 0, 0];
			applyDiffusionKernel(pixels, color2x2, diffusionKernels['simple-diffusion']);
			assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
		});

		it('diffuses errors to neighbouring pixels', () => {
			// Red channel values only; green and blue are 0.
			const pixels = [60, 0, 0, 120, 0, 0, 180, 0, 0, 250, 0, 0];
			applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
			assert.deepEqual(pixels, [0, 0, 0, 255, 0, 0, 255, 0, 0, 255, 0, 0]);
		});
	});

	describe('with alpha channel', () => {
		it('does not process the alpha channel', () => {
			// Green channel values only; red and blue are 0. Alpha channel is 200 throughout.
			const pixels = [0, 60, 0, 200, 0, 120, 0, 200, 0, 180, 0, 200, 0, 250, 0, 200];
			applyDiffusionKernel(pixels, colorPlusAlpha2x2, diffusionKernels['simple-diffusion']);
			assert.deepEqual(pixels, [0, 0, 0, 200, 0, 255, 0, 200, 0, 255, 0, 200, 0, 255, 0, 200]);
		});
	});
});
