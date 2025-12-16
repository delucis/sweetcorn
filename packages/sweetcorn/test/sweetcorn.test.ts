/// <reference types="node" />

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applyDiffusionKernel, applyThresholdMap } from '../src/processors.ts';
import diffusionKernels from '../src/diffusion-kernels.ts';

describe('sweetcorn', () => {
	describe('algorithms', () => {
		describe('applyThresholdMapToPixels()', () => {
			it('mutates a pixel array', () => {
				const pixels = [127, 127, 127, 127];
				applyThresholdMap(pixels, 2, [[64, 184]]);
				assert.deepEqual(pixels, [255, 0, 255, 0]);
			});

			it('it sets all values to 0 or 255', () => {
				const pixels = [60, 120, 180, 240];
				applyThresholdMap(pixels, 2, [[64, 184]]);
				assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
			});

			it('it supports maps with multiple rows', () => {
				const pixels = [60, 120, 180, 240];
				applyThresholdMap(pixels, 2, [
					[64, 184],
					[92, 255],
				]);
				assert.deepEqual(pixels, [0, 0, 255, 0]);
			});
		});

		describe('applyDiffusionKernel()', () => {
			it('mutates a pixel array', () => {
				const pixels = [127, 127, 127, 127];
				applyDiffusionKernel(pixels, 2, 2, diffusionKernels['simple-diffusion']);
				assert.deepEqual(pixels, [0, 255, 255, 0]);
			});

			it('sets all values to 0 or 255', () => {
				const pixels = [60, 120, 180, 250];
				applyDiffusionKernel(pixels, 2, 2, diffusionKernels['simple-diffusion']);
				assert(pixels.every((pixel) => pixel === 0 || pixel === 255));
			});
		});
	});
});
