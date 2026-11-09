# Architecture

A contributor overview of how music-metadata reads media, maps metadata, and writes metadata. For the public API, see the [README](../README.md).

## Entry points

| Export condition (`package.json`) | File | Functions |
|---|---|---|
| `node` | `lib/index.ts` | `parseFile`, `parseStream` (Node streams and files, via `strtok3` `fromFile`/`fromStream`). Also exports `updateFile`, `updateBuffer` from the writer. Re-exports everything from `core.ts`. |
| `default` (browsers, other runtimes) | `lib/core.ts` | `parseBuffer`, `parseBlob`, `parseWebStream`, `parseFromTokenizer`, plus helpers `orderTags`, `ratingToStars`, `selectCover`, `getSupportedMimeTypes`. Re-exports `updateBuffer` (Blob/Uint8Array) from `lib/write/browser.ts`. Its `parseFile`/`parseStream` stubs always throw. |

The input adapters build a `strtok3` tokenizer using `getTokenizerOptions` in [Allocation.ts](../lib/common/Allocation.ts). `parseBuffer`, `parseBlob`, `parseWebStream` and `parseStream` pass it to `parseFromTokenizer`, which delegates to `ParserFactory.parse()`. `parseFile` calls the factory directly, passing a loader if its extension is recognized.

`parseFromTokenizer` accepts a caller-supplied tokenizer. The caller owns its configuration and lifecycle: `maxMemoryAllocation` still bounds parser-owned buffers, but does not set that tokenizer's `maxBufferSize`. File and stream adapters close the tokenizers they create in `finally` blocks.

## Writer architecture (`lib/write/`)

The writing capability is implemented in `lib/write/` and exposes `updateFile` (Node.js) and `updateBuffer` (Node.js and browser) through the package root entry points.

### Core writer modules (`lib/write/core/`)

| Module | Purpose |
|---|---|
| `types.ts` | Patch types (`TagPatch`, `Picture`, `LyricsEntry`, `Comment`, etc.) aligned with `ICommonTagsResult` for round-trip compatibility. |
| `detect.ts` | `detectFormat` — identifies container (FLAC, MP3/ID3, WAV, MP4, Ogg) from a `ByteSource`. |
| `source.ts` / `source.browser.ts` | `ByteSource` abstraction and `openSource` for random-access reading (file/buffer in Node, Blob/buffer in browser). |
| `writer.ts` / `writer.browser.ts` | `writeChunks` (file/atomic) and `writeBuffer` (in-memory assembly). |
| `patch.ts` | Validation helpers: `validatePictures`, `normalizeComments`, `textValues`, `normalizeNumberPair`. |
| `bytes.ts` | Low-level read/write utilities: `readUInt*`, `encodeUtf8`, `decodeUtf8`, `concatBytes`, `ensureAvailable`. |
| `lyrics.ts` | `normalizeLyrics`, `lyricsText` — cross-format lyrics normalization. |
| `errors.ts` | Writer-specific errors: `InvalidPatchError`, `UnsupportedFormatError`, `UnsupportedFeatureError`, `WriteError`. |
| `shared.ts` | Shared format dispatch (`buildStreamedUpdate`) and validation (`assertPatch`, `assertSupported`) used by both Node and browser entry points. |

### Format writers

| Format | Entry | Notes |
|---|---|---|
| FLAC | `lib/write/flac/flac.ts` | Rewrites METADATA_BLOCK_PICTURE, VORBIS_COMMENT, PADDING blocks; preserves audio. |
| MP3/ID3v2.4 | `lib/write/id3v2/id3v2.ts` | Replaces leading ID3v2 tag, optionally trailing ID3v1; frames via `frames.ts`. |
| WAV | `lib/write/wav/wav.ts` | Chunk-based rebuild; handles INFO, ID3, LIST chunks. |
| MP4 | `lib/write/mp4/mp4.ts` | Box-based rebuild; tags via `tags.ts`, atoms via `atoms.ts`. |
| Ogg Vorbis/Opus | `lib/write/ogg/ogg.ts` | Page-based rebuild; Vorbis comments via `vorbis/comment.ts`. |

