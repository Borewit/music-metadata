import path from 'node:path';
import { assert, expect } from 'chai';
import { CombinedTagMapper } from '../lib/common/CombinedTagMapper.js';
import { commonTagsKeys, isSingleton } from '../lib/common/GenericTagTypes.js';
import { joinArtists } from '../lib/common/MetadataCollector.js';
import * as mm from '../lib/index.js';
import { parseHttpContentType } from '../lib/ParserFactory.js';

import { samplePath } from './util.js';

describe('GenericTagMap', () => {
  const combinedTagMapper = new CombinedTagMapper();

  it('Check if each native tag, is mapped to a valid common type', () => {
    // for each tag type
    for (const nativeType in combinedTagMapper.tagMappers) {
      const tagMapper = combinedTagMapper.tagMappers[nativeType];
      for (const nativeTag in tagMapper.tagMap) {
        const commonType = tagMapper.tagMap[nativeTag];
        assert.isTrue(
          commonTagsKeys.includes(commonType),
          `Unknown common tagTypes in mapping ${nativeType}.${nativeTag} => ${commonType}`
        );
      }
    }
  });

  it('should be able to distinct singletons', () => {
    // common tags, singleton
    assert.ok(isSingleton('title'), 'common tag "title" is a singleton');
    assert.ok(isSingleton('artist'), 'common tag "artist" is a singleton');
    assert.ok(!isSingleton('artists'), 'common tag "artists" is not a singleton');
  });

  describe('common.artist / common.artists mapping', () => {
    it('should be able to join artists', () => {
      assert.equal(joinArtists(['David Bowie']), 'David Bowie');
      assert.equal(joinArtists(['David Bowie', 'Stevie Ray Vaughan']), 'David Bowie & Stevie Ray Vaughan');
      assert.equal(joinArtists(['David Bowie', 'Queen', 'Mick Ronson']), 'David Bowie, Queen & Mick Ronson');
    });

    it('parse RIFF tags', async () => {
      const filePath = path.join(samplePath, 'issue-89 no-artist.aiff');

      const metadata = await mm.parseFile(filePath, { duration: true });
      assert.deepEqual(
        metadata.common.artists,
        ['Beth Hart', 'Joe Bonamassa'],
        'common.artists directly via WM/ARTISTS'
      );
      assert.strictEqual(
        metadata.common.artist,
        'Beth Hart & Joe Bonamassa',
        'common.artist derived from common.artists'
      );
    });
  });
});

describe('function orderTags()', () => {
  for (const id of ['constructor', 'toString', '__proto__']) {
    it(`should group repeated tags named ${id}`, () => {
      const tags = mm.orderTags([
        { id, value: 'first' },
        { id: 'TITLE', value: 'Example' },
        { id, value: 'second' }
      ]);
      assert.deepEqual(tags[id], ['first', 'second']);
      assert.deepEqual(tags.TITLE, ['Example']);
      assert.isDefined(Object.getOwnPropertyDescriptor(tags, id));
      assert.sameMembers(Object.keys(tags), [id, 'TITLE']);
    });
  }

  it('should return an empty dictionary for no tags', () => {
    assert.deepEqual(Object.keys(mm.orderTags([])), []);
  });
});

describe('Convert rating', () => {
  it('should convert rating to stars', () => {
    assert.equal(mm.ratingToStars(undefined), 0);
    assert.equal(mm.ratingToStars(0), 1);
    assert.equal(mm.ratingToStars(0.1), 1);
    assert.equal(mm.ratingToStars(0.2), 2);
    assert.equal(mm.ratingToStars(0.5), 3);
    assert.equal(mm.ratingToStars(0.75), 4);
    assert.equal(mm.ratingToStars(1), 5);
  });
});

describe('function selectCover()', () => {
  const back: mm.IPicture = { type: 'Cover (back)', format: 'image/jpeg', data: new Uint8Array([1]) };

  for (const type of ['front', 'cover', 'Cover (Front)']) {
    it(`should prefer picture type ${type} over an earlier back cover`, () => {
      const front: mm.IPicture = { type, format: 'image/jpeg', data: new Uint8Array([2]) };
      assert.strictEqual(mm.selectCover([back, front]), front);
    });
  }

  it('should return null when no pictures are available', () => {
    assert.isNull(mm.selectCover());
    assert.isNull(mm.selectCover([]));
  });

  it('should fall back to the first picture when no front cover is identified', () => {
    const other: mm.IPicture = { format: 'image/jpeg', data: new Uint8Array([2]), name: '0' };
    assert.strictEqual(mm.selectCover([back, other]), back);
    assert.strictEqual(mm.selectCover([other]), other);
  });

  const multiCoverFiles = [
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3",
    "MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff",
    "MusicBrainz - Beth Hart - Sinner's Prayer.ape",
    "MusicBrainz - Beth Hart - Sinner's Prayer.flac",
    "MusicBrainz - Beth Hart - Sinner's Prayer.m4a",
    "MusicBrainz - Beth Hart - Sinner's Prayer.ogg",
    'id3v2.4.mp3',
    'issue-266.flac',
    'monkeysaudio.ape'
  ];

  it('Should pick the front cover', async () => {
    for (const multiCoverFile of multiCoverFiles) {
      const filePath = path.join(samplePath, multiCoverFile);
      const { common } = await mm.parseFile(filePath);
      expect(common.picture).to.have.lengthOf.above(1, multiCoverFile);
      const cover = mm.selectCover(common.picture);
      assert.isDefined(cover, 'Cover');
      if (cover) {
        if (cover.type) {
          assert.equal(cover.type, 'Cover (front)', 'cover.type');
        } else {
          assert.equal(cover.data, common.picture![0].data, 'First picture if no type is defined');
        }
      }
    }
  });
});

describe('MimeType', () => {
  it('should be able to decode basic MIME-types', () => {
    const mime = parseHttpContentType('audio/mpeg');
    assert.equal(mime.type, 'audio');
    assert.equal(mime.subtype, 'mpeg');
  });

  it('should be able to decode MIME-type parameters', () => {
    {
      const mime = parseHttpContentType('message/external-body; access-type=URL');
      assert.equal(mime.type, 'message');
      assert.equal(mime.subtype, 'external-body');
      assert.deepEqual(mime.parameters, { 'access-type': 'URL' });
    }

    {
      const mime = parseHttpContentType('Text/HTML;Charset="utf-8"');
      assert.equal(mime.type, 'text');
      assert.equal(mime.subtype, 'html');
      assert.deepEqual(mime.parameters, { charset: 'utf-8' });
    }
  });

  it('should be able to decode MIME-type suffix', () => {
    const mime = parseHttpContentType('application/xhtml+xml');
    assert.equal(mime.type, 'application');
    assert.equal(mime.subtype, 'xhtml');
    assert.equal(mime.suffix, 'xml');
  });
});
