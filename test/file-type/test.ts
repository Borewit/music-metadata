import * as process from "node:process";
import { Buffer } from "node:buffer";
import * as path from "node:path";
import * as fs from "node:fs";
import * as stream from "node:stream";
import { test, assert, expect } from "vitest";
import { readableNoopStream } from "./noop-stream";
import {
  fileTypeFromBuffer,
  fileTypeFromStream,
  fileTypeFromFile,
  fileTypeStream,
  supportedExtensions,
  supportedMimeTypes,
  ReadableStreamWithFileType,
  FileExtension,
  MimeType,
} from "../../lib/file-type";

const t = assert;

const missingTests = new Set(["mpc"]);

const types = [...supportedExtensions].filter((ext) => !missingTests.has(ext));

// Define an entry here only if the fixture has a different
// name than `fixture` or if you want multiple fixtures
const names: { [key in FileExtension]?: string[] } = {
  aac: [
    "fixture-adts-mpeg2",
    "fixture-adts-mpeg4",
    "fixture-adts-mpeg4-2",
    "fixture-id3v2",
  ],
  asar: ["fixture", "fixture2"],
  arw: ["fixture-sony-zv-e10"],
  cr3: ["fixture"],
  dng: ["fixture-Leica-M10"],
  epub: ["fixture", "fixture-crlf"],
  nef: ["fixture", "fixture2", "fixture3", "fixture4"],
  "3gp": ["fixture", "fixture2"],
  woff2: ["fixture", "fixture-otto"],
  woff: ["fixture", "fixture-otto"],
  eot: ["fixture", "fixture-0x20001"],
  mov: ["fixture", "fixture-mjpeg", "fixture-moov"],
  mp2: ["fixture", "fixture-mpa"],
  mp3: ["fixture", "fixture-mp2l3", "fixture-ffe3"],
  mp4: [
    "fixture-imovie",
    "fixture-isom",
    "fixture-isomv2",
    "fixture-mp4v2",
    "fixture-dash",
  ],
  mts: ["fixture-raw", "fixture-bdav"],
  tif: ["fixture-big-endian", "fixture-little-endian"],
  gz: ["fixture.tar"],
  xz: ["fixture.tar"],
  lz: ["fixture.tar"],
  Z: ["fixture.tar"],
  zst: ["fixture.tar"],
  mkv: ["fixture", "fixture2"],
  mpg: ["fixture", "fixture2", "fixture.ps", "fixture.sub"],
  heic: ["fixture-mif1", "fixture-msf1", "fixture-heic"],
  ape: ["fixture-monkeysaudio"],
  mpc: ["fixture-sv7", "fixture-sv8"],
  pcap: ["fixture-big-endian", "fixture-little-endian"],
  png: ["fixture", "fixture-itxt"],
  tar: ["fixture", "fixture-v7", "fixture-spaces"],
  mie: ["fixture-big-endian", "fixture-little-endian"],
  m4a: [
    "fixture-babys-songbook.m4b", // Actually it's an `.m4b`
  ],
  flac: [
    "fixture",
    "fixture-id3v2", // FLAC prefixed with ID3v2 header
  ],
  docx: ["fixture", "fixture2", "fixture-office365"],
  pptx: ["fixture", "fixture2", "fixture-office365"],
  xlsx: ["fixture", "fixture2", "fixture-office365"],
  ogx: [
    "fixture-unknown-ogg", // Manipulated fixture to unrecognized Ogg based file
  ],
  avif: [
    "fixture-yuv420-8bit", // Multiple bit-depths and/or subsamplings
    "fixture-sequence",
  ],
  eps: ["fixture", "fixture2"],
  cfb: [
    "fixture.msi",
    "fixture.xls",
    "fixture.doc",
    "fixture.ppt",
    "fixture-2.doc",
  ],
  asf: ["fixture", "fixture.wma", "fixture.wmv"],
  ai: [
    "fixture-normal", // Normal AI
    "fixture-without-pdf-compatibility", // AI without the PDF compatibility (cannot be opened by PDF viewers I guess)
  ],
  jxl: [
    "fixture", // Image data stored within JXL container
    "fixture2", // Bare image data with no container
  ],
  pdf: [
    "fixture",
    "fixture-adobe-illustrator", // PDF saved from Adobe Illustrator, using the default "[Illustrator Default]" preset
    "fixture-smallest", // PDF saved from Adobe Illustrator, using the preset "smallest PDF"
    "fixture-fast-web", // PDF saved from Adobe Illustrator, using the default "[Illustrator Default"] preset, but enabling "Optimize for Fast Web View"
    "fixture-printed", // PDF printed from Adobe Illustrator, but with a PDF printer.
  ],
  webm: [
    "fixture-null", // EBML DocType with trailing null character
  ],
  xml: [
    "fixture",
    "fixture-utf8-bom", // UTF-8 with BOM
    "fixture-utf16-be-bom", // UTF-16 little endian encoded XML, with BOM
    "fixture-utf16-le-bom", // UTF-16 big endian encoded XML, with BOM
  ],
};

