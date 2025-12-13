import type diffusionKernels from './diffusion-kernels';
import type thresholdMaps from './threshold-maps.json';

export type Algorithm =
	| keyof typeof thresholdMaps
	| keyof typeof diffusionKernels
	| 'white-noise'
	| 'threshold';
