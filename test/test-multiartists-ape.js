"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var mm = require("../src");
var path = require('path');
var t = chai_1.assert;
it("should support multiple artists in ape format", function () {
    var filename = 'MusicBrainz-multiartist.ape';
    var filePath = path.join(__dirname, 'samples', filename);
    function checkFormat(format) {
        t.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        t.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        t.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        t.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    }
    function checkCommonTags(common) {
        // Compare expectedCommonTags with result.common
        t.strictEqual(common.title, 'Sinner\'s Prayer', 'common.tagtitle');
        t.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', 'common.artist');
        t.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artists');
        t.strictEqual(common.albumartist, 'Beth Hart & Joe Bonamassa', 'common.albumartist');
        t.strictEqual(common.albumartistsort, 'Hart, Beth & Bonamassa, Joe', 'common.albumsort');
        t.strictEqual(common.album, 'Don\'t Explain', 'common.album = Don\'t Explain');
        t.deepEqual(common.track, { no: 1, of: 10 }, 'common.track');
        t.deepEqual(common.disk, { no: 1, of: 1 }, 'common.disk');
        t.strictEqual(common.date, '2011-09-27', 'common.date');
        t.strictEqual(common.year, 2011, 'common.year');
        t.strictEqual(common.media, 'CD', 'common.media = CD');
        t.strictEqual(common.barcode, 804879313915, 'common.barcode');
        t.deepEqual(common.producer, ['Roy Weisman'], 'common.producer = Roy Weisman');
        t.strictEqual(common.label, 'J&R Adventures', 'common.label = J&R Adventures');
        t.strictEqual(common.catalognumber, 'PRAR931391', 'common.catalognumber = PRAR931391');
        t.strictEqual(common.originalyear, 2011, 'common.originalyear = 2011');
        t.strictEqual(common.originaldate, '2011-09-26', 'common.originaldate = 2011-09-26');
        t.strictEqual(common.releasestatus, 'official', 'common.releasestatus = official');
        t.deepEqual(common.releasetype, ['album'], 'common.releasetype');
        // t.deepEqual(common.notes, ['Medieval CUE Splitter (www.medieval.it)'], 'common.note')
        t.strictEqual(common.musicbrainz_albumid, 'e7050302-74e6-42e4-aba0-09efd5d431d8', 'common.musicbrainz_albumid');
        t.strictEqual(common.musicbrainz_recordingid, 'f151cb94-c909-46a8-ad99-fb77391abfb8', 'common.musicbrainz_recordingid');
        t.deepEqual(common.musicbrainz_albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_albumartistid');
        t.deepEqual(common.musicbrainz_artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'common.musicbrainz_artistid');
        t.strictEqual(common.musicbrainz_releasegroupid, 'e00305af-1c72-469b-9a7c-6dc665ca9adc', 'common.musicbrainz_releasegroupid');
        t.strictEqual(common.musicbrainz_trackid, 'd062f484-253c-374b-85f7-89aab45551c7', 'common.musicbrainz_trackid');
        // t.deepEqual(common.releasecountry, 'GB', 'common.releasecountry')
        // ToDo? why missing? t.deepEqual(common.asin, 'B004X5SCGM', 'common.asin')
        t.deepEqual(common.picture[0].format, 'jpg', 'picture format');
        t.deepEqual(common.picture[0].data.length, 98008, 'picture length');
    }
    function checkVorbisTags(APEv2) {
        // Compare expectedCommonTags with result.common
        t.deepEqual(APEv2.Title, ['Sinner\'s Prayer'], 'APEv2.Title');
        t.deepEqual(APEv2.Album, ['Don\'t Explain'], 'APEv2.Album');
        t.deepEqual(APEv2.Year, ['2011-09-27'], 'APEv2.Year');
        t.deepEqual(APEv2.Track, ['1/10'], 'APEv2.Track');
        t.deepEqual(APEv2.Disc, ['1/1'], 'APEv2.Disc');
        t.deepEqual(APEv2.Originalyear, ['2011'], 'APEv2.Year');
        t.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.Originaldate');
        t.deepEqual(APEv2.Label, ['J&R Adventures'], 'APEv2.LABEL');
        t.deepEqual(APEv2.CatalogNumber, ['PRAR931391'], 'APEv2.CatalogNumber');
        // ToDo?: t.deepEqual(APEv2.ACOUSTID_ID, '09c06fac-679a-45b1-8ea0-6ce532318363', 'APEv2.ACOUSTID_ID')
        t.deepEqual(APEv2.Artist, ['Beth Hart & Joe Bonamassa'], 'APEv2.Artist');
        t.deepEqual(APEv2.Artists, ['Beth Hart', 'Joe Bonamassa'], 'APEv2.Artists');
        t.deepEqual(APEv2.Artistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Artistsort');
        t.deepEqual(APEv2['Album Artist'], ['Beth Hart & Joe Bonamassa'], 'APEv2.ALBUMARTIST');
        t.deepEqual(APEv2.Albumartistsort, ['Hart, Beth & Bonamassa, Joe'], 'APEv2.Albumartistsort');
        t.deepEqual(APEv2.Originaldate, ['2011-09-26'], 'APEv2.ORIGINALDATE');
        t.deepEqual(APEv2.Script, ['Latn'], 'APEv2.Script');
        t.deepEqual(APEv2.Media, ['CD'], 'APEv2.Media');
        t.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
        t.deepEqual(APEv2.Musicbrainz_Albumartistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Albumartistid');
        t.deepEqual(APEv2.Musicbrainz_Artistid, ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'], 'APEv2.Musicbrainz_Artistid');
        t.deepEqual(APEv2.Performer, ['Carmine Rojas (bass guitar)', 'The Bovaland Orchestra (orchestra)', 'Anton Fig (drums)', 'Anton Fig (percussion)', 'Blondie Chaplin (guitar)',
            'Joe Bonamassa (guitar)', 'Arlan Scheirbaum (keyboard)', 'Beth Hart (vocals)', 'Joe Bonamassa (vocals)', 'Beth Hart (piano)'], 'APEv2.Performer');
        t.deepEqual(APEv2.Producer, ['Roy Weisman'], 'APEv2.PRODUCER');
        t.deepEqual(APEv2.Engineer, ['James McCullagh', 'Jared Kvitka'], 'APEv2.ENGINEER');
        t.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.ARRANGER');
        t.deepEqual(APEv2.Musicbrainz_Albumid, ['e7050302-74e6-42e4-aba0-09efd5d431d8'], 'APEv2.Musicbrainz_Albumid');
        t.deepEqual(APEv2.musicbrainz_releasetrackid, ['d062f484-253c-374b-85f7-89aab45551c7'], 'APEv2.musicbrainz_releasetrackid');
        t.deepEqual(APEv2.Musicbrainz_Releasegroupid, ['e00305af-1c72-469b-9a7c-6dc665ca9adc'], 'APEv2.Musicbrainz_Releasegroupid');
        t.deepEqual(APEv2.musicbrainz_trackid, ['f151cb94-c909-46a8-ad99-fb77391abfb8'], 'APEv2.musicbrainz_trackid');
        //t.deepEqual(APEv2.NOTES, ['Medieval CUE Splitter (www.medieval.it)'], 'APEv2.NOTES')
        t.deepEqual(APEv2.Barcode, ['804879313915'], 'APEv2.Barcode');
        // ToDo: not set??? t.deepEqual(APEv2.ASIN, 'B004X5SCGM', 'APEv2.ASIN')
        // ToDo: not set??? t.deepEqual(APEv2.RELEASECOUNTRY, 'GB', 'APEv2.RELEASECOUNTRY')
        t.deepEqual(APEv2.MUSICBRAINZ_ALBUMSTATUS, ['official'], 'APEv2.MUSICBRAINZ_ALBUMSTATUS');
        t.deepEqual(APEv2.Arranger, ['Jeff Bova'], 'APEv2.Arranger');
        // ToDo:
        // t.deepEqual(APEv2['Cover Art (Front)'][0].format, 'jpg', 'picture.format')
        t.deepEqual(APEv2['Cover Art (Front)'][0].description, 'Cover Art (Front).jpg', 'picture.description');
        t.deepEqual(APEv2['Cover Art (Front)'][0].data.length, 98008, 'picture.data.length');
        //t.strictEqual(APEv2.METADATA_BLOCK_PICTURE.format, 'image/jpeg', 'APEv2.METADATA_BLOCK_PICTURE format')
        //t.strictEqual(APEv2.METADATA_BLOCK_PICTURE.data.length, 98008, 'APEv2.METADATA_BLOCK_PICTURE length')
    }
    function mapNativeTags(nativeTags) {
        var tags = {};
        nativeTags.forEach(function (tag) {
            (tags[tag.id] = (tags[tag.id] || [])).push(tag.value);
        });
        return tags;
    }
    // Run with default options
    return mm.parseFile(filePath, { native: true }).then(function (result) {
        t.ok(result.native && result.native.hasOwnProperty('APEv2'), 'should include native Vorbis tags');
        checkFormat(result.format);
        checkVorbisTags(mapNativeTags(result.native.APEv2));
        checkCommonTags(result.common);
    });
});
//# sourceMappingURL=test-multiartists-ape.js.map