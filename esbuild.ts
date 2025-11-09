import * as _AMF from './src/AMF.js';
import * as _AMF0 from './src/AMF0.js';
import * as _AMF3 from './src/AMF3.js';

declare global {
	var AMF: typeof _AMF
	var AMF0: typeof _AMF0
	var AMF3: typeof _AMF3
}

globalThis.AMF = _AMF;
globalThis.AMF0 = _AMF0;
globalThis.AMF3 = _AMF3;
