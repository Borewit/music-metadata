import {} from "mocha"
import {assert} from 'chai';
import * as mm from '../src';

const path = require('path');

const t = assert;

/* ToDo
describe("error handling ffmpeg", () => {

  it("error handling #01", () => {

    const filename = 'Simpsons01x01.m4a';
    const filePath = path.join(__dirname, 'samples', filename);

    return mm.parseFile(filePath).then((result) => {
      // ToDo: only relevant for content based type determination
    })
  });

  it("error handling #02", () => {

    const filename = 'Simpsons04x01.m4a';
    const filePath = path.join(__dirname, 'samples', filename);

    return mm.parseFile(filePath).then((result) => {
      // ToDo: only relevant for content based type determination
    })
  });

});
*/
