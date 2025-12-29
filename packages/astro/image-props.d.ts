declare namespace Astro {
	interface CustomImageProps {
		/** Dither this image with the specified algorithm. Set to `false` to disable dithering. */
		dither?:
			| Sweetcorn.Algorithm
			| false
			| {
					algorithm: Sweetcorn.Algorithm;
					preserveColour?: boolean | undefined;
					preserveAlpha?: boolean | undefined;
			  };
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
