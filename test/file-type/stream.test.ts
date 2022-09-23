import { Buffer } from "node:buffer";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { nextTick } from "node:process";
import { Readable } from "node:stream";

import { test, expect } from "vitest";

import { fileTypeStream } from "../../lib/file-type/fileTypeStream";
import { SourceStream } from "../util";

import { streamToBuffer } from "./util";

test(".stream() method - empty stream", async () => {
  const newStream = await fileTypeStream(new SourceStream(Buffer.alloc(0)));
  expect(newStream.fileType).toBeUndefined();
});

test(".stream() method - short stream", async () => {
  const source = Buffer.from([0, 1, 0, 1]);

  // Test filetype detection
  const shortStream = new SourceStream(source);
  const newStream = await fileTypeStream(shortStream);
  expect(newStream.fileType).toBeUndefined();

  // Test usability of returned stream
  const returned = await streamToBuffer(newStream);
  expect(source).toStrictEqual(returned);
});

test(".stream() method - no end-of-stream errors", async () => {
  const file = join(__dirname, "fixture", "fixture.ogm");
  const stream = await fileTypeStream(createReadStream(file), {
    sampleSize: 30,
  });
  expect(stream.fileType).toBeUndefined();
});

test(".stream() method - error event", async () => {
  const message = "Fixture";

  const stream = new Readable({
    read() {
      nextTick(() => {
        this.emit("error", new Error(message));
      });
    },
  });

  await expect(fileTypeStream(stream)).rejects.toThrow(message);
});

test(".stream() method - sampleSize option", async () => {
  const file = join(__dirname, "fixture", "fixture.ogm");
  let stream = await fileTypeStream(createReadStream(file), {
    sampleSize: 30,
  });
  expect(stream.fileType, "file-type cannot be determined with a sampleSize of 30").toBeUndefined();

  stream = await fileTypeStream(createReadStream(file), {
    sampleSize: 4100,
  });
  expect(stream.fileType, "file-type can be determined with a sampleSize of 4100").toBeTypeOf("object");
  expect(stream.fileType!.mime).toBe("video/ogg");
});
