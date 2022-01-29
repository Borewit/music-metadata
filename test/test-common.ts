import { assert } from 'chai';
import * as path from 'path';

import { commonTags, isSingleton } from '../lib/common/GenericTagTypes';
import * as mm from '../lib';
import { CombinedTagMapper } from '../lib/common/CombinedTagMapper';
import { joinArtists } from '../lib/common/MetadataCollector';
import { parseHttpContentType } from '../lib/ParserFactory';

import { samplePath } from './util';

describe('GenericTagMap', () => {

  const combinedTagMapper = new CombinedTagMapper();

  it('Check if each native tag, is mapped to a valid common type', () => {

    assert.isDefined(commonTags);

    // for each tag type
    for (const nativeType in combinedTagMapper.tagMappers) {
      const tagMapper = combinedTagMapper.tagMappers[nativeType];
      for (const nativeTag in tagMapper.tagMap) {
        const commonType = tagMapper.tagMap[nativeTag];
        assert.isDefined(commonTags[commonType], 'Unknown common tagTypes in mapping ' + nativeType + '.' + nativeTag + ' => ' + commonType);
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

      const filePath = path.join(__dirname, 'samples', 'issue-89 no-artist.aiff');

      const metadata = await mm.parseFile(filePath, {duration: true});
      assert.deepEqual(metadata.common.artists, ['Beth Hart', 'Joe Bonamassa'], 'common.artists directly via WM/ARTISTS');
      assert.strictEqual(metadata.common.artist, 'Beth Hart & Joe Bonamassa', 'common.artist derived from common.artists');
    });
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

  const multiCoverFiles = [
    'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].V2.mp3',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.3].wav',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.4].V2.mp3',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer [id3v2.4].aiff',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer.ape',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer.flac',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer.m4a',
    'MusicBrainz - Beth Hart - Sinner\'s Prayer.ogg',
    'id3v2.4.mp3',
    'issue-266.flac',
    'monkeysaudio.ape'
  ];

  it('Should pick the front cover', async () => {
    for (const multiCoverFile of multiCoverFiles) {
      const filePath = path.join(samplePath, multiCoverFile);
      const {common} = await mm.parseFile(filePath);
      assert.isTrue(common.picture.length > 1);
      const cover = mm.selectCover(common.picture);
      if (cover.type) {
        assert.equal(cover.type, 'Cover (front)', 'cover.type');
      } else {
        assert.equal(cover.data, common.picture[0].data, 'First picture if no type is defined');
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
      assert.deepEqual(mime.parameters, {'access-type': 'URL'});
    }

    {
      const mime = parseHttpContentType('Text/HTML;Charset="utf-8"');
      assert.equal(mime.type, 'text');
      assert.equal(mime.subtype, 'html');
      assert.deepEqual(mime.parameters, {charset: 'utf-8'});
    }
  });

  it('should be able to decode MIME-type suffix', () => {
    const mime = parseHttpContentType('application/xhtml+xml');
    assert.equal(mime.type, 'application');
    assert.equal(mime.subtype, 'xhtml');
    assert.equal(mime.suffix, 'xml');
  });

});
