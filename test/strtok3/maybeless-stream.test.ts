import { describe, test, expect } from "vitest";
import { fromStream } from "../../lib/strtok3";
import { PassThrough } from "node:stream";

describe("fromStream with mayBeLess flag", () => {
  test("mayBeLess=true", async () => {
    // Initialize empty stream
    const stream = new PassThrough();
    const tokenizer = await fromStream(stream);
    stream.end();

    // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
    const buffer = Buffer.alloc(5);
    const bytesRead = await tokenizer.peekBuffer(buffer, { mayBeLess: true });
    expect(bytesRead).toBe(0);
  });

  test("mayBeLess=false", async () => {
    try {
      // Initialize empty stream
      const stream = new PassThrough();
      const tokenizer = await fromStream(stream);
      stream.end();

      // Try to read 5 bytes from empty stream, with mayBeLess flag enabled
      const buffer = Buffer.alloc(5);
      await tokenizer.peekBuffer(buffer, { mayBeLess: false });
    } catch (error) {
      if (error instanceof Error) {
        expect(error.message).toBe("End-Of-Stream");
      } else {
        expect.fail("Expected: err instanceof Error");
      }
      return;
    }
    expect.fail("Should throw End-Of-Stream error");
  });
});
