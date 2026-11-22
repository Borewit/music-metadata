import * as crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { assert } from 'vitest';
import type { TagType } from '../lib/common/GenericTagTypes.js';
import { MetadataCollector } from '../lib/common/MetadataCollector.js';
import {
  type ICommonTagsResult,
  type IFormat,
  parseBuffer,
  parseFile,
  type TagPatch,
  updateBuffer
} from '../lib/index.js';
import { samplePath } from './helpers/util.js';

/* eslint-disable dot-notation, @typescript-eslint/dot-notation */

/**
 * Check if different header formats map to the same common output.
 * Picard storage mappings: https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html
 * The expected common fields below are music-metadata's interpretation of those mappings.
 */
describe("Parsing of metadata saved by 'Picard' in audio files", () => {
  // Following function manage common mapping exceptions, for good or bad reasons

  function hasReleaseData(inputTagType: TagType): boolean {
    return inputTagType !== 'ID3v2.3';
  }

  function hasOriginalData(inputTagType: TagType): boolean {
    switch (inputTagType) {
      case 'ID3v2.3': // has original year, not the original date
        return false;
      default:
        return true;
    }
  }

  function calcHash(buf: Uint8Array): string {
    const hash = crypto.createHash('md5');
    hash.update(buf);
    return hash.digest('hex');
  }

  /**
   * Check common output
   * @param inputTagType Meta-data header format
   * @param common Common tag mapping
   */
  function checkCommonMapping(inputTagType: TagType, common: ICommonTagsResult) {
    // Compare expectedCommonTags with result.common
    assert.strictEqual(common.title, "Sinner's Prayer", `${inputTagType} => common.title`);
    // Picard distinguishes the artist credit from the individual artist names.
    // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#artists
    assert.strictEqual(common.artist, 'Beth Hart & Joe Bonamassa', `${inputTagType} => common.artist`);

    if (inputTagType === 'asf') {
      assert.deepEqual(common.artists, ['Joe Bonamassa', 'Beth Hart'], `${inputTagType} => common.artists`);
      assert.deepEqual(
        common.mbArtistId,
        ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'],
        `${inputTagType} => common.musicbrainz_artistid`
      );
    } else {
      assert.deepEqual(common.artists, ['Beth Hart', 'Joe Bonamassa'], `${inputTagType} => common.artists`);
      assert.deepEqual(
        common.mbArtistId,
        ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'],
        `${inputTagType} => common.musicbrainz_artistid`
      );
    }

    assert.strictEqual(common.albumArtist, 'Beth Hart & Joe Bonamassa', 'common.albumArtist');
    // Sort names contain punctuation that must not be interpreted as list separators.
    // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#artist-sort-order
    assert.strictEqual(common.artistSort, 'Hart, Beth & Bonamassa, Joe', `${inputTagType} => common.artistsort`);
    assert.deepEqual(
      common.albumArtistSort,
      'Hart, Beth & Bonamassa, Joe',
      `${inputTagType} =>  common.albumArtistsort`
    );
    assert.strictEqual(common.album, "Don't Explain", `${inputTagType} => common.album = Don't Explain`);
    assert.strictEqual(common.trackNumber, 1, `${inputTagType} => common.trackNumber`);
    assert.deepEqual(common.discNumber, 1, `${inputTagType} => common.disk`);
    assert.strictEqual(
      common.trackTotal,
      inputTagType === 'asf' ? undefined : 10,
      `${inputTagType} => common.trackTotal`
    );
    assert.strictEqual(common.discTotal, 1, `${inputTagType} => common.discTotal`);
    if (hasOriginalData(inputTagType)) {
      assert.strictEqual(common.originalDate, '2011-09-26', `${inputTagType} => common.originaldate = 2011-09-26`);
    }
    if (hasReleaseData(inputTagType)) {
      assert.strictEqual(common.date, '2011-09-27', `${inputTagType} => common.date`);
    }
    assert.strictEqual(common.year, 2011, `${inputTagType} => common.year`);
    assert.strictEqual(common.originalYear, 2011, `${inputTagType} => common.year`);
    assert.strictEqual(common.media, 'CD', `${inputTagType} => common.media = CD`);
    // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#release-country
    assert.strictEqual(common.releaseCountry, 'US', `${inputTagType} => common.releasecountry`);
    assert.strictEqual(common.barcode, '804879313915', `${inputTagType} => common.barcode`);
    assert.deepEqual(common.producers, ['Roy Weisman'], `${inputTagType} => common.producer`);
    assert.deepEqual(common.labels, ['J&R Adventures'], `${inputTagType} => common.label = 'J&R Adventures'`);
    assert.deepEqual(common.catalogNumber, ['PRAR931391'], `${inputTagType} => common.catalognumber = PRAR931391`);
    assert.strictEqual(common.originalYear, 2011, `${inputTagType} => common.originalyear = 2011`);
    assert.strictEqual(common.releaseStatus, 'official', `${inputTagType} => common.releasestatus = official`);
    assert.deepEqual(common.releaseType, ['album'], `${inputTagType} => common.releasetype`);
    assert.strictEqual(
      common.mbReleaseId,
      'e7050302-74e6-42e4-aba0-09efd5d431d8',
      `${inputTagType} => common.musicbrainz_albumid`
    );
    // Recording IDs and release-track IDs identify different MusicBrainz entities.
    // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#musicbrainz-recording-id
    // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#musicbrainz-track-id
    assert.strictEqual(
      common.mbRecordingId,
      'f151cb94-c909-46a8-ad99-fb77391abfb8',
      `${inputTagType} => common.musicbrainz_recordingid`
    );

    if (inputTagType === 'asf') {
      assert.deepEqual(
        common.mbAlbumArtistId,
        ['984f8239-8fe1-4683-9c54-10ffb14439e9', '3fe817fc-966e-4ece-b00a-76be43e7e73c'],
        `${inputTagType} => common.musicbrainz_albumArtistid`
      );
    } else {
      assert.deepEqual(
        common.mbAlbumArtistId,
        ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9'],
        `${inputTagType} => common.musicbrainz_albumArtistid`
      );
    }

    assert.strictEqual(
      common.mbReleaseGroupId,
      'e00305af-1c72-469b-9a7c-6dc665ca9adc',
      `${inputTagType} => common.musicbrainz_releasegroupid`
    );
    assert.strictEqual(
      common.mbReleaseTrackId,
      'd062f484-253c-374b-85f7-89aab45551c7',
      `${inputTagType} => common.musicbrainz_trackid`
    );
    assert.strictEqual(common.asin, 'B005NPEUB2', `${inputTagType} => common.asin`);
    assert.strictEqual(
      common.acoustId,
      '09c06fac-679a-45b1-8ea0-6ce532318363',
      `${inputTagType} => common.acoustid_id`
    );

    // TODO: ASF picture decoding returns invalid MIME metadata for this fixture.
    // Keep checking its common text tags while cover decoding is unresolved.
    if (inputTagType !== 'asf') {
      // Check front cover
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
      assert.strictEqual(common.picture[0].data.length, 98008, 'picture length');
      assert.strictEqual(calcHash(common.picture[0].data), 'c57bec49b36ebf422018f82273d1995a', 'hash front cover data');

      // Check back cover
      assert.strictEqual(common.picture[1].format, 'image/png', 'picture format');
      assert.strictEqual(common.picture[1].data.length, 120291, 'picture length');
      assert.strictEqual(calcHash(common.picture[1].data), '90ec686eb82e745e737b2c7aa706eeaa', 'hash back cover data');
    }

    // ISRC
    assert.deepEqual(
      common.isrcs,
      inputTagType === 'asf' ? ['USMH51100098', 'NLB931100460'] : ['NLB931100460', 'USMH51100098'],
      `${inputTagType} => common.isrc`
    );

    // Rating
    switch (inputTagType) {
      case 'APEv2':
      case 'iTunes':
        break; // Skip rating tests for mapping type

      default:
        assert.isDefined(common.rating, `'${inputTagType}' has rating`);
        assert.approximately(common.rating[0].rating, 0.6, 0.1, `'${inputTagType}': rating=3.0`);
    }
  }

  describe('Home fixtures', () => {
    function checkHomeCommonMapping(common: ICommonTagsResult, tagType: TagType = 'ID3v2.4') {
      const isAsf = tagType === 'asf';
      assert.deepEqual(common.title, 'Home', 'common.title');
      assert.deepEqual(common.artist, 'Explosions in the Sky', 'common.artist');
      assert.deepEqual(common.albumArtist, 'Explosions in the Sky', 'common.albumArtist');
      assert.deepEqual(common.album, 'Friday Night Lights: Original Motion Picture Soundtrack', 'common.album');
      assert.deepEqual(common.year, 2004, 'common.year');
      assert.deepEqual(common.date, '2004-10-12', 'common.date');
      // The Picard WMA fixture contains neither a track total nor an arranger tag.
      assert.strictEqual(common.trackNumber, 5);
      assert.strictEqual(common.trackTotal, isAsf ? undefined : 14);
      assert.strictEqual(common.discNumber, 1);
      assert.strictEqual(common.discTotal, 1);
      assert.deepEqual(common.artists, ['Explosions in the Sky'], 'common.artists');
      assert.deepEqual(common.albumArtists, ['Explosions in the Sky'], 'common.albumArtists');
      assert.strictEqual(common.artistSort, 'Explosions in the Sky', 'common.artistsort');
      assert.strictEqual(common.albumArtistSort, 'Explosions in the Sky', 'common.albumArtistsort');
      assert.strictEqual(common.originalDate, '2004-10-12', 'common.originaldate');
      assert.strictEqual(common.originalYear, 2004, 'common.originalyear');
      assert.deepEqual(common.conductors, ['David Campbell'], 'common.conductor');
      assert.deepEqual(
        common.producers,
        isAsf
          ? ['Brian Grazer', 'Brian Reitzell', 'Justin Stanley', 'Peter Berg']
          : ['Peter Berg', 'Brian Grazer', 'Brian Reitzell', 'Justin Stanley'],
        'common.producer'
      );
      // ASF stores repeated values across separate header objects, affecting their read order.
      assert.deepEqual(
        common.engineers,
        isAsf ? ['Justin Stanley', 'Richard Jory'] : ['Richard Jory', 'Justin Stanley'],
        'common.engineer'
      );
      assert.deepEqual(common.arrangers, isAsf ? undefined : ['David Campbell'], 'common.arranger');
      assert.deepEqual(
        common.mixers,
        isAsf ? ['Justin Stanley', 'Andy Brohard'] : ['Andy Brohard', 'Justin Stanley'],
        'common.mixer'
      );
      assert.strictEqual(common.releaseStatus, 'official', 'common.releasestatus');
      assert.deepEqual(
        common.releaseType,
        isAsf ? ['soundtrack', 'album'] : ['album', 'soundtrack'],
        'common.releasetype'
      );
      assert.strictEqual(common.script, 'Latn', 'common.script');
      assert.strictEqual(common.asin, 'B000649YAM', 'common.asin');

      assert.deepEqual(common.barcode, '602498644102', 'common.barcode');
      assert.deepEqual(common.isrcs, ['USUG10400421'], 'common.isrc');
      assert.deepEqual(
        common.labels,
        isAsf ? ['UMG Soundtracks', 'Hip‐O Records'] : ['Hip‐O Records', 'UMG Soundtracks'],
        'common.label'
      );
      assert.deepEqual(common.catalogNumber, ['B0003663-02'], 'common.catalognumber');
      assert.deepEqual(common.releaseCountry, 'US', 'common.releasecountry');
      assert.deepEqual(common.media, 'CD', 'common.media');
      assert.deepEqual(common.mbArtistId, ['4236acde-2ce2-441c-a3d4-38d55f1b5474'], 'MusicBrainz Artist Id');
      assert.deepEqual(common.mbRecordingId, '84851150-a196-48fa-ada5-1a012b1cd9ed', 'MusicBrainz Recording Id');
      assert.deepEqual(
        common.mbAlbumArtistId,
        ['4236acde-2ce2-441c-a3d4-38d55f1b5474'],
        'MusicBrainz Release Artist Id'
      );
      assert.deepEqual(common.mbReleaseGroupId, 'afe7c5d8-f8bc-32cf-b77d-8fb8561989a7', 'MusicBrainz Release Group Id');
      assert.deepEqual(common.mbReleaseId, '2644f258-0619-4beb-a150-0c0069ca6699', 'MusicBrainz Release Id');
      assert.deepEqual(common.mbReleaseTrackId, 'd87d56d0-9bd3-3199-8ff3-d03dff3abb13', 'MusicBrainz Track Id');
    }

    it('should expose all common tags from home_id3v2.4.mp3', async () => {
      const filename = 'picard/home_id3v2.4.mp3';
      const filePath = path.join(samplePath, filename);

      const metadata = await parseFile(filePath, { duration: true });
      const { common, format, quality } = metadata;

      assert.deepEqual(format.tagTypes, ['ID3v2.4', 'ID3v1'], 'format.tagTypes');
      assert.deepEqual(quality.warnings, [], 'quality.warnings');
      assert.deepEqual(format.duration, 0.7836734693877551, 'format.duration');

      checkHomeCommonMapping(common);
      // The current Picard save does not contain the extra tags from the old fixture.
      for (const field of [
        'genres',
        'composers',
        'performer:instrument',
        'averageLevel',
        'peakLevel',
        'picture'
      ] as const) {
        assert.isUndefined(common[field], `common.${field}`);
      }
    });

    // These conversions were tagged independently in Picard.
    const taggedFixtures: [string, TagType[], string][] = [
      // Despite its filename, Picard saved this fixture with ID3v2.4.
      ['home_id3v2.3.mp3', ['ID3v2.4', 'ID3v1'], 'MPEG'],
      ['home.mp3', ['ID3v2.4', 'ID3v1'], 'MPEG'],
      ['home_ape.aac', ['APEv2'], 'ADTS/MPEG-4'],
      ['home.flac', ['vorbis'], 'FLAC'],
      ['home.ogg', ['vorbis'], 'Ogg'],
      ['home.opus', ['vorbis'], 'Ogg'],
      ['home.ape', ['APEv2'], "Monkey's Audio"],
      ['home.wv', ['APEv2'], 'WavPack'],
      ['home.mpc', ['APEv2'], 'Musepack, SV8'],
      ['home.wav', ['ID3v2.4', 'exif'], 'WAVE'],
      ['home.m4a', ['iTunes'], 'M4A/isom/iso2'],
      ['home.alac.m4a', ['iTunes'], 'M4A/isom/iso2']
    ];

    for (const [filename, tagTypes, container] of taggedFixtures) {
      it(`should expose Picard tags through the common interface for ${filename}`, async () => {
        const { common, format, quality } = await parseFile(path.join(samplePath, 'picard', filename));

        assert.deepEqual(format.tagTypes, tagTypes, 'format.tagTypes');
        assert.strictEqual(format.container, container, 'format.container');
        assert.deepEqual(quality.warnings, [], 'quality.warnings');
        checkHomeCommonMapping(common);
      });
    }

    it('should expose Picard tags through the common interface for home.wma', async () => {
      const { common, format, quality } = await parseFile(path.join(samplePath, 'picard', 'home.wma'));

      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio V8', 'format.codec');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      assert.deepEqual(format.tagTypes, ['asf'], 'format.tagTypes');

      assert.deepEqual(quality.warnings, [], 'quality.warnings');
      checkHomeCommonMapping(common, 'asf');
    });
  });

  describe('Vorbis mappings', () => {
    it('should map FLAC/Vorbis', async () => {
      const filename = "flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac";

      function checkFormat(format) {
        assert.strictEqual(format.container, 'FLAC', 'format.container');
        assert.strictEqual(format.codec, 'FLAC', 'format.codec');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44100 samples/sec');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
      }

      // Parse flac/Vorbis file
      const metadata = await parseFile(path.join(samplePath, filename));
      assert.isDefined(metadata, 'should return metadata');

      checkFormat(metadata.format);

      checkCommonMapping('vorbis', metadata.common);
    });

    it('should map ogg/Vorbis', async () => {
      const filePath = path.join(samplePath, "ogg/MusicBrainz - Beth Hart - Sinner's Prayer.ogg");

      // Parse ogg/Vorbis file
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');

      // Check common mappings
      checkCommonMapping('vorbis', metadata.common);
    });
  });

  describe('APEv2 header', () => {
    it("should map Monkey's Audio / APEv2", async () => {
      const filePath = path.join(samplePath, "ape/MusicBrainz - Beth Hart - Sinner's Prayer.ape");

      function checkFormat(format) {
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');

      checkFormat(metadata.format);

      checkCommonMapping('APEv2', metadata.common);
    });

    it('should map WavPack / APEv2', async () => {
      const filePath = path.join(samplePath, 'wavpack', "MusicBrainz - Beth Hart - Sinner's Prayer.wv");

      function checkFormat(format) {
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2.123 seconds');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');

      checkFormat(metadata.format);

      checkCommonMapping('APEv2', metadata.common);
    });
  });

  describe('ID3v2.3 header', () => {
    it('MP3 / ID3v2.3', () => {
      const filePath = path.join(samplePath, "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3");

      function checkFormat(format) {
        assert.deepEqual(format.tagTypes, ['ID3v2.3'], 'format.tagTypes');
        assert.deepEqual(format.container, 'MPEG', 'format.container');
        assert.deepEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
        assert.strictEqual(format.codecProfile, 'V2', 'format.codecProfile');
        assert.strictEqual(format.tool, 'LAME 3.99r', 'format.tool');
      }

      // Run with default options
      return parseFile(filePath).then(metadata => {
        assert.isDefined(metadata, 'should return metadata');

        checkFormat(metadata.format);

        checkCommonMapping('ID3v2.3', metadata.common);
      });
    });

    /**
     * Historical fixture workaround for Picard issue PICARD-653.
     * This file has been fixed with Mp3Tag to have a valid ID3v2.3 tag
     */
    it('should map RIFF/WAVE/PCM / ID3v2.3', () => {
      const filePath = path.join(samplePath, "wav/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].wav");

      function checkFormat(format: IFormat) {
        assert.strictEqual(format.container, 'WAVE', 'format.container');
        assert.sameMembers(format.tagTypes, ['exif', 'ID3v2.3'], 'format.tagTypes)');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        assert.strictEqual(format.numberOfSamples, 93624, 'format.numberOfSamples = 88200');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = 2 seconds');
      }

      // Parse the fixture
      return parseFile(filePath).then(result => {
        // Check audio format
        checkFormat(result.format);

        checkCommonMapping('ID3v2.3', result.common);
      });
    });
  });

  describe('ID3v2.4 header', () => {
    it('should map MP3/ID3v2.4 header', async () => {
      const filePath = path.join(samplePath, "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3");

      function checkFormat(format: IFormat) {
        assert.deepEqual(format.tagTypes, ['ID3v2.4'], 'format.tagTypes');
        assert.strictEqual(format.container, 'MPEG', 'format.container');
        assert.strictEqual(format.codec, 'MPEG 1 Layer 3', 'format.codec');
        assert.strictEqual(format.codecProfile, 'V2', 'format.codecProfile = V2');
        assert.strictEqual(format.tool, 'LAME 3.99r', 'format.tool');
        assert.strictEqual(format.duration, 2.1681632653061222, 'format.duration');
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
      }

      // Run with default options
      const metadata = await parseFile(filePath);

      assert.isDefined(metadata, 'should return metadata');

      checkFormat(metadata.format);

      checkCommonMapping('ID3v2.4', metadata.common);
    });

    it('should parse AIFF/ID3v2.4 audio file', async () => {
      const filePath = path.join(samplePath, "aiff/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].aiff");

      function checkFormat(format: IFormat) {
        assert.strictEqual(format.container, 'AIFF', "format.container = 'AIFF'");
        assert.deepEqual(format.tagTypes, ['ID3v2.4'], "format.tagTypes = 'ID3v2.4'");
        assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
        assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample = 16 bits');
        assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels = 2 channels');
        assert.strictEqual(format.numberOfSamples, 93624, 'format.bitsPerSample = 93624');
        assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration = ~2.123');
      }

      // Parse the fixture
      const metadata = await parseFile(filePath);
      assert.isDefined(metadata, 'should return metadata');

      // Check audio format
      checkFormat(metadata.format);

      // Check common tag mappings
      checkCommonMapping('ID3v2.4', metadata.common);
    });
  });

  it('should map M4A / (Apple) iTunes header', async () => {
    const filePath = path.join(samplePath, "mp4/MusicBrainz - Beth Hart - Sinner's Prayer.m4a");

    function checkFormat(format: IFormat) {
      assert.deepEqual(format.tagTypes, ['iTunes'], 'format.tagTypes');
      assert.strictEqual(format.container, 'M4A/mp42/isom', 'format.container');
      assert.strictEqual(format.codec, 'ALAC', 'format.codec');
      assert.strictEqual(format.lossless, true, 'ALAC is a lossless format');
      assert.strictEqual(format.duration, 2.1229931972789116, 'format.duration');
      assert.strictEqual(format.sampleRate, 44100, 'format.sampleRate = 44.1 kHz');
      assert.strictEqual(format.bitsPerSample, 16, 'format.bitsPerSample');
      assert.strictEqual(format.numberOfChannels, 2, 'format.numberOfChannels');
    }

    function checkCommonTags(common) {
      assert.strictEqual(common.picture[0].format, 'image/jpeg', 'picture format');
      assert.strictEqual(common.picture[0].data.length, 98008, 'picture length');
    }

    // Run with default options
    const metadata = await parseFile(filePath);
    assert.isDefined(metadata, 'should return metadata');

    checkFormat(metadata.format);

    checkCommonTags(metadata.common);
    checkCommonMapping('iTunes', metadata.common);
  });

  it('should map WMA/ASF header', async () => {
    const filePath = path.join(samplePath, "asf/MusicBrainz - Beth Hart - Sinner's Prayer.wma");

    function checkFormat(format: IFormat) {
      assert.deepEqual(format.tagTypes, ['asf'], 'format.tagTypes = asf');
      assert.strictEqual(format.bitrate, 320000, 'format.bitrate = 320000');
      assert.strictEqual(format.container, 'ASF/audio', 'format.container');
      assert.strictEqual(format.codec, 'Windows Media Audio V8', 'format.codec');
      assert.approximately(format.duration, 2.135, 1 / 10000, 'format.duration');
      // TODO: ASF parsing does not expose sample rate, bit depth or channel count
      // for this fixture. Add assertions once those audio properties are available.
    }

    // Parse wma/asf file
    const metadata = await parseFile(filePath);

    assert.isDefined(metadata, 'should return metadata');

    // Check wma format
    checkFormat(metadata.format);

    // Check common tag mappings
    checkCommonMapping('asf', metadata.common);
  });

  /**
   * Picard's "Join ID3v23 tags with" setting is configurable; '/' is the choice
   * in this legacy fixture, not a separator required for every Picard file.
   * Returning separate common values is our compatibility contract for it.
   * The ID3v2.4 fixture instead uses native multi-value text frames.
   * https://picard-docs.musicbrainz.org/en/v2.13/config/options_tags_compatibility_id3.html
   */
  describe('Multi-value compatibility', () => {
    const expected: [keyof ICommonTagsResult, string[]][] = [
      // TXXX:Artists: https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#artists
      ['artists', ['Beth Hart', 'Joe Bonamassa']],
      // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#musicbrainz-artist-id
      ['mbArtistId', ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9']],
      // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#musicbrainz-release-artist-id
      ['mbAlbumArtistId', ['3fe817fc-966e-4ece-b00a-76be43e7e73c', '984f8239-8fe1-4683-9c54-10ffb14439e9']],
      // TSRC: https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#isrc
      ['isrcs', ['NLB931100460', 'USMH51100098']]
    ];

    for (const version of ['2.3', '2.4']) {
      describe(`ID3v${version}`, () => {
        let common: ICommonTagsResult;

        beforeAll(async () => {
          const filePath = path.join(
            samplePath,
            'mp3',
            `MusicBrainz - Beth Hart - Sinner's Prayer [id3v${version}].V2.mp3`
          );
          const metadata = await parseFile(filePath);
          assert.include(metadata.format.tagTypes, `ID3v${version}`);
          common = metadata.common;
        });

        for (const [field, values] of expected) {
          it(`should preserve separate ${field} values`, () => {
            assert.deepEqual(common[field], values);
          });
        }
      });
    }
  });

  describe('Contributor mappings to common metadata', () => {
    // Picard stores each contributor role independently. Check common output to catch lost role mappings.
    const credits: [keyof ICommonTagsResult, string[]][] = [
      // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#producers
      ['producers', ['Roy Weisman']],
      // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#engineer
      ['engineers', ['James McCullagh', 'Jared Kvitka']],
      // https://picard-docs.musicbrainz.org/en/v2.13/appendices/tag_mapping.html#arranger
      ['arrangers', ['Jeff Bova']],
      [
        'performer:instrument',
        [
          'Carmine Rojas (bass guitar)',
          'The Bovaland Orchestra (orchestra)',
          'Anton Fig (drums)',
          'Blondie Chaplin (guitar)',
          'Joe Bonamassa (guitar)',
          'Anton Fig (percussion)',
          'Arlan Schierbaum (keyboard)',
          'Beth Hart (vocals)',
          'Joe Bonamassa (vocals)',
          'Beth Hart (piano)'
        ]
      ]
    ];
    const fixtures = [
      ['ID3v2.3 / IPLS', "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.3].V2.mp3"],
      ['ID3v2.4 / TIPL', "mp3/MusicBrainz - Beth Hart - Sinner's Prayer [id3v2.4].V2.mp3"],
      ['FLAC / Vorbis', "flac/MusicBrainz - Beth Hart - Sinner's Prayer.flac"],
      ['Ogg / Vorbis', "ogg/MusicBrainz - Beth Hart - Sinner's Prayer.ogg"],
      ["Monkey's Audio / APEv2", "ape/MusicBrainz - Beth Hart - Sinner's Prayer.ape"],
      ['WavPack / APEv2', "wavpack/MusicBrainz - Beth Hart - Sinner's Prayer.wv"]
    ];

    for (const [format, filename] of fixtures) {
      describe(format, () => {
        let common: ICommonTagsResult;

        beforeAll(async () => {
          const metadata = await parseFile(path.join(samplePath, filename));
          common = metadata.common;
        });

        for (const [role, names] of credits) {
          it(`should map all ${role} credits without mixing roles`, () => {
            assert.deepEqual(common[role], names);
          });
        }

        it('writes contributor common values with the same result as Picard', async () => {
          const input = await readFile(path.join(samplePath, filename));
          const options = format.startsWith('ID3v2.3') ? { replaceId3: true } : {};
          const clear = Object.fromEntries(credits.map(([role]) => [role, null]));
          const cleared = await updateBuffer(input, clear, options);
          const empty = (await parseBuffer(cleared)).common;
          for (const [role] of credits) {
            assert.isUndefined(empty[role], `clear ${role}`);
          }
          const patch = Object.fromEntries(credits.map(([role]) => [role, common[role]]));
          const rewritten = (await parseBuffer(await updateBuffer(cleared, patch))).common;
          for (const [role, names] of credits) {
            assert.deepEqual(rewritten[role], names);
          }
        });
      });
    }
  });
});

describe('Writing common metadata from Picard fixtures', () => {
  for (const filename of [
    'home.mp3',
    'home_id3v2.3.mp3',
    'home_id3v2.4.mp3',
    'home.wav',
    'home.flac',
    'home.ogg',
    'home.opus',
    'home.ape',
    'home.wv',
    'home.mpc',
    'home.m4a',
    'home.alac.m4a',
    'home.wma',
    'home_ape.aac'
  ]) {
    it(`reproduces all Picard common values for ${filename}`, async () => {
      const input = await readFile(path.join(samplePath, 'picard', filename));
      const { common: expected } = await parseBuffer(input);
      const patch: TagPatch = { ...expected };

      // Change every stored value first: simply writing identical tags could
      // pass even if a writer ignored the patch and retained the old tags.
      const replacement = Object.fromEntries(
        Object.entries(patch).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? ['Regression replacement']
            : typeof value === 'object'
              ? { no: 99, of: 99 }
              : typeof value === 'number'
                ? 2001
                : key.toLowerCase().includes('date')
                  ? '2001-02-03'
                  : 'Regression replacement'
        ])
      );
      // Picard uses APEv2 for raw AAC; our AAC writer writes ID3v2.4. Transfer
      // to a clean AAC fixture so Picard's APEv2 tail cannot mask the result.
      const target = filename.endsWith('.aac') ? await readFile(path.join(samplePath, 'aac/adts-mpeg4.aac')) : input;
      const options = filename.endsWith('.mp3') ? { replaceId3: true } : {};
      const changed = await updateBuffer(target, replacement, options);
      const changedCommon = (await parseBuffer(changed)).common;
      for (const field of Object.keys(patch) as (keyof ICommonTagsResult)[]) {
        // year is derived from date and can also be supplied by a retained
        // secondary RIFF header. Check the stored date and final year instead.
        if (field !== 'year') {
          assert.notDeepEqual(changedCommon[field], expected[field], `actually writes ${field}`);
        }
      }
      const rewritten = await updateBuffer(changed, patch, options);
      const expectedWritten = { ...expected };
      // The ID3 and MP4 writers store album artists as display credits.
      if (/\.(mp3|wav|aac|m4a|alac)$/.test(filename) && expected.albumArtists?.length === 1) {
        delete expectedWritten.albumArtists;
      }
      // MP4 also represents the track artist list as display credits.
      if ((filename.endsWith('.m4a') || filename.endsWith('.alac')) && expected.artists?.length === 1) {
        delete expectedWritten.artists;
      }
      assert.deepEqual((await parseBuffer(rewritten)).common, expectedWritten);
    });
  }
});

