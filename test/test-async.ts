import {assert} from "chai";
import * as mm from "../src";
import * as path from "path";

describe("Asynchronous observer updates", () => {

  const samplePath = path.join(__dirname, "samples");

  const flacFilePath = path.join(samplePath, "flac.flac");

  it("decode a FLAC audio file", () => {

    const eventTags = [];

    return mm.parseFile(flacFilePath, {native: true, observer: (event => {
        eventTags.push(event.tag);
        if (typeof event.tag.value !== 'string') {
          event.tag.value = null;
        }
      })})
      .then(metadata => {
        assert.deepEqual(eventTags, [
          {
            id: "album",
            type: "common",
            value: "Congratulations"
          },
          {
            id: "artists",
            type: "common",
            value: "MGMT"
          },
          {
            id: "artist",
            type: "common",
            value: "MGMT"
          },
          {
            id: "comment",
            type: "common",
            value: "EAC-Secure Mode=should ignore equal sign"
          },
          {
            id: "genre",
            type: "common",
            value: "Alt. Rock"
          },
          {
            id: "title",
            type: "common",
            value: "Brian Eno"
          },
          {
            id: "date",
            type: "common",
            value: "2010"
          },
          {
            id: "picture",
            type: "common",
            value: null
          }
        ]);
    });

  });

});
