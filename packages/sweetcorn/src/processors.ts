import { ArrayOrBuffer } from './types.js';

/** Applies a threshold map to raw pixel data for ordered dithering. */
export function applyThresholdMap(
	pixels: ArrayOrBuffer<number>,
	width: number,
	map: number[][]
): void {
	const mapWidth = map[0]!.length;
	const mapHeight = map.length;
	for (let index = 0; index < pixels.length; index++) {
		const pixelValue = pixels[index]!;
		const [x, y] = [index % width, Math.floor(index / width)];
		const threshold = map[y % mapHeight]![x % mapWidth]!;
		pixels[index] = pixelValue < threshold ? 0 : 255;
	}
}

/** Applies an error diffusion kernel to raw pixel data. */
export function applyDiffusionKernel(
	pixels: ArrayOrBuffer<number>,
	width: number,
	height: number,
	kernel: number[][]
): void {
	const kernelWidth = kernel[0]!.length;
	const kernelHeight = kernel.length;
	const kernelRadius = Math.floor((kernelWidth - 1) / 2);

	for (let index = 0; index < pixels.length; index++) {
		const original = pixels[index]!;
		const quantized = original < 128 ? 0 : 255;
		pixels[index] = quantized;
		const error = original - quantized;

		// (x, y) co-ordinates of the current pixel in the image.
		const [x, y] = [index % width, Math.floor(index / width)];

		// Distribute the error to neighbouring pixels based on the kernel.
		for (let diffX = 0; diffX < kernelWidth; diffX++) {
			for (let diffY = 0; diffY < kernelHeight; diffY++) {
				const diffusionWeight = kernel[diffY]![diffX]!;
				if (diffusionWeight === 0) continue;

				const neighbourX = x + diffX - kernelRadius;
				const neighbourY = y + diffY;

				// Ensure we don't go out of bounds
				if (neighbourX >= 0 && neighbourY >= 0 && neighbourX < width && neighbourY < height) {
					const neighbourIndex = neighbourY * width + neighbourX;
					pixels[neighbourIndex] = eightBitClamp(pixels[neighbourIndex]! + error * diffusionWeight);
				}
			}
		}
	}
}

/** Clamps a number between `0` and `255`. */
function eightBitClamp(value: number): number {
	return Math.min(Math.max(value, 0), 255);
}