// Feed Picard's storage representations into the parser/collector; assert only
// public common output, not native output or the mapper implementation tables.
describe('Additional Picard metadata through common', () => {
  const composerIds = ['af84b5c9-7ce4-4b86-9c5b-7f3f74b05349', '30a16c79-c396-4d2d-a061-bad32b5bac1d'];
  const originalArtistIds = ['4236acde-2ce2-441c-a3d4-38d55f1b5474', '984f8239-8fe1-4683-9c54-10ffb14439e9'];
  // Native names in column order: ID3, Vorbis, APEv2, MP4, ASF.
  const fields: {
    common: keyof ICommonTagsResult;
    value: string | string[];
    expected: unknown;
    tags: (string | null)[];
  }[] = [
    {
      common: 'mbComposerId',
      value: composerIds,
      expected: composerIds,
      tags: [
        'TXXX:MusicBrainz Composer Id',
        'MUSICBRAINZ_COMPOSERID',
        'Musicbrainz_Composerid',
        '----:com.apple.iTunes:MusicBrainz Composer Id',
        'MusicBrainz/Composer Id'
      ]
    },
    {
      common: 'mbOriginalArtistId',
      value: originalArtistIds,
      expected: originalArtistIds,
      tags: [
        'TXXX:MusicBrainz Original Artist Id',
        'MUSICBRAINZ_ORIGINALARTISTID',
        'Musicbrainz_Originalartistid',
        '----:com.apple.iTunes:MusicBrainz Original Artist Id',
        'MusicBrainz/Original Artist Id'
      ]
    },
    {
      common: 'mbOriginalReleaseId',
      value: '2644f258-0619-4beb-a150-0c0069ca6699',
      expected: '2644f258-0619-4beb-a150-0c0069ca6699',
      tags: [
        'TXXX:MusicBrainz Original Album Id',
        'MUSICBRAINZ_ORIGINALALBUMID',
        'Musicbrainz_Originalalbumid',
        '----:com.apple.iTunes:MusicBrainz Original Album Id',
        'MusicBrainz/Original Album Id'
      ]
    },
    {
      common: 'directors',
      value: ['Director A', 'Director B'],
      expected: ['Director A', 'Director B'],
      tags: ['TXXX:DIRECTOR', 'DIRECTOR', 'Director', '©dir', 'WM/Director']
    },
    {
      common: 'originalFilename',
      value: 'original track.wav',
      expected: 'original track.wav',
      tags: ['TOFN', 'ORIGINALFILENAME', 'Originalfilename', null, 'WM/OriginalFilename']
    },
    {
      common: 'itunesCddb1',
      value: 'CDDB data',
      expected: 'CDDB data',
      tags: ['TXXX:iTunes_CDDB_1', 'ITUNES_CDDB_1', 'itunes_cddb_1', '----:com.apple.iTunes:iTunes_CDDB_1', null]
    },
    {
      common: 'replayGainAlbumRange',
      value: '12.5 dB',
      expected: 12.5,
      tags: [
        'TXXX:REPLAYGAIN_ALBUM_RANGE',
        'REPLAYGAIN_ALBUM_RANGE',
        'REPLAYGAIN_ALBUM_RANGE',
        '----:com.apple.iTunes:REPLAYGAIN_ALBUM_RANGE',
        'REPLAYGAIN_ALBUM_RANGE'
      ]
    },
    {
      common: 'replayGainTrackRange',
      value: '8.25',
      expected: 8.25,
      tags: [
        'TXXX:REPLAYGAIN_TRACK_RANGE',
        'REPLAYGAIN_TRACK_RANGE',
        'REPLAYGAIN_TRACK_RANGE',
        '----:com.apple.iTunes:REPLAYGAIN_TRACK_RANGE',
        'REPLAYGAIN_TRACK_RANGE'
      ]
    },
    {
      common: 'replayGainReferenceLoudness',
      value: '89.0 dB',
      expected: 89,
      tags: [
        'TXXX:REPLAYGAIN_REFERENCE_LOUDNESS',
        'REPLAYGAIN_REFERENCE_LOUDNESS',
        'REPLAYGAIN_REFERENCE_LOUDNESS',
        '----:com.apple.iTunes:REPLAYGAIN_REFERENCE_LOUDNESS',
        'REPLAYGAIN_REFERENCE_LOUDNESS'
      ]
    }
  ];

  for (const [column, filename] of [
    [0, 'home.mp3'],
    [0, 'home.wav'],
    [1, 'home.flac'],
    [1, 'home.ogg'],
    [1, 'home.opus'],
    [2, 'home.ape'],
    [2, 'home.wv'],
    [2, 'home.mpc'],
    [3, 'home.m4a'],
    [3, 'home.alac.m4a'],
    [4, 'home.wma']
  ] as const) {
    describe(filename, () => {
      let common: ICommonTagsResult;
      let picardTagged: Uint8Array;
      beforeAll(async () => {
        const input = await readFile(path.join(samplePath, 'picard', filename));
        const tags = Object.fromEntries(
          fields.filter(field => field.tags[column]).map(field => [field.tags[column], field.value])
        );
        // Edit an in-memory copy only; never modify the Picard sample files.
        picardTagged = await updateBuffer(input, { native: tags });
        common = (await parseBuffer(picardTagged)).common;
      });
      for (const field of fields.filter(field => field.tags[column])) {
        it(`exposes ${field.common}`, () => {
          assert.deepEqual(common[field.common], field.expected);
        });
      }
      it('writes the common values back with the same result as Picard', async () => {
        const supported = fields.filter(field => field.tags[column]);
        const cleared = await updateBuffer(
          picardTagged,
          Object.fromEntries(supported.map(field => [field.common, null]))
        );
        const empty = (await parseBuffer(cleared)).common;
        for (const field of supported) {
          assert.isUndefined(empty[field.common], `clear ${field.common}`);
        }
        const patch = Object.fromEntries(supported.map(field => [field.common, common[field.common]]));
        const rewritten = (await parseBuffer(await updateBuffer(cleared, patch))).common;
        assert.deepEqual(rewritten, common);
      });
    });
  }

  for (const tagType of ['ID3v2.3', 'ID3v2.4'] as const) {
    it(`keeps production roles separate from instrument credits in ${tagType}`, async () => {
      const metadata = new MetadataCollector();
      if (tagType === 'ID3v2.3') {
        await metadata.addTag(tagType, 'IPLS', {
          producer: ['Producer'],
          guitar: ['Player', 'Player'],
          performer: ['Guest'],
          '': ['Soloist']
        });
      } else {
        await metadata.addTag(tagType, 'TIPL', { producer: ['Producer'], unknown: ['Not an instrument'] });
        await metadata.addTag(tagType, 'TMCL', { guitar: ['Player', 'Player'], performer: ['Guest'], '': ['Soloist'] });
      }
      assert.deepEqual(metadata.common.producers, ['Producer']);
      assert.deepEqual(metadata.common['performer:instrument'], ['Player (guitar)', 'Guest', 'Soloist']);
    });
  }

  for (const tagType of ['vorbis', 'APEv2'] as const) {
    for (const totalFirst of [true, false]) {
      it(`maps Picard movement names, numbers and totals in ${tagType}, total first: ${totalFirst}`, async () => {
        const metadata = new MetadataCollector();
        await metadata.addTag(tagType, 'MOVEMENTNAME', 'Allegro');
        for (const [key, value] of totalFirst
          ? [
              ['MOVEMENTTOTAL', '4'],
              ['MOVEMENT', '2']
            ]
          : [
              ['MOVEMENT', '2'],
              ['MOVEMENTTOTAL', '4']
            ]) {
          await metadata.addTag(tagType, key, value);
        }
        await metadata.addTag(tagType, 'SHOWMOVEMENT', '1');
        assert.strictEqual(metadata.common.movement, 'Allegro');
        assert.strictEqual(metadata.common.movementNumber, 2);
        assert.strictEqual(metadata.common.movementTotal, 4);
        assert.isTrue(metadata.common.showMovement);
      });
    }
  }

  it('retains legacy Vorbis movement aliases, preferring the explicit name in either order', async () => {
    for (const nameFirst of [true, false]) {
      const metadata = new MetadataCollector();
      if (nameFirst) {
        await metadata.addTag('vorbis', 'MOVEMENTNAME', '123');
      }
      await metadata.addTag('vorbis', 'MOVEMENT', 'Legacy name');
      await metadata.addTag('vorbis', 'MOVEMENTNUMBER', '2/4');
      if (!nameFirst) {
        await metadata.addTag('vorbis', 'MOVEMENTNAME', '123');
      }
      assert.strictEqual(metadata.common.movement, '123');
      assert.strictEqual(metadata.common.movementNumber, 2);
      assert.strictEqual(metadata.common.movementTotal, 4);
    }
  });

  for (const order of [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ]) {
    for (const legacyIndex of ['2', '2/6', '3/6']) {
      it(`prefers canonical movement over legacy index ${legacyIndex}: ${order}`, async () => {
        // A dedicated total takes precedence over either pair, in every position.
        for (const totalPosition of [-1, 0, 1, 2, 3]) {
          const metadata = new MetadataCollector();
          const tags = [
            ['MOVEMENTNAME', 'Allegro'],
            ['MOVEMENT', '2/4'],
            ['MOVEMENTNUMBER', legacyIndex]
          ];
          const ordered = order.map(index => tags[index]);
          if (totalPosition >= 0) {
            ordered.splice(totalPosition, 0, ['MOVEMENTTOTAL', '8']);
          }
          for (const [key, value] of ordered) {
            await metadata.addTag('vorbis', key, value);
          }
          assert.strictEqual(metadata.common.movement, 'Allegro');
          assert.strictEqual(metadata.common.movementNumber, 2);
          assert.strictEqual(metadata.common.movementTotal, totalPosition >= 0 ? 8 : 4);
        }
      });
    }
  }

  it('selects numeric and textual repeated Vorbis movements independently of tag order', async () => {
    const tags = [
      ['MOVEMENTNAME', 'Allegro'],
      ['MOVEMENT', '2/4'],
      ['MOVEMENT', 'Legacy title'],
      ['MOVEMENTNUMBER', '3/6']
    ];
    async function checkOrders(remaining: string[][], ordered: string[][] = []): Promise<void> {
      if (remaining.length === 0) {
        const metadata = new MetadataCollector();
        for (const [key, value] of ordered) {
          await metadata.addTag('vorbis', key, value);
        }
        assert.strictEqual(metadata.common.movement, 'Allegro');
        assert.strictEqual(metadata.common.movementNumber, 2);
        assert.strictEqual(metadata.common.movementTotal, 4);
        return;
      }
      for (let i = 0; i < remaining.length; i++) {
        await checkOrders(
          remaining.filter((_, index) => index !== i),
          [...ordered, remaining[i]]
        );
      }
    }
    await checkOrders(tags);
  });

  it('collects large repeated movement lists without rescanning preceding tags', async () => {
    const metadata = new MetadataCollector();
    for (let index = 1; index <= 50000; index++) {
      await metadata.addTag('vorbis', 'MOVEMENTNUMBER', String(index));
    }
    assert.isUndefined(metadata.common.movement);
    assert.strictEqual(metadata.common.movementNumber, 50000);
    assert.strictEqual(metadata.common.movementTotal, undefined);
  }, 10000);

  it('reads and edits a standalone numeric Picard movement as an index, not a name', async () => {
    const input = await readFile(path.join(samplePath, 'picard/home.flac'));
    const tagged = await updateBuffer(input, { native: { MOVEMENT: '2' } });
    const before = (await parseBuffer(tagged)).common;
    assert.isUndefined(before.movement);
    assert.strictEqual(before.movementNumber, 2);
    assert.strictEqual(before.movementTotal, undefined);
    const after = (await parseBuffer(await updateBuffer(tagged, { movementNumber: 3 }))).common;
    assert.isUndefined(after.movement);
    assert.strictEqual(after.movementNumber, 3);
    assert.strictEqual(after.movementTotal, undefined);
  });

  for (const name of ['1984', '1/4']) {
    for (const numberFirst of [false, true]) {
      it(`preserves numeric legacy Vorbis name ${name}, number first: ${numberFirst}`, async () => {
        const metadata = new MetadataCollector();
        const tags = [
          ['MOVEMENT', name],
          ['MOVEMENTNUMBER', '2']
        ];
        for (const [key, value] of numberFirst ? tags.reverse() : tags) {
          await metadata.addTag('vorbis', key, value);
        }
        assert.strictEqual(metadata.common.movement, name);
        assert.strictEqual(metadata.common.movementNumber, 2);
        assert.strictEqual(metadata.common.movementTotal, undefined);
      });
    }
  }

  for (const filename of ['home.flac', 'home.ogg', 'home.opus']) {
    for (const numberFirst of [false, true]) {
      for (const total of [undefined, '8']) {
        it(`preserves the canonical movement index on name edits in ${filename}, number first: ${numberFirst}, total: ${total}`, async () => {
          const input = await readFile(path.join(samplePath, 'picard', filename));
          const entries = [
            ['MOVEMENTNAME', 'Allegro'],
            ['MOVEMENT', '2/4'],
            ['MOVEMENTNUMBER', '3/6']
          ];
          const native = Object.fromEntries(numberFirst ? entries.reverse() : entries);
          if (total !== undefined) {
            native.MOVEMENTTOTAL = total;
          }
          const tagged = await updateBuffer(input, { native });
          const before = (await parseBuffer(tagged)).common;
          assert.strictEqual(before.movementNumber, 2);
          assert.strictEqual(before.movementTotal, total === undefined ? 4 : 8);
          const edited = await updateBuffer(tagged, { movement: 'Andante' });
          const { common } = await parseBuffer(edited);
          assert.strictEqual(common.movement, 'Andante');
          assert.strictEqual(common.movementNumber, before.movementNumber);
          assert.strictEqual(common.movementTotal, before.movementTotal);
        });
      }
    }

    for (const name of [undefined, 'Allegro']) {
      for (const legacy of [undefined, '3/6']) {
        for (const values of [
          ['2/4', 'Legacy title'],
          ['Legacy title', '2/4'],
          ['1/5', 'Legacy title', '2/4']
        ]) {
          it(`preserves repeated movement selection in ${filename}: ${name}, ${legacy}, ${values}`, async () => {
            const input = await readFile(path.join(samplePath, 'picard', filename));
            const tagged = await updateBuffer(input, {
              native: { MOVEMENT: values, MOVEMENTNAME: name ?? null, MOVEMENTNUMBER: legacy ?? null }
            });
            const index = name === undefined && legacy !== undefined ? { no: 3, of: 6 } : { no: 2, of: 4 };
            const before = (await parseBuffer(tagged)).common;
            assert.strictEqual(before.movement, name ?? 'Legacy title');
            assert.strictEqual(before.movementNumber, index.no);
            assert.strictEqual(before.movementTotal, index.of);
            const renamed = (await parseBuffer(await updateBuffer(tagged, { movement: 'Andante' }))).common;
            assert.strictEqual(renamed.movement, 'Andante');
            assert.strictEqual(renamed.movementNumber, index.no);
            assert.strictEqual(renamed.movementTotal, index.of);
            const changedTotal = (await parseBuffer(await updateBuffer(tagged, { movementTotal: 8 }))).common;
            assert.strictEqual(changedTotal.movement, before.movement);
            assert.strictEqual(changedTotal.movementNumber, index.no);
            assert.strictEqual(changedTotal.movementTotal, 8);
          });
        }
      }
    }

    it(`keeps the album display credit separate from its artist list in ${filename}`, async () => {
      const input = await readFile(path.join(samplePath, 'picard', filename));
      const tagged = await updateBuffer(input, {
        albumArtist: 'First & Second',
        albumArtists: ['First', 'Second']
      });
      const before = (await parseBuffer(tagged)).common;
      assert.strictEqual(before.albumArtist, 'First & Second');
      assert.deepEqual(before.albumArtists, ['First', 'Second']);
      const cleared = (
        await parseBuffer(
          await updateBuffer(tagged, {
            albumArtist: 'New display',
            albumArtists: null
          })
        )
      ).common;
      assert.strictEqual(cleared.albumArtist, 'New display');
      // A display credit does not imply a list of individual artists.
      assert.isUndefined(cleared.albumArtists);
      const pluralOnly = (
        await parseBuffer(
          await updateBuffer(tagged, {
            albumArtists: ['Third', 'Fourth']
          })
        )
      ).common;
      assert.strictEqual(pluralOnly.albumArtist, 'Third');
      assert.deepEqual(pluralOnly.albumArtists, ['Third', 'Fourth']);
    });

    it(`preserves numeric legacy movement names on index edits in ${filename}`, async () => {
      const input = await readFile(path.join(samplePath, 'picard', filename));
      const tagged = await updateBuffer(input, { native: { MOVEMENT: '1984', MOVEMENTNUMBER: '2/4' } });
      const edited = await updateBuffer(tagged, { movementNumber: 3 });
      const { common } = await parseBuffer(edited);
      assert.strictEqual(common.movement, '1984');
      assert.strictEqual(common.movementNumber, 3);
      assert.strictEqual(common.movementTotal, 4);
    });
  }

  for (const comment of [null, [{ text: 'Replacement' }]]) {
    it(`preserves CDDB metadata when ${comment === null ? 'clearing' : 'replacing'} ordinary comments`, async () => {
      const input = await readFile(path.join(samplePath, 'picard/home.mp3'));
      const cddb = { descriptor: 'iTunes_CDDB_1', language: 'eng', text: 'CDDB data' };
      const tagged = await updateBuffer(input, { native: { COMM: [cddb, { text: 'Old comment' }] } });
      const { common } = await parseBuffer(await updateBuffer(tagged, { comments: comment }));
      assert.strictEqual(common.itunesCddb1, 'CDDB data');
      assert.includeDeepMembers(common.comments, [cddb]);
      assert.isFalse(common.comments?.some(value => value.text === 'Old comment'));
      assert.strictEqual(common.comments?.length, comment === null ? 1 : 2);
    });
  }

  it('maps APEv2 key and original artist, and the ID3 license alias', async () => {
    const ape = new MetadataCollector();
    await ape.addTag('APEv2', 'Key', 'C#m');
    await ape.addTag('APEv2', 'Original Artist', 'Original Artist');
    assert.strictEqual(ape.common.key, 'C#m');
    assert.strictEqual(ape.common.originalArtist, 'Original Artist');
    const id3 = new MetadataCollector();
    await id3.addTag('ID3v2.4', 'TXXX:LICENSE', 'CC BY 4.0');
    assert.strictEqual(id3.common.license, 'CC BY 4.0');
  });

  it('reads Picard CDDB comments and keeps ordinary comments', async () => {
    const input = await readFile(path.join(samplePath, 'picard/home.mp3'));
    const output = await updateBuffer(input, {
      native: {
        COMM: [
          { descriptor: 'iTunes_CDDB_1', language: 'eng', text: 'CDDB data' },
          { descriptor: '', language: 'eng', text: 'A comment' }
        ]
      }
    });
    const { common } = await parseBuffer(output);
    assert.strictEqual(common.itunesCddb1, 'CDDB data');
    assert.includeDeepMembers(common.comments, [{ descriptor: '', language: 'eng', text: 'A comment' }]);
    const rewritten = await updateBuffer(output, { itunesCddb1: common.itunesCddb1, comments: common.comments });
    assert.deepEqual((await parseBuffer(rewritten)).common, common);
  });

  for (const [tagType, key] of [
    ['vorbis', 'FINGERPRINT'],
    ['iTunes', '----:com.apple.iTunes:fingerprint']
  ] as const) {
    it(`removes the MusicMagic wrapper from ${tagType} fingerprints`, async () => {
      const metadata = new MetadataCollector();
      await metadata.addTag(tagType, key, 'MusicMagic Fingerprintabc123');
      assert.strictEqual(metadata.common.musicIpFingerprint, 'abc123');
    });
  }

  it('does not mistake another Vorbis fingerprint scheme for MusicIP', async () => {
    const metadata = new MetadataCollector();
    await metadata.addTag('vorbis', 'FINGERPRINT', 'Other fingerprint');
    assert.isUndefined(metadata.common.musicIpFingerprint);
  });

  it('exposes ASF synchronized lyric text through common lyrics', async () => {
    const input = await readFile(path.join(samplePath, 'picard/home.wma'));
    const output = await updateBuffer(input, {
      native: { 'WM/Lyrics_Synchronised': '[00:01.25]First line\n[00:02.00]Second line' }
    });
    const { common } = await parseBuffer(output);
    assert.deepEqual(common.lyrics[0].syncText, [
      { timestamp: 1250, text: 'First line' },
      { timestamp: 2000, text: 'Second line' }
    ]);
  });

  for (const field of fields.filter(field => field.common.startsWith('replayGain'))) {
    for (const [column, tagType] of [
      [0, 'ID3v2.4'],
      [1, 'vorbis'],
      [2, 'APEv2'],
      [3, 'iTunes'],
      [4, 'asf']
    ] as const) {
      it(`rejects invalid ${field.common} in ${tagType} without replacing a valid value`, async () => {
        const metadata = new MetadataCollector();
        await metadata.addTag(tagType, field.tags[column], field.value);
        for (const invalid of ['', 'NaN', 'Infinity', '1e999', '8 garbage', '8 dB junk']) {
          await metadata.addTag(tagType, field.tags[column], invalid);
        }
        assert.strictEqual(metadata.common[field.common], field.expected);
        assert.lengthOf(metadata.quality.warnings, 6);
      });
    }
  }
  for (const filename of ['home.flac', 'home.ogg', 'home.opus', 'home.ape', 'home.wv', 'home.mpc']) {
    it(`edits and clears Picard movements via common in ${filename}`, async () => {
      const input = await readFile(path.join(samplePath, 'picard', filename));
      const tagged = await updateBuffer(input, {
        native: { MOVEMENTNAME: 'Allegro', MOVEMENT: '2', MOVEMENTTOTAL: '4' }
      });
      const edited = await updateBuffer(tagged, { movement: 'Andante', movementNumber: 3 });
      const common = (await parseBuffer(edited)).common;
      assert.strictEqual(common.movement, 'Andante');
      assert.strictEqual(common.movementNumber, 3);
      assert.strictEqual(common.movementTotal, 4);
      const cleared = (
        await parseBuffer(await updateBuffer(edited, { movement: null, movementNumber: null, movementTotal: null }))
      ).common;
      assert.isUndefined(cleared.movement);
      assert.strictEqual(cleared.movementNumber, undefined);
      assert.strictEqual(cleared.movementTotal, undefined);
    });
  }

  it('edits and clears CDDB comments via common without losing ordinary comments', async () => {
    const input = await readFile(path.join(samplePath, 'picard/home.mp3'));
    const ordinary = { descriptor: '', language: 'eng', text: 'Keep me' };
    const tagged = await updateBuffer(input, {
      native: { COMM: [{ descriptor: 'iTunes_CDDB_1', language: 'eng', text: 'Old CDDB' }, ordinary] }
    });
    const edited = await updateBuffer(tagged, { itunesCddb1: 'New CDDB' });
    assert.strictEqual((await parseBuffer(edited)).common.itunesCddb1, 'New CDDB');
    const cleared = (await parseBuffer(await updateBuffer(edited, { itunesCddb1: null }))).common;
    assert.isUndefined(cleared.itunesCddb1);
    assert.deepEqual(cleared.comments, [ordinary]);
  });

  it('decodes slash-separated composer and original artist MBIDs in ID3v2.3', async () => {
    const source = await readFile(path.join(samplePath, 'picard/home.mp3'));
    const sourceSize = source.subarray(6, 10).reduce((size, byte) => (size << 7) | byte, 0);
    const frames = [
      ['MusicBrainz Composer Id', composerIds],
      ['MusicBrainz Original Artist Id', originalArtistIds]
    ] as const;
    const body = Buffer.concat(
      frames.map(([description, ids]) => {
        const text = Buffer.from(`\0${description}\0${ids.join('/')}`);
        const header = Buffer.alloc(10);
        header.write('TXXX');
        header.writeUInt32BE(text.length, 4);
        return Buffer.concat([header, text]);
      })
    );
    const header = Buffer.from([73, 68, 51, 3, 0, 0, 0, 0, body.length >> 7, body.length & 127]);
    const { common } = await parseBuffer(Buffer.concat([header, body, source.subarray(10 + sourceSize)]));
    assert.deepEqual(common.mbComposerId, composerIds);
    assert.deepEqual(common.mbOriginalArtistId, originalArtistIds);
  });

  it('does not treat binary ASF synchronized lyrics as common lyric objects', async () => {
    const metadata = new MetadataCollector();
    await metadata.addTag('asf', 'WM/Lyrics_Synchronised', new Uint8Array([1, 2, 3]));
    assert.isUndefined(metadata.common.lyrics);
    assert.lengthOf(metadata.quality.warnings, 1);
  });

  it('accepts loudness units but rejects negative ranges', async () => {
    const metadata = new MetadataCollector();
    await metadata.addTag('vorbis', 'REPLAYGAIN_TRACK_RANGE', '8.25 LU');
    await metadata.addTag('vorbis', 'REPLAYGAIN_TRACK_RANGE', '-1 dB');
    await metadata.addTag('vorbis', 'REPLAYGAIN_ALBUM_RANGE', '0 dB');
    await metadata.addTag('vorbis', 'REPLAYGAIN_REFERENCE_LOUDNESS', '-18 dB');
    assert.strictEqual(metadata.common.replayGainTrackRange, 8.25);
    assert.strictEqual(metadata.common.replayGainAlbumRange, 0);
    assert.strictEqual(metadata.common.replayGainReferenceLoudness, -18);
  });
});
