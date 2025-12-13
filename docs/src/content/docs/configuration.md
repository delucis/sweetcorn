---
title: Configuration
---

The image service integration can be configured by passing options in the `astro.config.mjs` file:

```js
import { defineConfig } from 'astro/config';
import retroImageService from 'astro-retro-image-service';

export default defineConfig({
	image: {
		service: retroImageService({
			// Configuration options here
		}),
	},
});
```

The Astro Retro Image Service supports the following configuration options.

## `defaultDitherAlgorithm`

**Type:** `"bayer-2" | "bayer-4" | "bayer-8" | "bayer-16" | "simple" | "floyd-steinberg" | "jarvis-judice-ninke" | "stucki" | "atkinson" | "threshold" | "white-noise"`

By default, no dithering algorithm is applied to images unless a `dither` option is passed to the `<Image>` component or `getImage()` call.

If you want to apply a dithering algorithm to images by default, you can set the `defaultDitherAlgorithm` to your preferred algorithm.
This algorithm will be used whenever no specific `dither` option is provided.

When using a default algorithm, you can opt out of dithering by setting `dither` to `false` in the `<Image>` component or `getImage()`.
