import { describe, test, expect } from "vitest";
import { join } from "node:path";

import { Parsers } from "./metadata-parsers";
import { samplePath } from "./util";

const mpcSamplePath = join(samplePath, "mpc");

describe.each(Parsers)("parse %s", (_, parser) => {
  test("Parse Musepack, SV7 with APEv2 header", async () => {
    const filePath = join(mpcSamplePath, "apev2.sv7.mpc");

    const metadata = await parser(filePath, "audio/musepac");
    // Check format
    const format = metadata.format;
    expect(format.container).toBe("Musepack, SV7");
    expect(format.sampleRate).toBe(44_100);
    expect(format.numberOfSamples).toBe(11_940);
    expect(format.bitrate).toBeCloseTo(269_649, -1);
    expect(format.codec).toBe("1.15");

    // Check generic metadata
    const common = metadata.common;
    expect(common.title).toBe("God Inside");
    expect(common.artist).toBe("Faze Action");
    expect(common.album).toBe("Broad Souls");
    expect(common.date).toBe("2004-05-03");
    expect(common.barcode).toBe("802085273528");
    expect(common.catalognumber).toStrictEqual(["LUNECD35"]);
    expect(common.media).toBe("CD");
    expect(common.releasecountry).toBe("GB");
    expect(common.track).toStrictEqual({ no: 9, of: 10 });
  });

  test("Handle APEv1 TAG header (no header, only footer)", async () => {
    /**
     * In this sample the APEv2 header is not present, only the APEv2 footer
     */
    const filePath = join(mpcSamplePath, "apev2-no-header.sv7.mpc");

    const metadata = await parser(filePath, "audio/musepac");
    // Check format
    expect(metadata.format.container).toBe("Musepack, SV7");
    expect(metadata.format.sampleRate).toBe(44_100);
    expect(metadata.format.numberOfSamples).toBe(11_940);
    expect(metadata.format.bitrate).toBeCloseTo(269_649, -1);
    expect(metadata.format.codec).toBe("1.15");

    // Check generic metadata
    expect(metadata.common.title).toBe("God Inside");
    expect(metadata.common.artist).toBe("Faze Action");
    expect(metadata.common.album).toBe("Broad Souls");
    expect(metadata.common.date).toBe("2004");
    expect(metadata.common.track).toStrictEqual({ no: 9, of: null });
  });

  test("Parse Musepack, SV8 with APEv2 header", async () => {
    const filePath = join(mpcSamplePath, "bach-goldberg-variatians-05.sv8.mpc");

    const metadata = await parser(filePath, "audio/musepac");
    // Check format
    expect(metadata.format.container).toBe("Musepack, SV8");
    expect(metadata.format.sampleRate).toBe(48_000);
    expect(metadata.format.numberOfSamples).toBe(24_000);
    expect(metadata.format.numberOfChannels).toBe(2);
    expect(metadata.format.duration).toBeCloseTo(0.5, 3);
    expect(metadata.format.bitrate).toBeCloseTo(32_368, -1);

    // Check generic metadata
    expect(metadata.common.title).toBe("Goldberg Variations, BWV 988: Variatio 4 a 1 Clav.");
    expect(metadata.common.artist).toBe("Johann Sebastian Bach");
    expect(metadata.common.artists).toStrictEqual(["Johann Sebastian Bach"]);
    expect(metadata.common.isrc).toStrictEqual(["QMNYZ1200005"]);
    expect(metadata.common.license).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(metadata.common.album).toBe("Open Goldberg Variations");
    expect(metadata.common.date).toBe("2012-05-28");
    expect(metadata.common.track).toStrictEqual({ no: 5, of: 32 });
  });
});