// Define an entry here only if the file type has potential
// for false-positives
const falsePositives: { [key in FileExtension]?: string[] } = {
  png: ["fixture-corrupt"],
};

// Known failing fixture
const failingFixture = new Set([]);

async function checkBufferLike(
  type: FileExtension,
  bufferLike: Uint8Array | ArrayBuffer | Buffer
) {
  const { ext, mime } = (await fileTypeFromBuffer(bufferLike)) || {};
  t.strictEqual(ext, type);
  t.strictEqual(typeof mime, "string");
}

async function checkFile(type: FileExtension, filePath: string) {
  const { ext, mime } = (await fileTypeFromFile(filePath)) || {};
  t.strictEqual(ext, type);
  t.strictEqual(typeof mime, "string");
}

async function testFromFile(ext: FileExtension, name?: string) {
  const file = path.join(__dirname, "fixture", `${name || "fixture"}.${ext}`);
  return checkFile(ext, file);
}

async function testFromBuffer(ext: FileExtension, name?: string) {
  const fixtureName = `${name || "fixture"}.${ext}`;

  const file = path.join(__dirname, "fixture", fixtureName);
  const chunk = fs.readFileSync(file);
  await checkBufferLike(ext, chunk);
  await checkBufferLike(ext, new Uint8Array(chunk));
  await checkBufferLike(
    ext,
    chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength)
  );
}

async function testFalsePositive(ext: FileExtension, name?: string) {
  const file = path.join(__dirname, "fixture", `${name}.${ext}`);

  await t.strictEqual(await fileTypeFromFile(file), undefined);

  const chunk = fs.readFileSync(file);
  t.strictEqual(await fileTypeFromBuffer(chunk), undefined);
  t.strictEqual(await fileTypeFromBuffer(new Uint8Array(chunk)), undefined);
  t.strictEqual(await fileTypeFromBuffer(chunk.buffer), undefined);
}

async function testFileFromStream(ext: FileExtension, name?: string) {
  const filename = `${name || "fixture"}.${ext}`;
  const file = path.join(__dirname, "fixture", filename);
  const fileType = await fileTypeFromStream(fs.createReadStream(file));

  t.isOk(fileType, `identify ${filename}`);
  t.strictEqual(fileType.ext, ext, "fileType.ext");
  t.strictEqual(typeof fileType.mime, "string", "fileType.mime");
}

async function loadEntireFile(
  readable: fs.ReadStream | ReadableStreamWithFileType
) {
  const buffer = [];
  for await (const chunk of readable) {
    buffer.push(Buffer.from(chunk));
  }

  return Buffer.concat(buffer);
}

async function testStream(ext: FileExtension, name?: string) {
  const fixtureName = `${name || "fixture"}.${ext}`;
  const file = path.join(__dirname, "fixture", fixtureName);

  const readableStream = await fileTypeStream(fs.createReadStream(file));
  const fileStream = fs.createReadStream(file);

  const [bufferA, bufferB] = await Promise.all([
    loadEntireFile(readableStream),
    loadEntireFile(fileStream),
  ]);

  t.isTrue(bufferA.equals(bufferB));
}

