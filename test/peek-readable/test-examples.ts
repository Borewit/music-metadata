import { expect, test } from "vitest";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { EndOfStreamError, StreamReader } from "../../lib/peek-readable";

const filePath = join(__dirname, "resources", "JPEG_example_JPG_RIP_001.jpg");

test("first example", async () => {
  const readable = createReadStream(filePath);
  const streamReader = new StreamReader(readable);
  const uint8Array = new Uint8Array(16);
  const bytesRead = await streamReader.read(uint8Array, 0, 16);

  expect(bytesRead).toBe(16);
});

test("End-of-stream detection", async () => {
  const fileReadStream = createReadStream(filePath);
  const streamReader = new StreamReader(fileReadStream);
  const uint8Array = new Uint8Array(16);

  expect(await streamReader.read(uint8Array, 0, 16)).toBe(16);

  try {
    while ((await streamReader.read(uint8Array, 0, 1)) > 0);
    expect.fail("Should throw EndOfStreamError");
  } catch (error) {
    expect(error, "Expect `error` to be instance of `EndOfStreamError`").toBeInstanceOf(EndOfStreamError);
  }
});

test("peek", async () => {
  const fileReadStream = createReadStream(filePath);
  const streamReader = new StreamReader(fileReadStream);
  const buffer = Buffer.alloc(20);

  let bytesRead = await streamReader.peek(buffer, 0, 3);

  expect(bytesRead).toBe(3);
  expect(buffer[0]).toBe(0xff);
  expect(buffer[1]).toBe(0xd8);
  expect(buffer[2]).toBe(0xff);

  bytesRead = await streamReader.read(buffer, 0, 20); // Read JPEG header

  expect(bytesRead).toBe(20);
});
