import { assert } from 'chai';
import * as mm from '../lib';
import * as path from 'path';

it('should MusicBrainz tags with id3v2.4', async () => {

  const filename = 'id3v2.4-musicbrainz.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  const metadata = await mm.parseFile(filePath, {duration: true});
  const { common, format } = metadata;

  assert.deepEqual(format.duration, 0.7836734693877551, 'format.duration');

  assert.deepEqual(common.title, 'Home', 'common.title');
  assert.deepEqual(common.artist, 'Explosions in the Sky', 'common.artist');
  assert.deepEqual(common.albumartist, 'Explosions in the Sky', 'common.albumartist');
  assert.deepEqual(common.album, 'Friday Night Lights: Original Motion Picture Soundtrack', 'common.album');
  assert.deepEqual(common.year, 2004, 'common.year');
  assert.deepEqual(common.date, '2004-10-12', 'common.date');
  assert.deepEqual(common.track, {no: 5, of: 14}, 'common.track');
  assert.deepEqual(common.disk, {no: 1, of: 1}, 'common.disk');
  assert.deepEqual(common.genre, ['Soundtrack', 'OST'], 'common.genre');
  assert.deepEqual(common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
  assert.deepEqual(common.picture[0].data.length, 75818, 'common.picture 0 length');

  assert.deepEqual(common.barcode, '602498644102', 'common.barcode');
  assert.deepEqual(common.isrc, ['USUG10400421'], 'common.isrc');
  assert.deepEqual(common.label, ['Hip-O Records'], 'common.label');
  assert.deepEqual(common.catalognumber, ['B0003663-02'], 'common.catalognumber');
  assert.deepEqual(common.releasecountry, 'US', 'common.releasecountry');
  assert.deepEqual(common.media, 'CD', 'common.media');
  assert.deepEqual(common.musicbrainz_artistid, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Artist Id');
  assert.deepEqual(common.musicbrainz_recordingid, '84851150-a196-48fa-ada5-1a012b1cd9ed', 'MusicBrainz Recording Id');
  assert.deepEqual(common.musicbrainz_albumartistid, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Release Artist Id');
  assert.deepEqual(common.musicbrainz_releasegroupid, 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7', 'MusicBrainz Release Group Id');
  assert.deepEqual(common.musicbrainz_albumid, '2644f258-0619-4beb-a150-0c0069ca6699', 'MusicBrainz Release Id');
  assert.deepEqual(common.musicbrainz_trackid, 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13', 'MusicBrainz Track Id');

  const native = metadata.native['ID3v2.4'];
  assert.ok(native, 'Native id3v2.4 tags should be present');

  let i = 0;
  assert.deepEqual(native[i++], {id: 'TIT2', value: 'Home'}, '[\'ID3v2.4\'].TIT2');
  assert.deepEqual(native[i++], {id: 'TPE1', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TPE1');
  assert.deepEqual(native[i++], {id: 'TRCK', value: '5/14'}, '[\'ID3v2.4\'].TRCK');
  assert.deepEqual(native[i++], {
    id: 'TALB',
    value: 'Friday Night Lights: Original Motion Picture Soundtrack'
  }, '[\'ID3v2.4\'].TALB');
  assert.deepEqual(native[i++], {id: 'TPOS', value: '1/1'}, '[\'ID3v2.4\'].TPOS');
  assert.deepEqual(native[i++], {id: 'TDRC', value: '2004-10-12'}, '[\'ID3v2.4\'].TDRC');
  assert.deepEqual(native[i++], {id: 'TCON', value: 'Soundtrack'}, '[\'ID3v2.4\'].TCON #1');
  assert.deepEqual(native[i++], {id: 'TCON', value: 'OST'}, '[\'ID3v2.4\'].TCON #2');

  {
    const picTag = native[i++];
    assert.strictEqual(picTag.id, 'APIC', '[\'ID3v2.4\'].APIC #1');
    assert.deepEqual(picTag.value.format, 'image/jpeg', '[\'ID3v2.4\'].APIC #1 format');
    assert.deepEqual(picTag.value.type, 'Cover (front)', '[\'ID3v2.4\'].APIC #1 tagTypes');
    assert.deepEqual(picTag.value.description, '', '[\'ID3v2.4\'].APIC #1 description');
    assert.deepEqual(picTag.value.data.length, 75818, '[\'ID3v2.4\'].APIC #1 length');
  }

  assert.deepEqual(native[i++], {
    id: 'PRIV',
    value: {data: Buffer.from([0x02, 0x00, 0x00, 0x00]), owner_identifier: 'AverageLevel'}
  }, '[\'ID3v2.4\'].PRIV.AverageLevel');
  assert.deepEqual(native[i++], {
    id: 'PRIV',
    value: {data: Buffer.from([0x08, 0x00, 0x00, 0x00]), owner_identifier: 'PeakValue'}
  }, '[\'ID3v2.4\'].PRIV.PeakValue');
  assert.deepEqual(native[i++], {id: 'TCOM', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TCOM');
  assert.deepEqual(native[i++], {id: 'TDOR', value: '2004-10-12'}, '[\'ID3v2.4\'].TDOR');
  assert.deepEqual(native[i++], {
    id: 'TIPL',
    value: {producer: ['Brian Grazer', 'Brian Reitzell', 'Peter Berg']}
  }, '[\'ID3v2.4\'].TIPL');
  assert.deepEqual(native[i++], {id: 'TMED', value: 'CD'}, '[\'ID3v2.4\'].TIPL');
  assert.deepEqual(native[i++], {id: 'TPE2', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TPE2');
  assert.deepEqual(native[i++], {id: 'TPUB', value: 'Hip-O Records'}, '[\'ID3v2.4\'].TPUB');
  assert.deepEqual(native[i++], {id: 'TSO2', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TSO2');
  assert.deepEqual(native[i++], {id: 'TSOP', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TSOP');
  assert.deepEqual(native[i++], {id: 'TSRC', value: 'USUG10400421'}, '[\'ID3v2.4\'].TSRC');
  assert.deepEqual(native[i++], {id: 'TXXX:ASIN', value: 'B000649YAM'}, '[\'ID3v2.4\'].TXXX:ASIN');
  assert.deepEqual(native[i++], {id: 'TXXX:Artists', value: 'Explosions in the Sky'}, '[\'ID3v2.4\'].TXXX:Artists');
  assert.deepEqual(native[i++], {id: 'TXXX:BARCODE', value: '602498644102'}, '[\'ID3v2.4\'].TXXX:BARCODE');
  assert.deepEqual(native[i++], {id: 'TXXX:CATALOGNUMBER', value: 'B0003663-02'}, '[\'ID3v2.4\'].TXXX:CATALOGNUMBER');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Artist Id',
    value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Artist Id');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Id',
    value: '2644f258-0619-4beb-a150-0c0069ca6699'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Id');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Release Country',
    value: 'US'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Release Country');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Status',
    value: 'official'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Status');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Type',
    value: 'album'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Type #1');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Album Type',
    value: 'soundtrack'
  }, '[\'ID3v2.4\'].TXXX:MusicBrainz Album Type #2');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Artist Id',
    value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
  }, '[\'ID3v2.4\'].MusicBrainz Artist Id');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Release Group Id',
    value: 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7'
  }, '[\'ID3v2.4\'].MusicBrainz Release Group Id');
  assert.deepEqual(native[i++], {
    id: 'TXXX:MusicBrainz Release Track Id',
    value: 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13'
  }, '[\'ID3v2.4\'].MusicBrainz Release Track Id');
  assert.deepEqual(native[i++], {id: 'TXXX:PERFORMER', value: 'Explosions In The Sky'}, '[\'ID3v2.4\'].PERFORMER');
  assert.deepEqual(native[i++], {id: 'TXXX:SCRIPT', value: 'Latn'}, '[\'ID3v2.4\'].\'SCRIPT');
  assert.deepEqual(native[i++], {id: 'TXXX:originalyear', value: '2004'}, '[\'ID3v2.4\'].\'originalyear');
  assert.deepEqual(native[i++], {
    id: 'UFID', value: {
      identifier: Buffer.from([
        0x38, 0x34, 0x38, 0x35, 0x31, 0x31, 0x35, 0x30, 0x2d, 0x61, 0x31, 0x39, 0x36, 0x2d, 0x34, 0x38,
        0x66, 0x61, 0x2d, 0x61, 0x64, 0x61, 0x35, 0x2d, 0x31, 0x61, 0x30, 0x31, 0x32, 0x62, 0x31, 0x63,
        0x64, 0x39, 0x65, 0x64]),
      owner_identifier: 'http://musicbrainz.org'
    }
  }, '[\'ID3v2.4\'].UFID');
  assert.deepEqual(native[i], undefined, 'End of metadata');
});
