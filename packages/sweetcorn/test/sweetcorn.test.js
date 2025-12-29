import assert from 'node:assert';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import sweetcorn from 'sweetcorn';

// #region sweetcorn
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
