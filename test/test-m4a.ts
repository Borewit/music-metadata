import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import * as fs from 'fs-extra';

const t = assert;

describe("Read MPEG-4 audio files with iTunes metadata", () => {

  describe("Parse MPEG-4 audio files", () => {

    const filePath = path.join(__dirname, 'samples', 'id4.m4a');

    function checkFormat(format) {
      assert.deepEqual(format.tagTypes, ['iTunes MP4'], 'format.tagTypes');
      t.strictEqual(format.duration, 2.2058956916099772, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    }

    function checkCommon(common) {
      t.strictEqual(common.title, 'Voodoo People (Pendulum Remix)', 'title');
      t.strictEqual(common.artist, 'The Prodigy', 'artist');
      t.strictEqual(common.albumartist, 'Pendulum', 'albumartist');
      t.strictEqual(common.album, 'Voodoo People', 'album');
      t.strictEqual(common.year, 2005, 'year');
      t.strictEqual(common.track.no, 1, 'track no');
      t.strictEqual(common.track.of, 12, 'track of');
      t.strictEqual(common.disk.no, 1, 'disk no');
      t.strictEqual(common.disk.of, 1, 'disk of');
      t.strictEqual(common.genre[0], 'Electronic', 'genre');
      t.strictEqual(common.picture[0].format, 'jpg', 'picture 0 format');
      t.strictEqual(common.picture[0].data.length, 196450, 'picture 0 length');
      t.strictEqual(common.picture[1].format, 'jpg', 'picture 1 format');
      t.strictEqual(common.picture[1].data.length, 196450, 'picture 1 length');
    }

    function checkNativeTags(native) {

      t.ok(native, 'Native m4a tags should be present');

      t.deepEqual(native.trkn, ['1/12'], 'm4a.trkn');
      t.deepEqual(native.disk, ['1/1'], 'm4a.disk');
      t.deepEqual(native.tmpo, [0], 'm4a.tmpo');
      t.deepEqual(native.gnre, ['Electronic'], 'm4a.gnre');
      t.deepEqual(native.stik, [1], 'm4a.stik');
      t.deepEqual(native['©alb'], ['Voodoo People'], 'm4a.©alb');
      t.deepEqual(native.aART, ['Pendulum'], 'm4a.aART');
      t.deepEqual(native['©ART'], ['The Prodigy'], 'm4a.©ART');
      t.deepEqual(native['©cmt'], ['(Pendulum Remix)'], 'm4a.©cmt');
      t.deepEqual(native['©wrt'], ['Liam Howlett'], 'm4a.©wrt');
      t.deepEqual(native['----:com.apple.iTunes:iTunNORM'], [' 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7'], 'm4a.----:com.apple.iTunes:iTunNORM');
      t.deepEqual(native['©nam'], ['Voodoo People (Pendulum Remix)'], 'm4a.©nam');
      t.deepEqual(native['©too'], ['Lavf52.36.0'], 'm4a.©too');
      t.deepEqual(native['©day'], ['2005'], 'm4a.@day');

      // Check album art
      t.isDefined(native.covr);
      t.strictEqual(native.covr[0].format, 'image/jpeg', 'm4a.covr.format');
      t.strictEqual(native.covr[0].data.length, 196450, 'm4a.covr.data.length');
    }

    it("should decode from a file", () => {

      return mm.parseFile(filePath, {native: true}).then((metadata) => {

        const native = metadata.native['iTunes MP4'];
        t.ok(native, 'Native m4a tags should be present');

        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNativeTags(mm.orderTags(native));
      });

    });

    it("should decode from a stream", () => {

      const stream = fs.createReadStream(filePath);

      return mm.parseStream(stream, 'audio/mp4', {native: true}).then((metadata) => {
        checkFormat(metadata.format);
        checkCommon(metadata.common);
        checkNativeTags(mm.orderTags(metadata.native['iTunes MP4']));
      }).then(() => {
        stream.close();
      });

    });

  });

  it("should decode 8-byte unsigned integer", function() {

    this.skip(); // ToDo: shrink sample file

    const filename = path.join(__dirname, 'samples', '01 Trumpsta (Djuro Remix).m4a');

    return mm.parseFile(filename, {native: true}).then((metadata) => {

      t.isDefined(metadata.native['iTunes MP4'], 'Native m4a tags should be present');
      const iTunes = mm.orderTags(metadata.native['iTunes MP4']);
      t.deepEqual(iTunes.plID, [637567119], 'iTunes.plID');
    });

  });

});
