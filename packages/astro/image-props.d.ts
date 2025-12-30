declare namespace Astro {
	interface CustomImageProps {
		/**
		 * Dither this image with the specified algorithm. Set to `false` to disable dithering.
		 * Or pass an object to configure more of Sweetcorn’s options.
		 */
		dither?:
			| Sweetcorn.Algorithm
			| false
			| ({
					/**
					 * The name of one of the dithering algorithm to use.
					 */
					algorithm: Sweetcorn.Algorithm;
			  } & Pick<import('sweetcorn').SweetcornOptions, 'preserveColour' | 'preserveAlpha'>);
	}
}

declare namespace Sweetcorn {
	export type Algorithm =
		| import('sweetcorn').DitheringAlgorithm
		| (keyof Sweetcorn.Astro extends never ? never : Sweetcorn.Astro['CustomAlgorithms']);

	export interface Astro {
		/**
		 * We don’t define this here to allow us to later set it during Astro’s type generation based
		 * on a user’s provided custom algorithms.
		 */
		// CustomAlgorithms: never;
	}
}
