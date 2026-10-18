export function dffChunk(id: string, size: bigint, payload = Buffer.alloc(0)): Buffer {
  const header = Buffer.alloc(12);
  header.write(id);
  header.writeBigInt64BE(size, 4);
  return Buffer.concat([header, payload]);
}

export function dff(payload: Buffer, declaredSize = BigInt(4 + payload.length)): Buffer {
  return dffChunk('FRM8', declaredSize, Buffer.concat([Buffer.from('DSD '), payload]));
}
