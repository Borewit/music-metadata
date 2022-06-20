import { describe, test, expect } from "vitest";

import { Readable } from "node:stream";
import { get as getHttps } from "node:https";
import { get as getHttp } from "node:http";

import { parseStream } from "../lib";

import { IFileInfo } from "../lib/strtok3";

interface IHttpResponse {
  headers: Record<string, string>;
  stream: Readable;
}

function getUrlResponse(url: string): Promise<IHttpResponse> {
  return new Promise<IHttpResponse>((resolve, reject) => {
    const request = url.startsWith("https") ? getHttps(url) : getHttp(url);

    request.on("response", (response) =>
      resolve({
        headers: response.headers as Record<string, string>,
        stream: response,
      })
    );
    request.on("close", () => reject(new Error("close")));
    request.on("error", (err) => reject(err));
  });
}

// Skipped: https://github.com/Borewit/music-metadata/issues/160
describe("HTTP streaming", function () {
  const url = "http://builds.tokyo.s3.amazonaws.com/sample.m4a";

  test(
    `Should be able to parse M4A with content-length specified`,
    async () => {
      const response = await getUrlResponse(url);

      const fileInfo: IFileInfo = {
        mimeType: response.headers["content-type"],
        size: Number.parseInt(response.headers["content-length"], 10), // Always pass this in production
      };

      const tags = await parseStream(response.stream, fileInfo);
      response.stream.destroy();

      expect(tags.format.container).toBe("M4A/mp42/isom");
      expect(tags.format.codec).toBe("MPEG-4/AAC");
      expect(tags.format.lossless).toBe(false);

      expect(tags.common.title).toBe('Super Mario Galaxy "Into The Galaxy"');
      expect(tags.common.artist).toBe(
        'club nintendo CD "SUPER MARIO GALAXY"より'
      );
      expect(tags.common.album).toBe("SUPER MARIO GALAXY ORIGINAL SOUNDTRACK");
    },
    15 * 1000
  );

  test(
    `Should be able to parse M4A without content-length specified`,
    async () => {
      const response = await getUrlResponse(url);

      const fileInfo: IFileInfo = {
        mimeType: response.headers["content-type"],
      };

      const tags = await parseStream(response.stream, fileInfo);
      response.stream.destroy();

      expect(tags.format.container).toBe("M4A/mp42/isom");
      expect(tags.format.codec).toBe("MPEG-4/AAC");
      expect(tags.format.lossless).toBe(false);

      expect(tags.common.title).toBe('Super Mario Galaxy "Into The Galaxy"');
      expect(tags.common.artist).toBe(
        'club nintendo CD "SUPER MARIO GALAXY"より'
      );
      expect(tags.common.album).toBe("SUPER MARIO GALAXY ORIGINAL SOUNDTRACK");
    },
    15 * 1000
  );
});