let i = 0;
for (const type of types) {
  if (Object.prototype.hasOwnProperty.call(names, type)) {
    for (const name of names[type]) {
      const fixtureName = `${name}.${type}`;
      const testFunction = failingFixture.has(fixtureName) ? test.fails : test;

      testFunction(
        `${name}.${type} ${i++} .fromFile() method - same fileType`,
        () => testFromFile(type, name)
      );
      testFunction(
        `${name}.${type} ${i++} .fromBuffer() method - same fileType`,
        () => testFromBuffer(type, name)
      );
      testFunction(
        `${name}.${type} ${i++} .fromStream() method - same fileType`,
        () => testFileFromStream(type, name)
      );
      test(`${name}.${type} ${i++} .stream() - identical streams`, () =>
        testStream(type, name));
    }
  } else {
    const fixtureName = `fixture.${type}`;
    const testFunction = failingFixture.has(fixtureName) ? test.fails : test;

    testFunction(`${type} ${i++} .fromFile()`, () => testFromFile(type));
    testFunction(`${type} ${i++} .fromBuffer()`, () => testFromBuffer(type));
    testFunction(`${type} ${i++} .fromStream()`, () =>
      testFileFromStream(type)
    );
    test(`${type} ${i++} .stream() - identical streams`, () =>
      testStream(type));
  }

  if (Object.prototype.hasOwnProperty.call(falsePositives, type)) {
    for (const falsePositiveFile of falsePositives[type]) {
      test(`false positive - ${type} ${i++}`, () =>
        testFalsePositive(type, falsePositiveFile));
    }
  }
}

test(".stream() method - empty stream", async () => {
  const newStream = await fileTypeStream(readableNoopStream());
  t.strictEqual(newStream.fileType, undefined);
});

test(".stream() method - short stream", async () => {
  const bufferA = Buffer.from([0, 1, 0, 1]);
  class MyStream extends stream.Readable {
    _read() {
      this.push(bufferA);
      this.push(null);
    }
  }

  // Test filetype detection
  const shortStream = new MyStream();
  const newStream = await fileTypeStream(shortStream);
  t.strictEqual(newStream.fileType, undefined);

  // Test usability of returned stream
  const bufferB = await loadEntireFile(newStream);
  t.deepEqual(bufferA, bufferB);
});

test(".stream() method - no end-of-stream errors", async () => {
  const file = path.join(__dirname, "fixture", "fixture.ogm");
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const stream = await fileTypeStream(fs.createReadStream(file), {
    sampleSize: 30,
  });
  t.strictEqual(stream.fileType, undefined);
});

test(".stream() method - error event", async () => {
  const errorMessage = "Fixture";

  const readableStream = new stream.Readable({
    read() {
      process.nextTick(() => {
        this.emit("error", new Error(errorMessage));
      });
    },
  });

  await expect(fileTypeStream(readableStream)).rejects.toThrow(errorMessage);
});

test(".stream() method - sampleSize option", async () => {
  const file = path.join(__dirname, "fixture", "fixture.ogm");
  // eslint-disable-next-line @typescript-eslint/no-shadow
  let stream = await fileTypeStream(fs.createReadStream(file), {
    sampleSize: 30,
  });
  t.strictEqual(
    typeof stream.fileType,
    "undefined",
    "file-type cannot be determined with a sampleSize of 30"
  );

  stream = await fileTypeStream(fs.createReadStream(file), {
    sampleSize: 4100,
  });
  t.strictEqual(
    typeof stream.fileType,
    "object",
    "file-type can be determined with a sampleSize of 4100"
  );
  t.strictEqual(stream.fileType.mime, "video/ogg");
});

test("supportedExtensions.has", () => {
  t.isTrue(supportedExtensions.has("jpg"));
  t.isFalse(supportedExtensions.has("blah" as FileExtension));
});

test("supportedMimeTypes.has", () => {
  t.isTrue(supportedMimeTypes.has("video/mpeg"));
  t.isFalse(supportedMimeTypes.has("video/blah" as MimeType));
});

test("validate the input argument type", async () => {
  await expect(fileTypeFromBuffer(Buffer.from("x"))).resolves.not.toThrow();
  await expect(fileTypeFromBuffer(new Uint8Array())).resolves.not.toThrow();
  await expect(fileTypeFromBuffer(new ArrayBuffer(0))).resolves.not.toThrow();
});

class BufferedStream extends stream.Readable {
  constructor(buffer: Buffer) {
    super();
    this.push(buffer);
    this.push(null);
  }

  _read() {
    // empty
  }
}

test("odd file sizes", async () => {
  const oddFileSizes = [
    1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 255, 256, 257, 511, 512, 513,
  ];

  for (const size of oddFileSizes) {
    const buffer = Buffer.alloc(size);
    await expect(
      fileTypeFromBuffer(buffer),
      `fromBuffer: File size: ${size} bytes`
    ).resolves.not.toThrow();
  }

  for (const size of oddFileSizes) {
    const buffer = Buffer.alloc(size);
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const stream = new BufferedStream(buffer);
    await expect(
      fileTypeFromStream(stream),
      `fromStream: File size: ${size} bytes`
    ).resolves.not.toThrow();
  }
});
