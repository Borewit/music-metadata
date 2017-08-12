import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should decode id3v2.2", () => {

  const filename = 'id3v2.2.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {
    t.strictEqual(result.common.title, 'You Are The One', 'title');
    t.strictEqual(result.common.artist, 'Shiny Toy Guns', 'artist');
    t.strictEqual(result.common.album, 'We Are Pilots', 'album');
    t.strictEqual(result.common.year, 2006, 'year');
    t.strictEqual(result.common.track.no, 1, 'track no');
    t.strictEqual(result.common.track.of, 11, 'track of');
    t.deepEqual(result.common.genre, ['Alternative'], 'genre');
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture format');
    t.strictEqual(result.common.picture[0].data.length, 99738, 'picture length');
    t.strictEqual(result.common.comment.length, 4, 'Number of Expected comment fields');

    const native = result.native['id3v2.2'];
    t.ok(native, 'Native id3v2.2 tags should be present');

    let i = 0;
    t.deepEqual(native[i++], {id: 'TP1', value: 'Shiny Toy Guns'}, "['id3v2.2'].TP1");
    t.deepEqual(native[i++], {id: 'TRK', value: '1/11'}, "['id3v2.2'].TRK");
    t.deepEqual(native[i++], {id: 'TYE', value: '2006'}, "['id3v2.2'].TYE");
    t.deepEqual(native[i++], {
      id: 'COM',
      value: {description: 'iTunPGAP', language: 'eng', text: '0'}
    }, "['id3v2.2'].COM");
    t.deepEqual(native[i++], {id: 'TEN', value: 'iTunes v7.0.2.16'}, "['id3v2.2'].TEN");
    t.deepEqual(native[i++], {
      id: 'COM',
      value: {
        description: 'iTunNORM',
        language: 'eng',
        text: ' 0000299C 0000291D 0000DBE0 0000D6BA 0003C378 0003C2C1 0000902A 00008F1B 00012FC6 00015FBC'
      }
    }, "['id3v2.2'].COM");
    t.deepEqual(native[i++], {
      id: 'COM',
      value: {
        description: 'iTunSMPB',
        language: 'eng',
        text: ' 00000000 00000210 00000AD4 0000000000B6499C 00000000 006327AD 00000000 00000000 00000000 00000000 00000000 00000000'
      }
    }, "['id3v2.2'].COM");
    t.deepEqual(native[i++], {
      id: 'COM',
      value: {description: 'iTunes_CDDB_IDs', language: 'eng', text: '11+3ABC77F16B8A2F0F1E1A1EBAB868A98F+8210091'}
    }, "['id3v2.2'].COM");
    {
      const picTag = native[i++];
      t.strictEqual(picTag.id, 'PIC', "['id3v2.2'].PIC");
    }

    t.deepEqual(native[i++], {id: 'TCO', value: '(20)'}, "['id3v2.2'].TCO");
    t.deepEqual(native[i++], {id: 'TAL', value: 'We Are Pilots'}, "['id3v2.2'].TAL");
    t.deepEqual(native[i++], {id: 'TT2', value: 'You Are The One'}, "['id3v2.2'].TT2");
    t.deepEqual(native[i++], {
      id: 'ULT',
      value: {
        description: '',
        language: 'eng',
        // tslint:disable:max-line-length
        text: 'Black rose & a radio fire\nits so contagious\nsuch something changing my mind\nim gonna take whats evil\n\nYour cover melting inside\nwith wide eyes you tremble\nkissing over & over again\nyour god knows his faithful\n\nI try - to digest my pride\nbut passions grip i fear\nwhen i climb - into shallow vats of wine\ni think i almost hear - but its not clear\n\nYou are the one\nyou\'ll never be alone again\nyou\'re more then in my head - your more\n\nSpin faster shouting out loud\nyou cant steal whats paid for\nsuch something hurting again\nmurder son shes painful\n\nYou so believe your own lies\non my skin your fingers\nrunaway until the last time\nwere gonna lose forever\n\nwhen you try - don\'t try to say you wont\ntry to crawl into my head\nwhen you cry - cause it\'s all built up inside\nyour tears already said - already said\n\nYou\'ll never be alone again'
      }
    }, "['id3v2.2'].ULT");
  });

});
