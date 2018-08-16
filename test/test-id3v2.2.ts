import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';
import {ID3v2Parser} from "../src/id3v2/ID3v2Parser";

const t = assert;

describe("ID3v2Parser", () => {

  it("should be able to remove unsynchronisation bytes from buffer", () => {
    const expected = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);
    const sample = Buffer.from([0xFF, 0xD8, 0xFF, 0x00, 0xE0, 0x00]);
    const output = ID3v2Parser.removeUnsyncBytes(sample);
    t.deepEqual(output, expected, 'bytes');
  });

  it("should normalize ID3v2.2 comments correctly", () => {

    const filePath = path.join(__dirname, 'samples', 'issue_66.mp3');

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {

      const id3v22 = mm.orderTags(metadata.native['ID3v2.2']);

      t.deepEqual(id3v22.TP1, ['RushJet1'], "['ID3v2.2'].TP1");
      t.deepEqual(id3v22.TRK, ['2/15'], "['ID3v2.2'].TRK");
      t.deepEqual(id3v22.TYE, ['2011'], "['ID3v2.2'].TYE");
      t.deepEqual(id3v22['COM:iTunPGAP'], ['0'], "['ID3v2.2']['COM:iTunPGAP']");
      t.deepEqual(id3v22.TEN, ['iTunes 10.2.2.14'], "['ID3v2.2'].TEN");
      t.deepEqual(id3v22['COM:iTunNORM'], [" 00000308 00000000 00001627 00000000 00006FD6 00000000 00007F21 00000000 0000BE68 00000000"], "COM:iTunNORM");
      t.deepEqual(id3v22['COM:iTunSMPB'], [" 00000000 00000210 00000811 000000000043E1DF 00000000 001EBD63 00000000 00000000 00000000 00000000 00000000 00000000"], "id3v22.TYE['COM:iTunSMPB']");

      t.isDefined(id3v22.PIC, "['ID3v2.2'].PIC");
      t.deepEqual(id3v22.TCO, ["Chiptune"], "['ID3v2.2'].TCO");
      t.deepEqual(id3v22.TAL, ['Forgotten Music'], "['ID3v2.2'].TAL");
      t.deepEqual(id3v22.TT2, ['Ancient Ruin Adventure'], "['ID3v2.2'].TT2");

      t.deepEqual(id3v22.COM, ["UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music"], "['ID3v2.2']['COM']");

      t.deepEqual(metadata.common.comment, ["UBI025, 23.05.2011, http://ubiktune.org/releases/ubi025-rushjet1-forgotten-music"], "common.comment");
    });
  });

  it("should decode file 'id3v2.2.mp3'", () => {

    const filename = 'id3v2.2.mp3';
    const filePath = path.join(__dirname, 'samples', filename);

    return mm.parseFile(filePath, {duration: true, native: true}).then(metadata => {
      t.strictEqual(metadata.common.title, 'You Are The One', 'title');
      t.strictEqual(metadata.common.artist, 'Shiny Toy Guns', 'artist');
      t.strictEqual(metadata.common.album, 'We Are Pilots', 'album');
      t.strictEqual(metadata.common.year, 2006, 'year');
      t.strictEqual(metadata.common.track.no, 1, 'track no');
      t.strictEqual(metadata.common.track.of, 11, 'track of');
      t.deepEqual(metadata.common.genre, ['Alternative'], 'genre');
      t.strictEqual(metadata.common.picture[0].format, 'image/jpeg', 'picture format');
      t.strictEqual(metadata.common.picture[0].data.length, 99738, 'picture length');
      t.strictEqual(metadata.common.gapless, false, 'common.gapless');
      t.isUndefined(metadata.common.comment, 'common.comment');

      t.isDefined(metadata.native['ID3v2.2'], 'Native id3v2.2 tags should be present');
      const id3v22 = mm.orderTags(metadata.native['ID3v2.2']);

      t.deepEqual(id3v22.TP1, ['Shiny Toy Guns'], "['ID3v2.2'].TP1");
      t.deepEqual(id3v22.TRK, ['1/11'], "['ID3v2.2'].TRK");
      t.deepEqual(id3v22.TYE, ['2006'], "['ID3v2.2'].TYE");
      t.deepEqual(id3v22['COM:iTunPGAP'], ['0'], "['ID3v2.2']['COM:iTunPGAP']");
      t.deepEqual(id3v22.TEN, ['iTunes v7.0.2.16'], "['ID3v2.2'].TEN");
      t.deepEqual(id3v22['COM:iTunNORM'], [' 0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC'], "COM:iTunNORM");

      t.deepEqual(id3v22['COM:iTunSMPB'], [' 00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000'], "id3v22.TYE['COM:iTunSMPB']");

      t.deepEqual(id3v22['COM:iTunes_CDDB_IDs'], ['11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091'], "COM:iTunes_CDDB_IDs");

      t.isDefined(id3v22.PIC, "['ID3v2.2'].PIC");
      t.deepEqual(id3v22.TCO, ['(20)'], "['ID3v2.2'].TCO");
      t.deepEqual(id3v22.TAL, ['We Are Pilots'], "['ID3v2.2'].TAL");
      t.deepEqual(id3v22.TT2, ['You Are The One'], "['ID3v2.2'].TT2");

      t.deepEqual(id3v22.ULT, [{
        description: '',
        language: 'eng',
        // tslint:disable:max-line-length
        text: 'Black rose & a radio fire\nits so contagious\nsuch something changing my mind\nim gonna take whats evil\n\nYour cover melting inside\nwith wide eyes you tremble\nkissing over & over again\nyour god knows his faithful\n\nI try - to digest my pride\nbut passions grip i fear\nwhen i climb - into shallow vats of wine\ni think i almost hear - but its not clear\n\nYou are the one\nyou\'ll never be alone again\nyou\'re more then in my head - your more\n\nSpin faster shouting out loud\nyou cant steal whats paid for\nsuch something hurting again\nmurder son shes painful\n\nYou so believe your own lies\non my skin your fingers\nrunaway until the last time\nwere gonna lose forever\n\nwhen you try - don\'t try to say you wont\ntry to crawl into my head\nwhen you cry - cause it\'s all built up inside\nyour tears already said - already said\n\nYou\'ll never be alone again'
      }], "['ID3v2.2'].ULT");

    });

  });

});
