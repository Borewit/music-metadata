import { describe, test, expect } from "vitest";
import { createReadStream, readFileSync } from "node:fs";
import { join } from "node:path";

import { parseStream, parseFile } from "../lib";
import { SourceStream, samplePath } from "./util";

// ToDo: ass ".ac3"
const audioExtension = [
  ".aac",
  ".mp3",
  ".ogg",
  ".wav",
  ".flac",
  ".m4a",
] as const;

const audioMime = {
  ".aac": "audio/x-aac",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".flac": "audio/x-flac",
  ".m4a": "audio/mp4",
} as const;

function handleError(extension: typeof audioExtension[number], err: Error) {
  switch (extension) {
    case ".aac":
    case ".m4a":
    case ".flac":
    case ".wav":
    case ".ogg":
      expect(
        err.message.startsWith("FourCC"),
        `Only FourCC error allowed, got: ${err.message}`
      ).toBe(true);
      break;

    default:
      throw new Error(`caught error parsing ${extension}: ${err.message}`);
  }
}

const buf = Buffer.alloc(30).fill(0);

test("should reject an unknown file", async () => {
  const filePath = join(__dirname, "..", "package.json");
  const rejected = expect(() => parseFile(filePath)).rejects;
  await rejected.toBeInstanceOf(Error);
  await rejected.toHaveProperty("message", "Failed to determine audio format");
});

test.each(audioExtension)("should map MIME-types %s", async (extension) => {
  const streamReader = new SourceStream(buf);
  // Convert extension to MIME-Type
  const mimeType = audioMime[extension];
  expect(mimeType, "extension: " + extension).not.toBeNull();

  try {
    await parseStream(streamReader, mimeType);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    handleError(extension, error);
  }
});

test.each(audioExtension)(
  "should map on extension as well %s",
  async (extension) => {
    const streamReader = new SourceStream(buf);
    try {
      await parseStream(streamReader, { path: extension });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      handleError(extension, error);
    }
  }
);

test("should be able to handle MIME-type parameter(s)", async () => {
  // Wrap stream around buffer, to prevent the `stream.path` is provided
  const filePath = join(
    samplePath,
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav"
  );
  const buffer = readFileSync(filePath);
  const stream = new SourceStream(buffer);
  const metadata = await parseStream(stream);
  expect(metadata.format.container).toBe("WAVE");
});

describe("Resolve MIME based on content", () => {
  test("should fall back on content detection in case the extension is useless", async () => {
    const filePath = join(
      samplePath,
      "mp3",
      "1a643e9e0743dee8732554d0e870055a"
    );
    const metadata = await parseFile(filePath);
    expect(metadata.format.container).toBe("MPEG");
    expect(metadata.format.codec).toBe("MPEG 1 Layer 3");
  });

  test("should throw error on unrecognized MIME-type", async () => {
    const streamReader = new SourceStream(buf);
    const rejected = expect(() =>
      parseStream(streamReader, { mimeType: "audio/not-existing" })
    ).rejects;
    await rejected.toBeInstanceOf(Error);
    await rejected.toHaveProperty(
      "message",
      "Failed to determine audio format"
    );
  });

  test("should throw error on recognized MIME-type which is not supported", async () => {
    // Wrap stream around buffer, to prevent the `stream.path` is provided
    const buffer = readFileSync(join(samplePath, "flac.flac.jpg"));
    const stream = new SourceStream(buffer);

    const rejected = expect(() =>
      parseStream(stream, { mimeType: "audio/not-existing" })
    ).rejects;
    await rejected.toBeInstanceOf(Error);
    await rejected.toHaveProperty(
      "message",
      "Guessed MIME-type not supported: image/jpeg"
    );
  });

  const fileTypes: [string, string, string][] = [
    ["MP2", "1971 - 003 - Sweet - Co-Co - CannaPower.mp2", "MPEG"],
    ["MP3", "04-Strawberry.mp3", "MPEG"],
    // file-type returns 'video/x-ms-wmv'
    ["WMA", join("asf", "asf.wma"), "ASF/audio"],
    [
      "MPEG-4 / m4a",
      "MusicBrainz - Beth Hart - Sinner's Prayer.m4a",
      "M4A/mp42/isom",
    ],
    ["MPEG-4 / m4b", join("mp4", "issue-127.m4b"), "M4A/3gp5/isom"],
    [
      "MPEG-4 / mp4",
      join("mp4", "Mr. Pickles S02E07 My Dear Boy.mp4"),
      "mp42/isom",
    ],
    ["FLAC", "flac.flac", "FLAC"],
    ["OGG", "issue_62.ogg", "Ogg"],
    ["WAV", "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav", "WAVE"],
    ["APE", "MusicBrainz - Beth Hart - Sinner's Prayer.ape", "Monkey's Audio"],
    ["WMA", join("asf", "issue_57.wma"), "ASF/audio"],
    [
      "WavPack",
      join("wavpack", "MusicBrainz - Beth Hart - Sinner's Prayer.wv"),
      "WavPack",
    ],
    ["SV7", join("mpc", "apev2.sv7.mpc"), "Musepack, SV7"],
    [
      "SV8",
      join("mpc", "bach-goldberg-variatians-05.sv8.mpc"),
      "Musepack, SV8",
    ],
    ["DSF", join("dsf", "2L-110_stereo-5644k-1b_04_0.1-sec.dsf"), "DSF"],
    [
      "MKA",
      join("matroska", "02 - Poxfil - Solid Ground (5 sec).mka"),
      "EBML/matroska",
    ],
    [
      "WebM",
      join("matroska", "02 - Poxfil - Solid Ground (5 sec).opus.webm"),
      "EBML/webm",
    ],
  ];

  test.each(fileTypes)("should recognize %s", async (_, sample, container) => {
    const stream = createReadStream(join(samplePath, sample));
    const metadata = await parseStream(stream);
    stream.close();
    expect(metadata.format.container).toBe(container);
  });
});
