/**
 * jose's webapi build calls bare `crypto.subtle` (browser global).
 * Netlify Functions on Node 18 do not define that global.
 */
import { webcrypto } from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto;
}

if (typeof global.crypto === "undefined") {
  global.crypto = globalThis.crypto ?? webcrypto;
}
