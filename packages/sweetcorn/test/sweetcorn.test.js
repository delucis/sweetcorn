import assert from 'node:assert';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import sweetcorn from 'sweetcorn';
import diffusionKernels from '../dist/diffusion-kernels.js';
import { applyDiffusionKernel, applyThresholdMap } from '../dist/processors.js';
import thresholdMaps from '../dist/threshold-maps.json' with { type: 'json' };

const monochrome2x2 = { width: 2, height: 2, channels: 1 };

describe('algorithms', () => {
	describe('applyThresholdMapToPixels()', () => {
		it('mutates a pixel array', () => {
			const pixels = [127, 127, 127, 127];
			applyThresholdMap(pixels, monochrome2x2, [[64, 184]]);
			assert.deepEqual(pixels, [255, 0, 255, 0]);
		});

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

	describe('applyDiffusionKernel()', () => {
		it('mutates a pixel array', () => {
			const pixels = [127, 127, 127, 127];
			applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
			assert.deepEqual(pixels, [0, 255, 255, 0]);
		});

		it('sets all values to 0 or 255', () => {
			const pixels = [60, 120, 180, 250];
			applyDiffusionKernel(pixels, monochrome2x2, diffusionKernels['simple-diffusion']);
			assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
		});
	});
});

describe('sweetcorn()', () => {
	it('dithers an image using a built-in threshold map', async () => {
		const image = sharp(Buffer.from([127, 127, 127, 127]), {
			raw: { width: 2, height: 2, channels: 1 },
		});
		const dithered = await sweetcorn(image, { algorithm: 'bayer-2' });
		const data = await dithered.toColourspace('b-w').raw().toBuffer();
		// Note that this result differs from the direct applyThresholdMap() test above.
		// This is because we gamma correct Sharp images from srgb to linear before processing.
		// Our input pixel value of 127 is only 37 after this correction.
		assert.deepEqual(Array.from(data), [255, 0, 0, 0]);
	});

	it('dithers an image using a built-in diffusion kernel', async () => {
		const image = sharp(Buffer.from([60, 120, 180, 250]), {
			raw: { width: 2, height: 2, channels: 1 },
		});
		const dithered = await sweetcorn(image, { algorithm: 'simple-diffusion' });
		const data = await dithered.toColourspace('b-w').raw().toBuffer();
		// See note above about gamma correction.
		assert.deepEqual(Array.from(data), [0, 0, 0, 255]);
	});

	it('dithers an image using a custom threshold map', async () => {
		const customMap = [[0]];
		const image = sharp(Buffer.from([60, 120, 180, 240]), {
			raw: { width: 2, height: 2, channels: 1 },
		});
		const dithered = await sweetcorn(image, { thresholdMap: customMap });
		const data = await dithered.toColourspace('b-w').raw().toBuffer();
		assert.deepEqual(Array.from(data), [255, 255, 255, 255]);
	});

	it('dithers an image using a custom diffusion kernel', async () => {
		const customKernel = [[0, 255]];
		const image = sharp(Buffer.from([60, 120, 180, 240]), {
			raw: { width: 2, height: 2, channels: 1 },
		});
		const dithered = await sweetcorn(image, { diffusionKernel: customKernel });
		const data = await dithered.toColourspace('b-w').raw().toBuffer();
		assert.deepEqual(Array.from(data), [0, 255, 0, 255]);
	});
});
