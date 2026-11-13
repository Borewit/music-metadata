import { fromBlob, fromBuffer } from 'strtok3';
import { type ByteSource, TokenizerSource } from './source.shared.js';

export type { ByteSource } from './source.shared.js';

/**
 * Realm-independent Blob check: `instanceof Blob` fails for Blobs from other
 * browser realms (e.g. iframes), so also accept any object exposing `size`.
 */
function isBlob(input: Blob | Uint8Array): input is Blob {
  return input instanceof Blob || 'size' in input;
}

/**
 * Open a random-access source from a Blob or an in-memory buffer.
 */
export async function openSource(input: Blob | Uint8Array): Promise<ByteSource> {
  return new TokenizerSource(isBlob(input) ? fromBlob(input) : fromBuffer(input));
}
