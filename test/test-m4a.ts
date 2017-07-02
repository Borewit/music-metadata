import {} from "mocha";
import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should decode iTunes-style M4A tags", () => {

  const filename = 'id4.m4a';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true, native: true}).then((result) => {

    t.strictEqual(result.format.duration, 2.2058956916099772, 'format.duration');

    t.strictEqual(result.common.title, 'Voodoo People (Pendulum Remix)', 'title');
    t.strictEqual(result.common.artist, 'The Prodigy', 'artist');
    t.strictEqual(result.common.albumartist, 'Pendulum', 'albumartist');
    t.strictEqual(result.common.album, 'Voodoo People', 'album');
    t.strictEqual(result.common.year, 2005, 'year');
    t.strictEqual(result.common.track.no, 1, 'track no');
    t.strictEqual(result.common.track.of, 12, 'track of');
    t.strictEqual(result.common.disk.no, 1, 'disk no');
    t.strictEqual(result.common.disk.of, 1, 'disk of');
    t.strictEqual(result.common.genre[0], 'Electronic', 'genre');
    t.strictEqual(result.common.picture[0].format, 'jpg', 'picture 0 format');
    t.strictEqual(result.common.picture[0].data.length, 196450, 'picture 0 length');
    t.strictEqual(result.common.picture[1].format, 'jpg', 'picture 1 format');
    t.strictEqual(result.common.picture[1].data.length, 196450, 'picture 1 length');

    const native = result.native.m4a;
    t.ok(native, 'Native m4a tags should be present');

    let i = 0;
    t.deepEqual(native[i++], {id: 'trkn', value: '1/12'}, 'm4a.trkn');
    t.deepEqual(native[i++], {id: 'disk', value: '1/1'}, 'm4a.disk');
    t.deepEqual(native[i++], {id: 'tmpo', value: 0}, 'm4a.tmpo');
    t.deepEqual(native[i++], {id: 'gnre', value: 'Electronic'}, 'm4a.gnre');
    t.deepEqual(native[i++], {id: 'stik', value: 1}, 'm4a.stik');
    t.deepEqual(native[i++], {id: '©alb', value: 'Voodoo People'}, 'm4a.©alb');
    t.deepEqual(native[i++], {id: 'aART', value: 'Pendulum'}, 'm4a.aART');
    t.deepEqual(native[i++], {id: '©ART', value: 'The Prodigy'}, 'm4a.©ART');
    t.deepEqual(native[i++], {id: '©cmt', value: '(Pendulum Remix)'}, 'm4a.©cmt');
    t.deepEqual(native[i++], {id: '©wrt', value: 'Liam Howlett'}, 'm4a.©wrt');
    t.deepEqual(native[i++], {
      id: '----:com.apple.iTunes:iTunNORM',
      value: ' 0000120A 00001299 00007365 0000712F 0002D88B 0002D88B 00007F2B 00007F2C 0003C770 0001F5C7'
    }, 'm4a.----:com.apple.iTunes:iTunNORM');
    t.deepEqual(native[i++], {id: '©nam', value: 'Voodoo People (Pendulum Remix)'}, 'm4a.©nam');
    t.deepEqual(native[i++], {id: '©too', value: 'Lavf52.36.0'}, 'm4a.©too');
    t.deepEqual(native[i++], {id: '©day', value: '2005'}, 'm4a.@day');

    const covr = native[i];
    t.strictEqual(covr.id, 'covr', 'm4a.covr');
    t.strictEqual(covr.value.format, 'image/jpeg', 'm4a.covr.format');
    t.strictEqual(covr.value.data.length, 196450, 'm4a.covr.data.length');
  });
});
