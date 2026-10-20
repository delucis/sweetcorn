---
"@sweetcorn/astro": minor
---

Updates the image service to align with Astro changes:

- Supports cropping based on `width`, `height`, and `fit` like Astro’s default image service (matching [behaviour since Astro v6](https://docs.astro.build/en/guides/upgrade-to/v6/#changed-cropping-by-default-in-default-image-service))
- Adds support for the [`background`](https://docs.astro.build/en/reference/modules/astro-assets/#background) option on images (added in Astro 5.17.0)
- Uses Astro’s logger with the default image service (since [Astro 7.3.0](https://github.com/withastro/astro/pull/17818))
- Updates the minimum version of `sharp` to v0.35
