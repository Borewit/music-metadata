import {assert} from 'chai';
import * as mm from '../lib';

import * as path from 'path';

const t = assert;

const samplePath = path.join(__dirname, 'samples');

describe("Add and fix some mappings (pr-544)", () => {

    // TODO: id3v22 test file
    /*it("mp3-id3v22", () => {
        const filename = 'mp3/pr-544-id3v22.mp3';
        const filePath = path.join(samplePath, filename);

        return mm.parseFile(filePath).then(metadata => {
            testEqualsSame(metadata);

            t.strictEqual(metadata.common.originalalbum, 'Original Album', 'metadata.common.originalalbum');

            // t.strictEqual(metadata.common.showMovement, true, 'metadata.common.showMovement'); // Not exists in MP3 (Written as comment)
            // t.strictEqual(metadata.common.work, 'Work', 'metadata.common.work'); // Not exists in MP3 (Written as comment)

            // t.strictEqual(metadata.common.hdVideo, 2, 'metadata.common.hdVideo'); // Not exists in MP3 (Written as comment)
            // t.strictEqual(metadata.common.stik, 9, 'metadata.common.stik'); // Not exists in MP3 (Written as comment)
        });
    });*/

    it("mp3-id3v24", () => {
        const filename = 'mp3/pr-544-id3v24.mp3';
        const filePath = path.join(samplePath, filename);

        return mm.parseFile(filePath).then(metadata => {
            testEqualsSame(metadata);

            t.strictEqual(metadata.common.originalalbum, 'Original Album', 'metadata.common.originalalbum');

            // t.strictEqual(metadata.common.showMovement, true, 'metadata.common.showMovement'); // Not exists in MP3 (Written as comment)
            // t.strictEqual(metadata.common.work, 'Work', 'metadata.common.work'); // Not exists in MP3 (Written as comment)

            // t.strictEqual(metadata.common.hdVideo, 2, 'metadata.common.hdVideo'); // Not exists in MP3 (Written as comment)
            // t.strictEqual(metadata.common.stik, 9, 'metadata.common.stik'); // Not exists in MP3 (Written as comment)
        });
    });

    it("mp4", () => {
        const filename = 'mp4/pr-544.m4a';
        const filePath = path.join(samplePath, filename);

        return mm.parseFile(filePath).then(metadata => {
            testEqualsSame(metadata);

            // t.strictEqual(metadata.common.originalalbum, 'Original Album', 'metadata.common.originalalbum'); // Not exists in MP4 (Written as comment)

            t.strictEqual(metadata.common.showMovement, true, 'metadata.common.showMovement');
            t.strictEqual(metadata.common.work, 'Work', 'metadata.common.work');

            t.strictEqual(metadata.common.hdVideo, 2, 'metadata.common.hdVideo');
            t.strictEqual(metadata.common.stik, 9, 'metadata.common.stik');
        });
    });

    function testEqualsSame(metadata: mm.IAudioMetadata): void {
        t.strictEqual(metadata.common.albumartistsort, 'Album Artist Sort', 'metadata.common.albumartistsort');
        t.strictEqual(metadata.common.albumsort, 'Album Sort', 'metadata.common.albumsort');
        t.strictEqual(metadata.common.artistsort, 'Artist Sort', 'metadata.common.artistsort');
        t.deepEqual(metadata.common.composersort, ['Composer Sort'], 'metadata.common.composersort'); // TODO: Why composer sort field is an array but other sort fields not?
        t.strictEqual(metadata.common.titlesort, 'Title Sort', 'metadata.common.titlesort');

        t.strictEqual(metadata.common.movement, 'Movement Name', 'metadata.common.movement');
        t.deepEqual(metadata.common.movementIndex, {no: 1, of: 4}, 'metadata.common.movementIndex');

        t.deepEqual(metadata.common.subtitle, ['Short Description'], 'metadata.common.subtitle');
        t.deepEqual(metadata.common.description, ['Long Description'], 'metadata.common.description');

        t.deepEqual(metadata.common.category, ['Podcast Category'], 'metadata.common.category');
        t.deepEqual(metadata.common.keywords, ['Podcast Keywords'], 'metadata.common.keywords');

        t.strictEqual(metadata.common.podcast, true, 'metadata.common.podcast');
        t.strictEqual(metadata.common.podcastId, '1234', 'metadata.common.podcastId');
        t.strictEqual(metadata.common.podcasturl, 'http://podcast.url', 'metadata.common.podcasturl');

        t.strictEqual(metadata.common.copyright, 'Copyright', 'metadata.common.copyright');

        t.strictEqual(metadata.common.compilation, true, 'metadata.common.compilation');

        t.deepEqual(metadata.common.comment, ['Tagged with Mp3tag v3.01'], 'metadata.common.comment');

        t.strictEqual(metadata.common.date, '2020-06-29T00:00:00.000Z', 'metadata.common.date');
        t.strictEqual(metadata.common.year, 2020, 'metadata.common.year');
    }
});
