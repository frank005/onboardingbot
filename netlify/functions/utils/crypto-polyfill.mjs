/**
 * jose's webapi build calls bare `crypto.subtle` (browser global).
 * Netlify Functions on Node 18 do not define that global — only globalThis.crypto
 * in newer Node, and bundled jose still references `crypto`.
 */
import { webcrypto } from "node:crypto";

const wc = globalThis.crypto ?? webcrypto;
globalThis.crypto = wc;
// Expose as bare global for jose's bundled webapi modules.
global.crypto = wc;
