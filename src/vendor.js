// Third-party libraries bundled into the page by build.mjs (esbuild).
// To add one: `npm install <paquete>`, import it here and list it in PintoraLibs.
// The app reads them from window.PintoraLibs.
import { readPsd, writePsd } from 'ag-psd';
import * as UTIF from 'utif';
import { GifReader } from 'omggif';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { XCFParser } from '@theprogrammingiantpanda/xcfreader/browser';

window.PintoraLibs = { psd: { readPsd, writePsd }, UTIF, gif: { GifReader, GIFEncoder, quantize, applyPalette }, xcf: { XCFParser } };
