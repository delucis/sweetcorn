# @sweetcorn/astro

## 0.3.0

### Minor Changes

- [`2df50c1`](https://github.com/delucis/sweetcorn/commit/2df50c1022c51f44baab525a365a16d24bca54f4) Thanks [@delucis](https://github.com/delucis)! - Adds class names to dithered images to make them easier to target in CSS.

  For example, an image dithered using the Floyd-Steinberg algorithm now has these class names:

  ```html
  <img class="sw-dithered sw-floyd-steinberg" ... />
  ```

## 0.2.0

### Minor Changes

- [#6](https://github.com/delucis/sweetcorn/pull/6) [`2f25d3e`](https://github.com/delucis/sweetcorn/commit/2f25d3e32676b5907cdb5e2c4454c7bcc7d97b0c) Thanks [@delucis](https://github.com/delucis)! - Adds proper types for the `dither` prop in Astro’s image APIs. Requires Astro 5.16.6 or higher.

- [#6](https://github.com/delucis/sweetcorn/pull/6) [`2f25d3e`](https://github.com/delucis/sweetcorn/commit/2f25d3e32676b5907cdb5e2c4454c7bcc7d97b0c) Thanks [@delucis](https://github.com/delucis)! - Exports a type to help with typing code that interfaces with the `dither` prop:

  ```ts
  import type { DitheringAlgorithm } from "@sweetcorn/astro";
  ```

- [`694d952`](https://github.com/delucis/sweetcorn/commit/694d9522dfb9162bf9e70771785405478fbc7375) Thanks [@delucis](https://github.com/delucis)! - Adds 11 new threshold map dithering patterns

### Patch Changes

- Updated dependencies [[`935d1fe`](https://github.com/delucis/sweetcorn/commit/935d1fec22e4e48dda033cf9fb5bfad93e2213f9), [`694d952`](https://github.com/delucis/sweetcorn/commit/694d9522dfb9162bf9e70771785405478fbc7375)]:
  - sweetcorn@0.2.0

## 0.1.0

### Minor Changes

- [#2](https://github.com/delucis/sweetcorn/pull/2) [`2f12948`](https://github.com/delucis/sweetcorn/commit/2f12948b33241b36b25280ddae49ccd5d6ad8766) Thanks [@delucis](https://github.com/delucis)! - Add support for providing your own custom threshold maps and error diffusion kernels for Sweetcorn to dither with

### Patch Changes

- Updated dependencies [[`2f12948`](https://github.com/delucis/sweetcorn/commit/2f12948b33241b36b25280ddae49ccd5d6ad8766)]:
  - sweetcorn@0.1.0

## 0.0.2

### Patch Changes

- [`265e107`](https://github.com/delucis/sweetcorn/commit/265e1073ee967a47e670c60da7a71a486772e2a5) Thanks [@delucis](https://github.com/delucis)! - Fixes installation with `astro add`

## 0.0.1

Initial release
