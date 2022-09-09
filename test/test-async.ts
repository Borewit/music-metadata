import { describe, test, expect } from "vitest";
import { join } from "node:path";

import type { IMetadataEvent } from "../lib/type";
import { samplePath } from "./util";
import { Parsers } from "./metadata-parsers";

describe.each(Parsers)("Asynchronous observer updates", (parser) => {
  const flacFilePath = join(samplePath, "flac.flac");

  test("decode a FLAC audio file", async () => {
    expect.assertions(1);

    const eventTags: IMetadataEvent["tag"][] = [];

    await parser.initParser(flacFilePath, "audio/flac", {
      observer: (event) => {
        switch (typeof event.tag.value) {
          case "number":
          case "string":
          case "boolean":
            break;
          default:
            event.tag.value = null;
        }

        eventTags.push(event.tag);
      },
    });

    expect(eventTags).toStrictEqual([
      {
        id: "container",
        type: "format",
        value: "FLAC",
      },
      {
        id: "codec",
        type: "format",
        value: "FLAC",
      },
      {
        id: "lossless",
        type: "format",
        value: true,
      },
      {
        id: "numberOfChannels",
        type: "format",
        value: 2,
      },
      {
        id: "bitsPerSample",
        type: "format",
        value: 16,
      },
      {
        id: "sampleRate",
        type: "format",
        value: 44_100,
      },
      {
        id: "duration",
        type: "format",
        value: 271.773_333_333_333_3,
      },
      {
        id: "album",
        type: "common",
        value: "Congratulations",
      },
      {
        id: "artists",
        type: "common",
        value: "MGMT",
      },
      {
        id: "artist",
        type: "common",
        value: "MGMT",
      },
      {
        id: "comment",
        type: "common",
        value: "EAC-Secure Mode=should ignore equal sign",
      },
      {
        id: "genre",
        type: "common",
        value: "Alt. Rock",
      },
      {
        id: "title",
        type: "common",
        value: "Brian Eno",
      },
      {
        id: "date",
        type: "common",
        value: "2010",
      },
      {
        id: "picture",
        type: "common",
        value: null,
      },
      {
        id: "bitrate",
        type: "format",
        value: 3529.912_181_720_061,
      },
    ]);
  });
});