### Common mapping (`lib/write/mapping/`)

- `common.ts` — `COMMON_FIELDS` maps common tag names to native IDs for ID3 and Vorbis; `normalizeCommonPatch` handles aliases (e.g., `year` → `date`, `totaltracks` → `track.of`), ReplayGain structuring, and extra fields.
- `id3v2.ts` — Applies common patch to ID3 frames (text, APIC, USLT/SYLT, POPM, TXXX, etc.).
- `vorbis.ts` — Applies common patch to Vorbis comment fields (including `METADATA_BLOCK_PICTURE` for pictures).

## Parser selection (`lib/ParserFactory.ts`)

1. For random-access tokenizers, `scanAppendingHeaders` (in `core.ts`) looks for trailing ID3v1, Lyrics3 and APEv2 footers first.
2. `parseFile` supplies a loader when the extension is recognized. If no loader was passed in, it is chosen by MIME type (`tokenizer.fileInfo.mimeType`), then by file extension, then by sniffing the first 4,100 bytes with `file-type`. Failure raises `CouldNotDetermineFileTypeError` or `UnsupportedFileTypeError` (`lib/ParseError.ts`).
3. 14 loaders are registered: flac, mpeg, apev2, mp4, matroska, riff/wav, ogg, asf, aiff, wavpack, musepack, dsf, dsdiff and caf. Each format loader implements `IParserLoader` (`parserType`, `extensions`, `mimeTypes`, `load()`), and `load()` uses a dynamic `import()` to select the implementation. This defers loading parser implementations except for modules already imported eagerly, including `APEv2Parser` and the ID3v1 and Lyrics3 helpers used by `core.ts` for footer scanning.
4. The parser is constructed with a `MetadataCollector`, the tokenizer and the options. `parse()` runs, track info is finalized (`lib/common/TrackInfo.ts`), and `metadata.toCommonMetadata()` is returned.

## From native tags to common tags

Parsers call `MetadataCollector.addTag(tagType, id, value)` (`lib/common/MetadataCollector.ts`). The collector keeps the native tags and maps them through `CombinedTagMapper` (`lib/common/CombinedTagMapper.ts`), which has one mapper per tag format: ID3v1, ID3v2.2, ID3v2.3/ID3v2.4, MP4, Vorbis, APEv2, ASF, RIFF INFO, Matroska, AIFF and CAF. `MetadataCollector` applies tag precedence from `TagPriority` and normalizes values before returning `common`; unmapped native tags remain available in `native`. [doc-gen/gen.ts](../doc-gen/gen.ts) uses the same mappers to regenerate [common_metadata.md](common_metadata.md).

## From common tags to native tags (writer)

The writer uses `lib/write/mapping/common.ts` as the single source of truth for common→native field mappings (`COMMON_FIELDS`). Format-specific writers (`id3v2.ts`, `vorbis.ts`, `mp4/tags.ts`, `flac/flac.ts`) translate the normalized patch into native frames/boxes/blocks.

## Resource limits (`lib/common/Allocation.ts`)

| Option | Default | Scope |
|---|---|---|
| `maxMemoryAllocation` | 64 MiB | A single metadata payload, accumulated Ogg packet, tokenizer lookahead or `file-type` read buffer. |
| `maxMetadataEntries` | 100,000 | An individual decoded metadata list, table or buffered container structure. |
| `maxChapterCount` | 1,000 | Returned MP4 and ID3v2 chapters; excess chapters are omitted with a warning. MP4 chapters still require `includeChapters`. |

`ParserFactory.parse()` validates all three options as positive safe integers before scanning or parsing. Parsers use `validateAllocation`/`readBuffer`/`readToken` before allocating buffers from untrusted lengths, and the entry/chapter helpers where those limits apply. These are per-buffer or per-structure limits, not a cap on total process memory or total collected metadata. See [read-allocation-limits.test.ts](../test/read-allocation-limits.test.ts).

## Known import cycles

- `lib/core.ts` ↔ `lib/ParserFactory.ts` (`ParserFactory` imports `scanAppendingHeaders`).
- `lib/id3v2/FrameParser.ts` ↔ `lib/id3v2/FrameHeader.ts` (`FrameHeader` imports `Id3v2ContentError`).

