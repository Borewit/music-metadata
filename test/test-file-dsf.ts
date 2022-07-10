import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { parseFile } from "../lib";
import { samplePath } from "./util";

describe("Parse Sony DSF (DSD Stream File)", () => {
  test("parse: 2L-110_stereo-5644k-1b_04.dsf", async () => {
    const dsfFilePath = join(samplePath, "dsf", "2L-110_stereo-5644k-1b_04_0.1-sec.dsf");

    const metadata = await parseFile(dsfFilePath, { duration: false });

    // format chunk information
    expect(metadata.format.container).toBe("DSF");
    expect(metadata.format.lossless).toBe(true);
    expect(metadata.format.numberOfChannels).toBe(2);
    expect(metadata.format.bitsPerSample).toBe(1);
    expect(metadata.format.sampleRate).toBe(5_644_800);
    expect(metadata.format.numberOfSamples).toBe(564_480n);
    expect(metadata.format.duration).toBe(0.1);
    expect(metadata.format.bitrate).toBe(11_289_600);
    expect(metadata.format.tagTypes).toStrictEqual(["ID3v2.3"]);

    // ID3v2 chunk information
    expect(metadata.common.title).toBe("Kyrie");
    expect(metadata.common.artist).toBe("CANTUS (Tove Ramlo-Ystad) & Frode Fjellheim");
    expect(metadata.common.track).toStrictEqual({ no: 4, of: 12 });
  });
});
