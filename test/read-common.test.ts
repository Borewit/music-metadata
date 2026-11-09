import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fromBuffer } from 'strtok3';
import { assert, expect, expectTypeOf } from 'vitest';
import { CaseInsensitiveTagMap } from '../lib/common/CaseInsensitiveTagMap.js';
import { CombinedTagMapper } from '../lib/common/CombinedTagMapper.js';
import { CommonTagMapper } from '../lib/common/GenericTagMapper.js';
import { commonTagsKeys, isSingleton, type TagType } from '../lib/common/GenericTagTypes.js';
import { joinArtists, MetadataCollector } from '../lib/common/MetadataCollector.js';
import * as mm from '../lib/index.js';
import { parseHttpContentType } from '../lib/ParserFactory.js';

import { samplePath } from './helpers/util.js';

describe('GenericTagMap', () => {
  const combinedTagMapper = new CombinedTagMapper();

  describe('optional native tag lookups', () => {
    const warnings = { addWarning: () => assert.fail('Tag lookup should not emit warnings') };
    for (const Mapper of [CommonTagMapper, CaseInsensitiveTagMap]) {
      describe(Mapper.name, () => {
        for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf', 'unknown']) {
          it(`does not map the unconfigured key ${id}`, () => {
            const mapper = new Mapper(['CAF'], { title: 'title' });
            assert.isNull(mapper.mapGenericTag({ id, value: 'Value' }, warnings));
          });
        }

        for (const id of ['constructor', 'toString', '__proto__']) {
          it(`honors an explicitly configured own key ${id}`, () => {
            const mapper = new Mapper(['CAF'], { [id]: 'title' });
            assert.deepEqual(mapper.mapGenericTag({ id, value: 'Title' }, warnings), { id: 'title', value: 'Title' });
          });
        }

        it('ignores aliases inherited from the mapping object prototype', () => {
          const map = Object.assign(Object.create({ inherited: 'album' }), { title: 'title' });
          const mapper = new Mapper(['CAF'], map);
          assert.isNull(mapper.mapGenericTag({ id: 'inherited', value: 'Ignored' }, warnings));
          assert.deepEqual(mapper.mapGenericTag({ id: 'title', value: 'Title' }, warnings), {
            id: 'title',
            value: 'Title'
          });
        });
      });
    }

    it('retains case-insensitive matching', () => {
      const mapper = new CaseInsensitiveTagMap(['CAF'], { title: 'title' });
      assert.deepEqual(mapper.mapGenericTag({ id: 'TiTlE', value: 'Title' }, warnings), {
        id: 'title',
        value: 'Title'
      });
    });
  });

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

describe('typed native formats from playable fixtures', () => {
  const fixtures: { file: string; format: TagType; id: string; value: unknown }[] = [
    { file: 'flac.flac', format: 'vorbis', id: 'TITLE', value: 'Brian Eno' },
    { file: 'monkeysaudio.ape', format: 'APEv2', id: 'Artist', value: 'Audioslave' },
    { file: 'asf/compilation-bool.wma', format: 'asf', id: 'WM/IsCompilation', value: true },
    { file: 'mp4/id4.m4a', format: 'iTunes', id: 'tmpo', value: 0 },
    { file: 'riff_adobe_audition.wav', format: 'exif', id: 'IART', value: 'Wolfgang Amadeus Mozart' },
    {
      file: 'matroska/02 - Poxfil - Solid Ground (5 sec).mka',
      format: 'matroska',
      id: 'track:ARTIST',
      value: 'Poxfil'
    },
    { file: 'aiff/M1F1-AlawC-AFsp.aif', format: 'AIFF', id: 'ANNO', value: 'AFspdate: 2003-01-30 03:28:34 UTC' },
    { file: 'caf/chan-descriptions.caf', format: 'CAF', id: 'channelLayoutBitmap', value: 63 }
  ];
  for (const { file, format, id, value } of fixtures) {
    it(`preserves ${format} values from ${file}`, async () => {
      const metadata = await mm.parseFile(path.join(samplePath, file));
      assert.isDefined(metadata.native[format]);
      const ordered = metadata.nativeTyped[format];
      assert.isDefined(ordered);
      assert.deepEqual(ordered, mm.orderTags(metadata.native[format]));
      assert.isDefined(ordered[id]);
      assert.deepEqual(ordered[id][0], value);
    });
  }
});

describe('nativeTyped dictionary view', () => {
  it('is always present, including before any tags are collected', () => {
    const collector = new MetadataCollector();
    const metadata = collector.toCommonMetadata();
    expectTypeOf(metadata.nativeTyped).toEqualTypeOf<mm.ITypedNativeTags>();
    expectTypeOf(metadata.nativeTyped.vorbis).toEqualTypeOf<
      mm.ITypedNativeTagDict<mm.IVorbisNativeTagMap> | undefined
    >();
    assert.isFunction(Object.getOwnPropertyDescriptor(metadata, 'nativeTyped')?.get);
    assert.deepEqual(Object.keys(metadata.nativeTyped), []);
    assert.isUndefined(metadata.nativeTyped.vorbis);
    assert.isUndefined(metadata.nativeTyped.Custom);
    assert.deepEqual(Object.keys(collector.nativeTyped), []);
  });

  it('preserves unrestricted raw lists, custom keys, duplicate order and value ownership', async () => {
    const collector = new MetadataCollector();
    const metadata = collector.toCommonMetadata();
    const picture: mm.IPicture = { format: 'image/png', data: new Uint8Array([1, 2]) };
    await collector.addTag('vorbis', 'TITLE', 'First');
    await collector.addTag('vorbis', 'MY_CUSTOM_TAG', 'Custom');
    await collector.addTag('vorbis', 'TITLE', 'Second');
    await collector.addTag('ID3v2.4', 'APIC', picture);
    const rawCustom = metadata.native.vorbis.find(tag => tag.id === 'MY_CUSTOM_TAG');
    expectTypeOf(rawCustom).toEqualTypeOf<mm.ITag | undefined>();
    expectTypeOf(metadata.native.vorbis[0].id).toEqualTypeOf<string>();
    expectTypeOf(metadata.native.vorbis[0].value).toEqualTypeOf<unknown>();
    assert.strictEqual(rawCustom?.value, 'Custom');
    const view = metadata.nativeTyped;
    expectTypeOf(view.vorbis?.TITLE).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(view.vorbis?.MY_CUSTOM_TAG).toEqualTypeOf<unknown[] | undefined>();
    expectTypeOf(view['ID3v2.4']?.APIC).toEqualTypeOf<mm.IPicture[] | undefined>();
    expectTypeOf(view['ID3v2.4']?.['TXXX:custom']).toEqualTypeOf<string[] | undefined>();
    assert.deepEqual(view.vorbis?.TITLE, ['First', 'Second']);
    assert.deepEqual(view.vorbis?.MY_CUSTOM_TAG, ['Custom']);
    assert.isUndefined(view.vorbis?.MISSING);
    assert.strictEqual(view['ID3v2.4']?.APIC?.[0], picture);
    assert.strictEqual(view['ID3v2.4']?.APIC?.[0].data, picture.data);
    assert.strictEqual(metadata.native.vorbis, collector.native.vorbis);
  });

  it('builds fresh snapshots after additions, edits and replacement of raw lists', async () => {
    const collector = new MetadataCollector();
    const metadata = collector.toCommonMetadata();
    await collector.addTag('vorbis', 'TITLE', 'First');
    const first = metadata.nativeTyped;
    await collector.addTag('vorbis', 'TITLE', 'Second');
    assert.deepEqual(first.vorbis?.TITLE, ['First']);
    assert.deepEqual(metadata.nativeTyped.vorbis?.TITLE, ['First', 'Second']);
    metadata.native.vorbis[0].value = 'Edited';
    assert.deepEqual(metadata.nativeTyped.vorbis?.TITLE, ['Edited', 'Second']);
    first.vorbis!.TITLE!.push('View only');
    assert.lengthOf(metadata.native.vorbis, 2);
    metadata.native = { vorbis: [{ id: 'TITLE', value: 'Replacement' }] };
    assert.deepEqual(metadata.nativeTyped.vorbis?.TITLE, ['Replacement']);
    assert.notStrictEqual(metadata.nativeTyped, metadata.nativeTyped);
  });

  it('exposes the current typed view to observers without caching partial results', async () => {
    const seen: (string[] | undefined)[] = [];
    const collector = new MetadataCollector({
      observer: ({ metadata }) => {
        seen.push(metadata.nativeTyped.vorbis?.ARTIST);
      }
    });
    collector.setFormat('container', 'Ogg');
    await collector.addTag('vorbis', 'ARTIST', 'First');
    await collector.addTag('vorbis', 'ARTIST', 'Second');
    assert.isUndefined(seen[0]);
    assert.deepEqual(seen[1], ['First']);
    assert.deepEqual(seen.at(-1), ['First', 'Second']);
    assert.deepEqual(collector.toCommonMetadata().nativeTyped.vorbis?.ARTIST, ['First', 'Second']);
  });

  it('uses null-prototype dictionaries for arbitrary format and identifier names', () => {
    const collector = new MetadataCollector();
    const ids = ['__proto__', 'constructor', 'toString'];
    for (const format of ['vorbis', ...ids]) {
      Object.defineProperty(collector.native, format, {
        enumerable: true,
        value: ids.flatMap(id => [
          { id, value: 'First' },
          { id, value: 'Second' }
        ])
      });
    }
    const view = collector.toCommonMetadata().nativeTyped;
    assert.isNull(Object.getPrototypeOf(view));
    for (const format of Object.keys(collector.native)) {
      assert.isNull(Object.getPrototypeOf(view[format]));
      for (const id of ids) {
        assert.deepEqual(view[format]?.[id], ['First', 'Second']);
      }
    }
  });

  it('returns the typed view from buffer, stream, web stream, blob and tokenizer parsing', async () => {
    const data = await readFile(path.join(samplePath, 'flac.flac'));
    const results = [
      await mm.parseBuffer(data),
      await mm.parseStream(Readable.from([data], { objectMode: false })),
      await mm.parseWebStream(Readable.toWeb(Readable.from([data], { objectMode: false }))),
      await mm.parseBlob(new Blob([data])),
      await mm.parseFromTokenizer(fromBuffer(data))
    ];
    for (const metadata of results) {
      assert.deepEqual(metadata.nativeTyped.vorbis?.TITLE, ['Brian Eno']);
      assert.deepEqual(metadata.nativeTyped.vorbis, mm.orderTags(metadata.native.vorbis));
    }
  });
});

describe('function orderTags()', () => {
  it('preserves typed ID3 values and narrows tags by identifier', () => {
    const picture: mm.IPicture = { format: 'image/png', data: new Uint8Array([1]) };
    const native: mm.INativeTag<mm.IID3v24NativeTagMap>[] = [
      { id: 'TIT2', value: 'Example' },
      { id: 'APIC', value: picture },
      { id: 'TXXX', value: 'No descriptor' },
      { id: 'TXXX:custom', value: 'Custom value' },
      { id: 'POPM', value: { email: 'owner', rating: 128 } }
    ];
    const tags = mm.orderTags(native);
    expectTypeOf(tags.TIT2).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(tags.APIC).toEqualTypeOf<mm.IPicture[] | undefined>();
    expectTypeOf(tags['TXXX:custom']).toEqualTypeOf<string[] | undefined>();
    expectTypeOf<{ id: 'TIT2'; value: number }>().not.toMatchTypeOf<mm.INativeTag<mm.IID3v24NativeTagMap>>();
    assert.deepEqual(tags.TIT2, ['Example']);
    assert.deepEqual(tags.APIC, [picture]);
    assert.deepEqual(tags.TXXX, ['No descriptor']);
    assert.deepEqual(tags['TXXX:custom'], ['Custom value']);

    for (const tag of native) {
      if (tag.id === 'TIT2') {
        expectTypeOf(tag.value).toEqualTypeOf<string>();
        assert.strictEqual(tag.value.toUpperCase(), 'EXAMPLE');
      } else if (tag.id === 'APIC') {
        expectTypeOf(tag.value).toEqualTypeOf<mm.IPicture>();
        assert.strictEqual(tag.value, picture);
      } else if (tag.id === 'POPM') {
        expectTypeOf(tag.value.counter).toEqualTypeOf<number | undefined>();
        assert.isUndefined(tag.value.counter);
      }
    }
  });

  it('types every supported native format and combines cross-format identifier collisions', () => {
    expectTypeOf<keyof mm.INativeTagTypeMap>().toEqualTypeOf<TagType>();
    const picture: mm.IPicture = { format: 'image/png', data: new Uint8Array([1]) };
    const apePicture: mm.IAPEv2Picture = { description: 'Front', data: picture.data };
    const collector = new MetadataCollector();
    Object.assign(collector.native, {
      vorbis: [{ id: 'TITLE', value: 'Example' }],
      APEv2: [{ id: 'Cover Art (Front)', value: apePicture }],
      asf: [{ id: 'WM/IsCompilation', value: true }],
      iTunes: [{ id: 'covr', value: picture }],
      exif: [
        { id: 'COMM', value: 'RIFF comment' },
        { id: 'bext.version', value: 2 }
      ],
      matroska: [{ id: 'track:TITLE', value: new Uint8Array([2]) }],
      AIFF: [{ id: 'NAME', value: 'Example' }],
      CAF: [{ id: 'channelLayoutDescriptions', value: [{ channelLabel: 1, channelFlags: 0, coordinates: [0, 0, 0] }] }]
    });
    const typed = collector.toCommonMetadata().nativeTyped;
    const vorbis = typed.vorbis!;
    const ape = typed.APEv2!;
    const asf = typed.asf!;
    const iTunes = typed.iTunes!;
    const riff = typed.exif!;
    const matroska = typed.matroska!;
    const aiff = typed.AIFF!;
    const caf = typed.CAF!;
    expectTypeOf(vorbis.TITLE).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(vorbis.METADATA_BLOCK_PICTURE).toEqualTypeOf<
      mm.IVorbisNativeTagMap['METADATA_BLOCK_PICTURE'][] | undefined
    >();
    expectTypeOf(ape['Cover Art (Front)']).toEqualTypeOf<(string | mm.IAPEv2Picture)[] | undefined>();
    expectTypeOf(asf['WM/IsCompilation']).toEqualTypeOf<
      (string | number | bigint | boolean | Uint8Array)[] | undefined
    >();
    expectTypeOf(iTunes.covr).toEqualTypeOf<(string | number | mm.IPicture)[] | undefined>();
    expectTypeOf(riff.COMM).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(riff['bext.version']).toEqualTypeOf<number[] | undefined>();
    expectTypeOf(riff['bext.umid']).toEqualTypeOf<(Uint8Array | undefined)[] | undefined>();
    expectTypeOf(matroska['track:TITLE']).toEqualTypeOf<(string | Uint8Array)[] | undefined>();
    expectTypeOf(aiff.NAME).toEqualTypeOf<string[] | undefined>();
    expectTypeOf(caf.channelLayoutDescriptions).toEqualTypeOf<
      mm.ICafNativeTagMap['channelLayoutDescriptions'][] | undefined
    >();
    expectTypeOf<mm.INativeTagValueMap['COMM']>().toEqualTypeOf<string | mm.IID3v23NativeTagMap['COMM']>();
    expectTypeOf<{ id: 'TITLE'; value: number }>().not.toMatchTypeOf<mm.INativeTag<mm.IVorbisNativeTagMap>>();
    expectTypeOf(vorbis.CUSTOM).toEqualTypeOf<unknown[] | undefined>();
    expectTypeOf(iTunes['mdta:custom']).toEqualTypeOf<unknown[] | undefined>();
    assert.deepEqual(vorbis.TITLE, ['Example']);
    assert.deepEqual(ape['Cover Art (Front)'], [apePicture]);
    assert.deepEqual(asf['WM/IsCompilation'], [true]);
    assert.deepEqual(iTunes.covr, [picture]);
    assert.deepEqual(riff.COMM, ['RIFF comment']);
    assert.deepEqual(riff['bext.version'], [2]);
    assert.deepEqual(matroska['track:TITLE'], [new Uint8Array([2])]);
    assert.deepEqual(aiff.NAME, ['Example']);
    assert.isDefined(caf.channelLayoutDescriptions);
    assert.deepEqual(caf.channelLayoutDescriptions[0], [{ channelLabel: 1, channelFlags: 0, coordinates: [0, 0, 0] }]);
  });

  it('does not infer ID3 types from an untyped or different-format list', () => {
    const native: mm.ITag[] = [{ id: 'TIT2', value: 42 }];
    const tags = mm.orderTags(native);
    expectTypeOf(tags.TIT2).toEqualTypeOf<unknown[]>();
    expectTypeOf<mm.INativeTagDict['TIT2']>().toEqualTypeOf<unknown[]>();
    assert.deepEqual(tags.TIT2, [42]);
  });

  it('supports custom tag maps without requiring the built-in formats', () => {
    type CustomMap = { CUSTOM: { count: number } };
    type CustomTypes = { Custom: CustomMap };
    const native: mm.INativeTag<CustomMap>[] = [{ id: 'CUSTOM', value: { count: 7 } }];
    const tags = mm.orderTags(native);
    const typed: mm.ITypedNativeTags<CustomTypes> = {
      Custom: tags,
      Unmapped: { unknown: [true] }
    };
    expectTypeOf(tags.CUSTOM).toEqualTypeOf<{ count: number }[] | undefined>();
    expectTypeOf<mm.IAudioMetadata<CustomTypes>['native']>().toEqualTypeOf<mm.INativeTags>();
    expectTypeOf<mm.IAudioMetadata<CustomTypes>['nativeTyped']>().toEqualTypeOf<mm.ITypedNativeTags<CustomTypes>>();
    expectTypeOf(typed.Custom?.CUSTOM).toEqualTypeOf<{ count: number }[] | undefined>();
    expectTypeOf(typed.Unmapped?.unknown).toEqualTypeOf<unknown[] | undefined>();
    assert.deepEqual(typed.Custom?.CUSTOM, [{ count: 7 }]);
    assert.deepEqual(typed.Unmapped?.unknown, [true]);
  });

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
