import { assert } from "chai";
import * as mm from "../lib";
import * as fs from "fs";
import * as path from "path";
import { samplePath } from "./util";

const t = assert;

it("should handle concurrent parsing of pictures", () => {
  const files = [
    path.join(samplePath, "flac.flac"),
    path.join(__dirname, "samples", "flac-bug.flac"),
  ];

  return Promise.all<any>(
    files.map((file) => {
      return mm.parseFile(file).then((result) => {
        const data = fs.readFileSync(file + ".jpg");
        t.deepEqual(result.common.picture[0].data, data, "check picture");
      });
    })
  );
});
