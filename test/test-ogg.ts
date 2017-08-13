import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import * as fs from 'fs-extra';

describe("Parsing Ogg Vorbis", function() {

  this.timeout(15000); // It takes a log time to parse, due to sync errors and assumption it is VBR (which is caused by the funny 224 kbps frame)

  const filename = 'oggy.ogg';
  const filePath = path.join(__dirname, 'samples', filename);

  function checkFormat(format) {
    assert.strictEqual(format.headerType, 'vorbis', 'format.headerType');
    assert.strictEqual(format.duration, 97391.54861678004, 'format.duration = ~97391 sec'); // ToDO: check this
    assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
    assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 (stereo)');
    assert.strictEqual(format.bitrate, 64000, 'bitrate = 64 kbit/sec');
  }

  function checkCommon(common) {
    assert.strictEqual(common.title, 'In Bloom', 'common.title');
    assert.strictEqual(common.artist, 'Nirvana', 'common.artist');
    assert.strictEqual(common.albumartist, 'Nirvana', 'common.albumartist');
    assert.strictEqual(common.album, 'Nevermind', 'common.album');
    assert.strictEqual(common.year, 1991, 'common.year');
    assert.deepEqual(common.track, {no: 1, of: 12}, 'common.track');
    assert.deepEqual(common.disk, {no: 1, of: null}, 'common.disk');
    assert.deepEqual(common.genre, ['Grunge', 'Alternative'], 'genre');
    assert.strictEqual(common.picture[0].format, 'jpg', 'picture format');
    assert.strictEqual(common.picture[0].data.length, 30966, 'picture length');
  }

  function checkVorbisTags(vorbis) {

    assert.deepEqual(vorbis.TRACKNUMBER, ['1'], 'vorbis.TRACKNUMBER');
    assert.deepEqual(vorbis.TRACKTOTAL, ['12'], 'vorbis.TRACKTOTAL');
    assert.deepEqual(vorbis.ALBUM, ['Nevermind'], 'vorbis.ALBUM');
    assert.deepEqual(vorbis.COMMENT, ["Nirvana's Greatest Album", 'And their greatest song'], 'vorbis.COMMENT');
    assert.deepEqual(vorbis.GENRE, ['Grunge', 'Alternative'], 'vorbis.GENRE');
    assert.deepEqual(vorbis.TITLE, ['In Bloom'], 'vorbis.TITLE');

    const cover = vorbis.METADATA_BLOCK_PICTURE[0];

    assert.strictEqual(cover.format, 'image/jpeg', 'vorbis.METADATA_BLOCK_PICTURE format');
    assert.strictEqual(cover.type, 'Cover (back)', 'vorbis.METADATA_BLOCK_PICTURE headerType');
    assert.strictEqual(cover.description, 'little willy', 'raw METADATA_BLOCK_PICTURE description');
    // test exact contents too
    assert.strictEqual(cover.data.length, 30966, 'vorbis.METADATA_BLOCK_PICTURE length');
    assert.strictEqual(cover.data[0], 255, 'vorbis.METADATA_BLOCK_PICTURE data 0');
    assert.strictEqual(cover.data[1], 216, 'vorbis.METADATA_BLOCK_PICTURE data 1');
    assert.strictEqual(cover.data[cover.data.length - 1], 217, 'vorbis.METADATA_BLOCK_PICTURE data -1');
    assert.strictEqual(cover.data[cover.data.length - 2], 255, 'vorbis.METADATA_BLOCK_PICTURE data -2');
  }

  it("should decode an Ogg Vorbis audio file (.ogg)", () => {

    return mm.parseFile(filePath, {native: true}).then((metadata) => {
      checkFormat(metadata.format);
      checkCommon(metadata.common);
      checkVorbisTags(mm.orderTags(metadata.native.vorbis));
    });

  });

  it("should decode from an Ogg Vorbis audio stream (audio/ogg)", function() {

    this.skip(); // ToDo

    const stream = fs.createReadStream(filePath);

    return mm.parseStream(stream, 'audio/ogg', {native: true}).then((metadata) => {
      checkFormat(metadata.format);
      checkCommon(metadata.common);
      checkVorbisTags(mm.orderTags(metadata.native.vorbis));
    }).then(() => {
      stream.close();
    });

  });

});
