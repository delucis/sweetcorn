# `sweetcorn`

JavaScript image dithering tools for Sharp

## Installation

```bash
npm install sweetcorn
```

## Basic usage

```js
import sharp from 'sharp';
import sweetcorn from 'sweetcorn';

const inputImage = await sharp('input.png');
const ditheredImage = await sweetcorn(inputImage, {
	algorithm: 'floyd-steinberg',
});
ditheredImage.webp({ lossless: true }).toFile('output.webp');
```

## Documentation

Learn more in the [Sweetcorn documentation site](https://delucis.github.io/sweetcorn/).

## License

[MIT](https://github.com/delucis/sweetcorn/blob/main/LICENSE)