Both work under ESM because the imported values are only used at call time.

## Adding a format

1. Add `lib/<format>/` with a loader and parser implementing the interfaces in [ParserFactory.ts](../lib/ParserFactory.ts). Reuse shared tag readers when the format embeds ID3v2, APEv2 or Vorbis comments.
2. Register the loader in the `ParserFactory` constructor, declare its extensions and MIME types, and add its identifier to `ParserType` in [lib/type.ts](../lib/type.ts).
3. For a new native tag format, register a mapper in [CombinedTagMapper.ts](../lib/common/CombinedTagMapper.ts). Add the tag identifier to `TagType` in [GenericTagTypes.ts](../lib/common/GenericTagTypes.ts) and to `TagPriority` in [MetadataCollector.ts](../lib/common/MetadataCollector.ts); without a priority entry, mapped tags are silently dropped.
4. Apply the allocation, entry and chapter limits when reading untrusted lengths or counts.
5. Add a `test/test-file-<format>.ts` suite for a new format. Extend the matching suite for an existing format; DSDIFF uses `test/test-dsdiff.ts`. Use small local fixtures in `test/samples` and follow [CONTRIBUTING.md](../CONTRIBUTING.md#unit-tests-and-fixtures).

## Adding writer support for a format

1. Implement format writer in `lib/write/<format>/` following the pattern of existing writers (detect → rebuild metadata → copy audio).
2. Add format case to `buildStreamedUpdate` in `lib/write/core/shared.ts` (for streamed containers) or to the direct-write path in `lib/write/index.ts` (for FLAC/ID3).
3. Extend `COMMON_FIELDS` in `lib/write/mapping/common.ts` with the format's native IDs.
4. Add format-specific mapping in `lib/write/mapping/<format>.ts` if needed.
5. Add `test/write-file-<format>.test.ts` with fixtures.

## Dependencies

The main binary-reading dependencies are shown below. `strtok3` selects its Node.js or runtime-neutral entry point through export conditions; its file-system support is only loaded in Node.js. `file-type` uses `strtok3/core` directly.

```mermaid
graph TD;
    MMN("music-metadata (Node.js entry point)")-->MMP
    MMN-->S(strtok3)
    S-->SC("strtok3/core")
    S-. "Node.js" .->FS("node:fs/promises")
    MMP("music-metadata (core entry point)")-->S
    MMP-->TY(token-types)
    MMP-->FT(file-type)
    MMP-->UAE(uint8array-extras)
    FT-->SC
    FT-->TY
    FT-->UAE
    FT-->INF("@tokenizer/inflate")
    SC-->TO("@tokenizer/token")
    TY-->TO
    TY-->IE(ieee754)
    TY-->TC("@borewit/text-codec")
    MMP-->TC
    style FS fill:#F88,stroke:#A44
    style IE fill:#CCC,stroke:#888
    style MMN fill:#FAA,stroke:#A44
```

Direct dependencies and their roles (see [package.json](../package.json) for versions):

| Dependency | Role |
|---|---|
| [strtok3](https://github.com/Borewit/strtok3) | Tokenizers for files, buffers, blobs and streams. |
| [@tokenizer/token](https://github.com/Borewit/tokenizer-token) | Token interfaces shared by tokenizers and binary decoders. |
| [token-types](https://github.com/Borewit/token-types) | Binary numeric and string tokens. |
| [file-type](https://github.com/sindresorhus/file-type) | Media format sniffing and cover-art MIME detection. |
| [@borewit/text-codec](https://github.com/Borewit/text-codec) | Metadata text encoding and decoding. |
| [uint8array-extras](https://github.com/sindresorhus/uint8array-extras) | Byte-array utilities. |
| [content-type](https://github.com/jshttp/content-type), [media-typer](https://github.com/jshttp/media-typer) | Content-Type and MIME parsing for loader selection. |
| [debug](https://github.com/debug-js/debug) | Namespaced diagnostic logging. |
| [win-guid](https://github.com/Borewit/win-guid) | Windows GUID decoding for ASF. |
