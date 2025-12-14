---
title: Acknowledgements
description: Credits for the some of the resources and tools that  made Sweetcorn possible
---

Thank you to the following people, projects, and resources that made Sweetcorn possible!

- Lovell Fuller’s [Sharp][sharp] is the image processing library Sweetcorn builds on top of.

- Surma’s [“Ditherpunk — The article I wish I had about monochrome image dithering”][ditherpunk] was a helpful introduction to dithering concepts and techniques. The blue noise threshold map included in Sweetcorn was generated using Surma’s void-and-cluster implementation.

- makew0rld’s [dither][dither-go] library (written in Go) provided reference implementations of several less common and interesting threshold maps as well as the first reference I saw to Steven Pigeon’s [error diffusion kernel][pigeon].

- Johan Åhlén’s [Pixel Values Extractor][pixels] was a handy tool for converting threshold map images into numerical arrays.

- I first started thinking about building Sweetcorn after playing around with Doron Supply’s [Dithertone Pro][dithertone] Photoshop plugin.

[sharp]: https://sharp.pixelplumbing.com/
[ditherpunk]: https://surma.dev/things/ditherpunk/
[dither-go]: https://github.com/makew0rld/dither
[pigeon]: https://hbfs.wordpress.com/2013/12/31/dithering/
[pixels]: https://www.boxentriq.com/code-breaking/pixel-values-extractor
[dithertone]: https://www.doronsupply.com/dithertone-pro/
