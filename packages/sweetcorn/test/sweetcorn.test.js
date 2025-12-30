import assert from 'node:assert';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import sweetcorn from 'sweetcorn';

describe('sweetcorn()', () => {
	// #region monochrome inputs
	describe('with monochrome inputs', () => {
		it('dithers an image using a built-in threshold map', async () => {
			const image = sharp(Buffer.from([127, 127, 127, 127]), {
				raw: { width: 2, height: 2, channels: 1 },
			});
			const dithered = await sweetcorn(image, { algorithm: 'bayer-2' });
			const data = await dithered.raw().toBuffer();
			// Note that this result differs from the direct applyThresholdMap() test.
			// This is because we gamma correct Sharp images from srgb to linear before processing.
			// Our input pixel value of 127 is only 37 after this correction.
			assert.deepEqual(Array.from(data), [255, 0, 0, 0]);
		});

		it('dithers an image using a built-in diffusion kernel', async () => {
			const image = sharp(Buffer.from([60, 120, 180, 250]), {
				raw: { width: 2, height: 2, channels: 1 },
			});
			const dithered = await sweetcorn(image, { algorithm: 'simple-diffusion' });
			const data = await dithered.raw().toBuffer();
			// See note above about gamma correction.
			assert.deepEqual(Array.from(data), [0, 0, 0, 255]);
		});

		it('dithers an image using a custom threshold map', async () => {
			const customMap = [[0]];
			const image = sharp(Buffer.from([60, 120, 180, 240]), {
				raw: { width: 2, height: 2, channels: 1 },
			});
			const dithered = await sweetcorn(image, { thresholdMap: customMap });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 255, 255, 255]);
		});

		it('dithers an image using a custom diffusion kernel', async () => {
			const customKernel = [[0, 255]];
			const image = sharp(Buffer.from([60, 120, 180, 240]), {
				raw: { width: 2, height: 2, channels: 1 },
			});
			const dithered = await sweetcorn(image, { diffusionKernel: customKernel });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [0, 255, 0, 255]);
		});

		it('outputs a 3-channel image when preserveColour is true', async () => {
			const image = sharp(Buffer.from([127, 127, 127, 127]), {
				raw: { width: 2, height: 2, channels: 1 },
			});
			const dithered = await sweetcorn(image, { algorithm: 'bayer-2', preserveColour: true });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
		});
	});

	// #region colour inputs
	describe('with colour inputs', () => {
		// A 2x2 red image with mid-level brightness.
		const redImage = sharp(Buffer.from([127, 0, 0, 127, 0, 0, 127, 0, 0, 127, 0, 0]), {
			raw: { width: 2, height: 2, channels: 3 },
		});

		it('outputs a 1-channel image when preserveColour is false', async () => {
			const dithered = await sweetcorn(redImage, { algorithm: 'bayer-2' });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 0, 0, 0]);
		});

		it('outputs a 3-channel image when preserveColour is true', async () => {
			const dithered = await sweetcorn(redImage, { algorithm: 'bayer-2', preserveColour: true });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
		});

		it('outputs a 3-channel image when preserveColour and preserveAlpha are true', async () => {
			const dithered = await sweetcorn(redImage, {
				algorithm: 'bayer-2',
				preserveColour: true,
				preserveAlpha: true,
			});
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
		});
	});

	// #region inputs with alpha
	describe('with inputs that have an alpha channel', () => {
		// A 2x2 semi-transparent mid-level brightness image.
		const greyImage = sharp(
			Buffer.from([127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127]),
			{ raw: { width: 2, height: 2, channels: 4 } }
		);

		it('outputs a 1-channel image when preserveAlpha is false', async () => {
			const dithered = await sweetcorn(greyImage, { algorithm: 'bayer-2' });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 0, 0, 0]);
		});

		it('outputs a 2-channel image when preserveAlpha is true', async () => {
			const dithered = await sweetcorn(greyImage, { algorithm: 'bayer-2', preserveAlpha: true });
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(Array.from(data), [255, 127, 0, 127, 0, 127, 0, 127]);
		});

		it('outputs a 4-channel image when preserveColour and preserveAlpha are true', async () => {
			const dithered = await sweetcorn(greyImage, {
				algorithm: 'bayer-2',
				preserveColour: true,
				preserveAlpha: true,
			});
			const data = await dithered.raw().toBuffer();
			assert.deepEqual(
				Array.from(data),
				[255, 255, 255, 127, 0, 0, 0, 127, 0, 0, 0, 127, 0, 0, 0, 127]
			);
		});
	});

	// #region actual image files
	describe('with image files', () => {
		it('dithers a greyscale PNG', async (t) => {
			const image = sharp(resolve('../../../docs/src/assets/demo.png'));
			const dithered = await sweetcorn(image, { algorithm: 'bayer-4' });
			await assertImageSnapshot(t, dithered);
		});

		it('dithers a colour PNG', async (t) => {
			const image = sharp(resolve('../../../docs/src/assets/demo-color2.png'));
			const dithered = await sweetcorn(image, { algorithm: 'atkinson', preserveColour: true });
			await assertImageSnapshot(t, dithered);
		});

		it('dithers a JPEG', async (t) => {
			const image = sharp(resolve('../../../docs/src/assets/9237597241_7bb0b5ff7b_o.jpg'));
			const dithered = await sweetcorn(image, { algorithm: 'dot-diagonal-16' });
			await assertImageSnapshot(t, dithered);
		});

		it('dithers a PNG with transparency, preserving alpha', async (t) => {
			const image = sharp(resolve('../../../docs/src/assets/transparency.png'));
			const dithered = await sweetcorn(image, {
				algorithm: 'floyd-steinberg',
				preserveAlpha: true,
			});
			await assertImageSnapshot(t, dithered);
		});
	});
});

// #region utilities
/**
 * Resolves the passed path relative to this file.
 * @param {string} path Path to resolve, e.g. `"./example.png"`
 * @returns {string} Fully resolved file path.
 */
function resolve(path) {
	return fileURLToPath(new URL(path, import.meta.url));
}

/**
 * Asserts that the given `Sharp` image matches a saved snapshot.
 *
 * Run tests with `--test-update-snapshots` to update snapshots, saving the image to disk.
 *
 * @param {import('node:test').TestContext} testContext
 * @param {import('sharp').Sharp} image
 */
async function assertImageSnapshot(testContext, image) {
	const buffer = await image.png().toBuffer();
	const testSlug = testContext.name.toLowerCase().replace(/[^\w]+/g, '-');
	const fileName = resolve(`./snapshots/${testSlug}.png`);
	testContext.assert.fileSnapshot(buffer, fileName, {
		// When updating snapshots, write a raw `Buffer` to disk so that it is viewable as an image.
		// When comparing to the pre-existing snapshot, convert the `Buffer` to a UTF-8 string to match
		// the format Node reads from disk.
		serializers: process.execArgv.includes('--test-update-snapshots')
			? []
			: [(/** @type {Buffer} */ buf) => buf.toString('utf-8')],
	});
}
