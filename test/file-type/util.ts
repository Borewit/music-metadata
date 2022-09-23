import type { Readable } from "node:stream";

export async function streamToBuffer(readable: Readable) {
  const buffer = [];
  for await (const chunk of readable) {
    buffer.push(Buffer.from(chunk as ArrayBuffer));
  }

  return Buffer.concat(buffer);
}
