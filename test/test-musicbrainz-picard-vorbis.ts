import {assert} from 'chai';
import * as mm from '../src';

import * as path from 'path';

const t = assert;

it("MusicBrains/Picard tags in FLAC", () => {

  const filename = 'MusicBrainz-Picard-tags.flac';
  const filePath = path.join(__dirname, 'samples', filename);

  function checkFormat(format) {
    t.deepEqual(format.duration, 271.7733333333333, 'format.duration');
    t.deepEqual(format.sampleRate, 44100, 'format.sampleRate');
    t.deepEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
    t.deepEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
  }

  function checkCommonTags(common) {
    // Compare expectedCommonTags with result.common
    t.deepEqual(common.title, 'Brian Eno', 'common.tagtitle');
    t.deepEqual(common.artist, 'MGMT', 'common.artist');
    t.deepEqual(common.artists, ['MGMT'], 'common.artist');
    t.deepEqual(common.albumartist, 'MGMT', 'common.albumartist');
    t.deepEqual(common.album, 'Oracular Spectacular / Congratulations', 'common.album');
    t.deepEqual(common.track, {no: 7, of: 9}, 'common.track');
    t.deepEqual(common.disk, {no: 2, of: 2}, 'common.disk');
    t.deepEqual(common.discsubtitle, 'Cogratulations', 'common.discsubtitle');
    t.deepEqual(common.date, '2011-09-11', 'common.date');
    t.deepEqual(common.year, 2011, 'common.year');
    t.deepEqual(common.releasecountry, 'XE', 'common.releasecountry');
    t.deepEqual(common.asin, 'B0055U9LNC', 'common.asin');
    t.deepEqual(common.barcode, "886979357723", 'common.barcode');
    t.deepEqual(common.label, ['Sony Music'], 'common.label');
    t.deepEqual(common.catalognumber, ['88697935772'], 'common.catalognumber');
    t.deepEqual(common.originalyear, 2011, 'common.originalyear');
    t.deepEqual(common.originaldate, '2011-09-11', 'common.originaldate');
    t.deepEqual(common.releasestatus, 'official', 'common.releasestatus');
    t.deepEqual(common.releasetype, ['album', 'compilation'], 'common.releasetype');
    t.deepEqual(common.comment, ['EAC-Secure Mode'], 'common.comment');
    t.deepEqual(common.genre, ['Alt. Rock'], 'common.genre');
    t.deepEqual(common.musicbrainz_albumid, '6032dfc4-8880-4fea-b1c0-aaee52e1113c', 'common.musicbrainz_albumid');
    t.deepEqual(common.musicbrainz_recordingid, 'b0c1d984-ba93-4167-880a-ac02255bf9e7', 'common.musicbrainz_recordingid');
    t.deepEqual(common.musicbrainz_albumartistid, ['c485632c-b784-4ee9-8ea1-c5fb365681fc'], 'common.musicbrainz_albumartistid');
    t.deepEqual(common.musicbrainz_artistid, ['c485632c-b784-4ee9-8ea1-c5fb365681fc'], 'common.musicbrainz_artistid');
    t.deepEqual(common.musicbrainz_releasegroupid, '9a3237f4-c2a5-467f-9a8e-fe1d247ff520', 'common.musicbrainz_releasegroupid');
    t.deepEqual(common.musicbrainz_trackid, '0f53f7a3-89df-4069-9357-d04252239b6d', 'common.musicbrainz_trackid');

    t.deepEqual(common.picture[0].format, 'image/jpeg', 'picture format');
    t.deepEqual(common.picture[0].data.length, 175668, 'picture length');
  }

  function checkNativeTags(vorbis) {
    // Compare expectedCommonTags with result.vorbis
    t.deepEqual(vorbis.TITLE, ['Brian Eno'], 'vorbis: .TITLE');
    t.deepEqual(vorbis.ARTIST, ['MGMT'], 'vorbis: artist');
    t.deepEqual(vorbis.ARTISTS, ['MGMT'], 'vorbis: artist');
    t.deepEqual(vorbis.ALBUMARTIST, ['MGMT'], 'vorbis: albumartist');
    t.deepEqual(vorbis.ALBUM, ['Oracular Spectacular / Congratulations'], 'vorbis: album');
    t.deepEqual(vorbis.TRACKNUMBER, ['7'], 'vorbis: TRACK');
    t.deepEqual(vorbis.TRACKTOTAL, ['9'], 'vorbis: TRACKTOTAL');
    t.deepEqual(vorbis.DISCNUMBER, ['2'], 'vorbis: DISCNUMBER');
    t.deepEqual(vorbis.DISCTOTAL, ['2'], 'vorbis: DISCTOTAL');
    t.deepEqual(vorbis.DISCSUBTITLE, ['Cogratulations'], 'vorbis: DISCSUBTITLE');
    t.deepEqual(vorbis.DATE, ['2011-09-11'], 'vorbis: DATE');
    t.deepEqual(vorbis.RELEASECOUNTRY, ['XE'], 'vorbis: RELEASECOUNTRY');
    t.deepEqual(vorbis.ASIN, ['B0055U9LNC'], 'vorbis: ASIN');
    t.deepEqual(vorbis.BARCODE, ['886979357723'], 'vorbis: BARCODE');
    t.deepEqual(vorbis.LABEL, ['Sony Music'], 'vorbis: LABEL');
    t.deepEqual(vorbis.CATALOGNUMBER, ['88697935772'], 'vorbis: CATALOGNUMBER');
    t.deepEqual(vorbis.ORIGINALYEAR, ['2011'], 'vorbis: ORIGINALYEAR');
    t.deepEqual(vorbis.ORIGINALDATE, ['2011-09-11'], 'vorbis: ORIGINALDATE');
    t.deepEqual(vorbis.RELEASESTATUS, ['official'], 'vorbis: RELEASESTATUS');
    t.deepEqual(vorbis.RELEASETYPE, ['album', 'compilation'], 'vorbis: RELEASETYPE');
    t.deepEqual(vorbis.COMMENT, ['EAC-Secure Mode'], 'vorbis: COMMENT');
    t.deepEqual(vorbis.GENRE, ['Alt. Rock'], 'vorbis: GENRE');
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMID, ['6032dfc4-8880-4fea-b1c0-aaee52e1113c'], 'vorbis: MUSICBRAINZ_ALBUMID');
    t.deepEqual(vorbis.MUSICBRAINZ_TRACKID, ['b0c1d984-ba93-4167-880a-ac02255bf9e7'], 'vorbis: MUSICBRAINZ_RECORDINGID');
    t.deepEqual(vorbis.MUSICBRAINZ_ALBUMARTISTID, ['c485632c-b784-4ee9-8ea1-c5fb365681fc'], 'vorbis: MUSICBRAINZ_ALBUMARTISTID');
    t.deepEqual(vorbis.MUSICBRAINZ_ARTISTID, ['c485632c-b784-4ee9-8ea1-c5fb365681fc'], 'vorbis: MUSICBRAINZ_ARTISTID');
    t.deepEqual(vorbis.MUSICBRAINZ_RELEASEGROUPID, ['9a3237f4-c2a5-467f-9a8e-fe1d247ff520'], 'vorbis: MUSICBRAINZ_RELEASEGROUPID');
    t.deepEqual(vorbis.MUSICBRAINZ_RELEASETRACKID, ['0f53f7a3-89df-4069-9357-d04252239b6d'], 'vorbis: MUSICBRAINZ_RELEASETRACKID');

    // t.deepEqual(common.picture[ 0 ].format, 'jpg', 'picture format')
    // i.deepEqual(common.picture[ 0 ].data.length, 175668, 'picture length')
  }

  // Run with default options
  return mm.parseFile(filePath, {native: true}).then(result => {

    t.ok(result.common, 'should include common tags');
    t.ok(result.native && result.native.vorbis, 'should include native Vorbis tags');
    checkFormat(result.format);
    checkNativeTags(mm.orderTags(result.native.vorbis));
    checkCommonTags(result.common);
  });

});
