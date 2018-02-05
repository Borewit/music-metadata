import {} from "mocha";
import {assert} from "chai";
import * as mime from "mime";
import * as mm from "../src";
import {SourceStream} from "./util";
import {Promise} from 'es6-promise';

const t = assert;

describe("MIME & extension mapping", () => {

  const buf = new Buffer(30).fill(0);

  const audioExtension = [".aac", ".mp3", ".ogg", ".wav", ".flac", ".m4a"]; // ToDo: ass ".ac3"

  function handleError(extension: string, err: Error) {
    switch (extension) {
      case ".aac":
      case ".m4a":
      case ".flac":
      case ".wav":
      case ".ogg":
        t.strictEqual(err.message, "FourCC contains invalid characters",  "Extension=" + extension);
        break;

      default:
        throw new Error("caught error parsing " + extension + ": "  + err.message);
    }
  }

  it("should map MIME-types", () => {

    const prom = [];

    audioExtension.forEach(extension => {

      const streamReader = new SourceStream(buf);
      // Convert extension to MIME-Type
      const mimeType = mime.getType(extension);
      t.isNotNull(mimeType, "extension: " + extension);

      const res = mm.parseStream(streamReader, mimeType)
        .catch(err => {
          handleError(extension, err);
      });

      prom.push(res);
    });

    return Promise.all(prom);

  });

  it("should map on extension as well", () => {

    const prom = [];

    audioExtension.forEach(extension => {

      const streamReader = new SourceStream(buf);
      const res = mm.parseStream(streamReader, extension).catch(err => {
        handleError(extension, err);
      });

      prom.push(res);
    });

    return Promise.all(prom);

  });

});
