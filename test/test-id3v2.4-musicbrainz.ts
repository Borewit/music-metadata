import {assert} from 'chai';
import * as mm from '../src';
import * as path from 'path';

const t = assert;

it("should MusicBrainz tags with id3v2.4", () => {

  const filename = 'id3v2.4-musicbrainz.mp3';
  const filePath = path.join(__dirname, 'samples', filename);

  return mm.parseFile(filePath, {duration: true, native: true}).then(result => {
    t.deepEqual(result.format.duration, 0.7836734693877551, 'format.duration');

    t.deepEqual(result.common.title, 'Home', 'common.title');
    t.deepEqual(result.common.artist, 'Explosions in the Sky', 'common.artist');
    t.deepEqual(result.common.albumartist, 'Explosions in the Sky', 'common.albumartist');
    t.deepEqual(result.common.album, 'Friday Night Lights: Original Motion Picture Soundtrack', 'common.album');
    t.deepEqual(result.common.year, 2004, 'common.year');
    t.deepEqual(result.common.date, '2004-10-12', 'common.date');
    t.deepEqual(result.common.track, {no: 5, of: 14}, 'common.track');
    t.deepEqual(result.common.disk, {no: 1, of: 1}, 'common.disk');
    t.deepEqual(result.common.genre, ['Soundtrack', 'OST'], 'common.genre');
    t.deepEqual(result.common.picture[0].format, 'image/jpeg', 'common.picture 0 format');
    t.deepEqual(result.common.picture[0].data.length, 75818, 'common.picture 0 length');

    t.deepEqual(result.common.barcode, '602498644102', 'common.barcode');
    t.deepEqual(result.common.isrc, ['USUG10400421'], 'common.isrc');
    t.deepEqual(result.common.label, ['Hip-O Records'], 'common.label');
    t.deepEqual(result.common.catalognumber, ['B0003663-02'], 'common.catalognumber');
    t.deepEqual(result.common.releasecountry, 'US', 'common.releasecountry');
    t.deepEqual(result.common.media, 'CD', 'common.media');
    t.deepEqual(result.common.musicbrainz_artistid, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Artist Id');
    t.deepEqual(result.common.musicbrainz_recordingid, '84851150-a196-48fa-ada5-1a012b1cd9ed', 'MusicBrainz Recording Id');
    t.deepEqual(result.common.musicbrainz_albumartistid, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Release Artist Id');
    t.deepEqual(result.common.musicbrainz_releasegroupid, 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7', 'MusicBrainz Release Group Id');
    t.deepEqual(result.common.musicbrainz_albumid, '2644f258-0619-4beb-a150-0c0069ca6699', 'MusicBrainz Release Id');
    t.deepEqual(result.common.musicbrainz_trackid, 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13', 'MusicBrainz Track Id');

    const native = result.native['ID3v2.4'];
    t.ok(native, 'Native id3v2.4 tags should be present');

    let i = 0;
    t.deepEqual(native[i++], {id: 'TIT2', value: 'Home'}, "['ID3v2.4'].TIT2");
    t.deepEqual(native[i++], {id: 'TPE1', value: 'Explosions in the Sky'}, "['ID3v2.4'].TPE1");
    t.deepEqual(native[i++], {id: 'TRCK', value: '5/14'}, "['ID3v2.4'].TRCK");
    t.deepEqual(native[i++], {
      id: 'TALB',
      value: 'Friday Night Lights: Original Motion Picture Soundtrack'
    }, "['ID3v2.4'].TALB");
    t.deepEqual(native[i++], {id: 'TPOS', value: '1/1'}, "['ID3v2.4'].TPOS");
    t.deepEqual(native[i++], {id: 'TDRC', value: '2004-10-12'}, "['ID3v2.4'].TDRC");
    t.deepEqual(native[i++], {id: 'TCON', value: 'Soundtrack'}, "['ID3v2.4'].TCON #1");
    t.deepEqual(native[i++], {id: 'TCON', value: 'OST'}, "['ID3v2.4'].TCON #2");

    {
      const picTag = native[i++];
      t.strictEqual(picTag.id, 'APIC', "['ID3v2.4'].APIC #1");
      t.deepEqual(picTag.value.format, 'image/jpeg', "['ID3v2.4'].APIC #1 format");
      t.deepEqual(picTag.value.type, 'Cover (front)', "['ID3v2.4'].APIC #1 tagTypes");
      t.deepEqual(picTag.value.description, '', "['ID3v2.4'].APIC #1 description");
      t.deepEqual(picTag.value.data.length, 75818, "['ID3v2.4'].APIC #1 length");
    }

    t.deepEqual(native[i++], {
      id: 'PRIV',
      value: {data: Buffer.from([0x02, 0x00, 0x00, 0x00]), owner_identifier: 'AverageLevel'}
    }, "['ID3v2.4'].PRIV.AverageLevel");
    t.deepEqual(native[i++], {
      id: 'PRIV',
      value: {data: Buffer.from([0x08, 0x00, 0x00, 0x00]), owner_identifier: 'PeakValue'}
    }, "['ID3v2.4'].PRIV.PeakValue");
    t.deepEqual(native[i++], {id: 'TCOM', value: 'Explosions in the Sky'}, "['ID3v2.4'].TCOM");
    t.deepEqual(native[i++], {id: 'TDOR', value: '2004-10-12'}, "['ID3v2.4'].TDOR");
    t.deepEqual(native[i++], {
      id: 'TIPL',
      value: {producer: ['Brian Grazer', 'Brian Reitzell', 'Peter Berg']}
    }, "['ID3v2.4'].TIPL");
    t.deepEqual(native[i++], {id: 'TMED', value: 'CD'}, "['ID3v2.4'].TIPL");
    t.deepEqual(native[i++], {id: 'TPE2', value: 'Explosions in the Sky'}, "['ID3v2.4'].TPE2");
    t.deepEqual(native[i++], {id: 'TPUB', value: 'Hip-O Records'}, "['ID3v2.4'].TPUB");
    t.deepEqual(native[i++], {id: 'TSO2', value: 'Explosions in the Sky'}, "['ID3v2.4'].TSO2");
    t.deepEqual(native[i++], {id: 'TSOP', value: 'Explosions in the Sky'}, "['ID3v2.4'].TSOP");
    t.deepEqual(native[i++], {id: 'TSRC', value: 'USUG10400421'}, "['ID3v2.4'].TSRC");
    t.deepEqual(native[i++], {id: 'TXXX:ASIN', value: 'B000649YAM'}, "['ID3v2.4'].TXXX:ASIN");
    t.deepEqual(native[i++], {id: 'TXXX:Artists', value: 'Explosions in the Sky'}, "['ID3v2.4'].TXXX:Artists");
    t.deepEqual(native[i++], {id: 'TXXX:BARCODE', value: '602498644102'}, "['ID3v2.4'].TXXX:BARCODE");
    t.deepEqual(native[i++], {id: 'TXXX:CATALOGNUMBER', value: 'B0003663-02'}, "['ID3v2.4'].TXXX:CATALOGNUMBER");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Artist Id',
      value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Artist Id");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Id',
      value: '2644f258-0619-4beb-a150-0c0069ca6699'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Id");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Release Country',
      value: 'US'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Release Country");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Status',
      value: 'official'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Status");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Type',
      value: 'album'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Type #1");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Album Type',
      value: 'soundtrack'
    }, "['ID3v2.4'].TXXX:MusicBrainz Album Type #2");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Artist Id',
      value: '4236acde-2ce2-441c-a3d4-38d55f1b5474'
    }, "['ID3v2.4'].MusicBrainz Artist Id");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Release Group Id',
      value: 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7'
    }, "['ID3v2.4'].MusicBrainz Release Group Id");
    t.deepEqual(native[i++], {
      id: 'TXXX:MusicBrainz Release Track Id',
      value: 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13'
    }, "['ID3v2.4'].MusicBrainz Release Track Id");
    t.deepEqual(native[i++], {id: 'TXXX:PERFORMER', value: 'Explosions In The Sky'}, "['ID3v2.4'].PERFORMER");
    t.deepEqual(native[i++], {id: 'TXXX:SCRIPT', value: 'Latn'}, "['ID3v2.4'].'SCRIPT");
    t.deepEqual(native[i++], {id: 'TXXX:originalyear', value: '2004'}, "['ID3v2.4'].'originalyear");
    t.deepEqual(native[i++], {
      id: 'UFID', value: {
        identifier: Buffer.from([
          0x38, 0x34, 0x38, 0x35, 0x31, 0x31, 0x35, 0x30, 0x2d, 0x61, 0x31, 0x39, 0x36, 0x2d, 0x34, 0x38,
          0x66, 0x61, 0x2d, 0x61, 0x64, 0x61, 0x35, 0x2d, 0x31, 0x61, 0x30, 0x31, 0x32, 0x62, 0x31, 0x63,
          0x64, 0x39, 0x65, 0x64]),
        owner_identifier: 'http://musicbrainz.org'
      }
    }, "['ID3v2.4'].UFID");
    t.deepEqual(native[i], undefined, "End of metadata");
  });

  /*
   .on('TSSE', function (result) {
   t.deepEqual(result, 'image/jpeg', 'raw APIC 0 format')
   })*/
});
