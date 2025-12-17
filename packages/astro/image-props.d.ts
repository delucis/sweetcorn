declare namespace Astro {
	interface CustomImageProps {
		/** Dither this image with the specified algorithm. Set to `false` to disable dithering. */
		dither?:
			| import('sweetcorn').DitheringAlgorithm
			| false
			| (keyof Sweetcorn.Astro extends never ? never : Sweetcorn.Astro['CustomAlgorithms']);
	}
}

declare namespace Sweetcorn {
	export interface Astro {
		/** We don’t define this here to allow us to later set it during Astro’s type generation based
		 * on a user’s provided custom algorithms. */
		// CustomAlgorithms: never;
	}
}
