# Architecture

A one-page map of how music-metadata is put together, for contributors. For the public API, see the README.

## Entry points

| Export condition (`package.json`) | File | Functions |
|---|---|---|
| `node` | `lib/index.ts` | `parseFile`, `parseStream` (Node streams and files, via `strtok3` `fromFile`/`fromStream`). Re-exports everything from `core.ts`. |
| `default` (browsers, other runtimes) | `lib/core.ts` | `parseBuffer`, `parseBlob`, `parseWebStream`, `parseFromTokenizer`, plus helpers `orderTags`, `ratingToStars`, `selectCover`, `getSupportedMimeTypes`. Its `parseFile`/`parseStream` stubs always throw. |

Every entry point builds a `strtok3` tokenizer (options from `getTokenizerOptions` in `lib/common/Allocation.ts`) and hands it to `ParserFactory.parse()`.

## Parser selection (`lib/ParserFactory.ts`)

1. For random-access tokenizers, `scanAppendingHeaders` (in `core.ts`) looks for trailing ID3v1, Lyrics3 and APEv2 footers first.
2. If no loader was passed in, it is chosen by MIME type (`tokenizer.fileInfo.mimeType`), then by file extension, then by sniffing the first 4,100 bytes with `file-type`. Failure raises `CouldNotDetermineFileTypeError` or `UnsupportedFileTypeError` (`lib/ParseError.ts`).
3. 14 loaders are registered: flac, mpeg, apev2, mp4, matroska, riff/wav, ogg, asf, aiff, wavpack, musepack, dsf, dsdiff and caf. Each `lib/<format>/*Loader.ts` is an `IParserLoader` (`parserType`, `extensions`, `mimeTypes`, `load()`), and `load()` uses a dynamic `import()`, so a format's parser code is only loaded when it is needed.
4. The parser is constructed with a `MetadataCollector`, the tokenizer and the options. `parse()` runs, track info is finalized (`lib/common/TrackInfo.ts`), and `metadata.toCommonMetadata()` is returned.

## From native tags to common tags

Parsers call `MetadataCollector.addTag(tagType, id, value)` (`lib/common/MetadataCollector.ts`). The collector keeps the native tags and maps them through `CombinedTagMapper` (`lib/common/CombinedTagMapper.ts`), which has one mapper per tag format: ID3v1, ID3v2.2, ID3v2.4, MP4, Vorbis, APEv2, ASF, RIFF INFO, Matroska, AIFF and CAF. `doc-gen/gen.ts` uses the same mappers to regenerate `doc/common_metadata.md`.

## Resource limits (`lib/common/Allocation.ts`)

Defaults: `maxMemoryAllocation` is 64 MiB, `maxMetadataEntries` is 100,000 and `maxChapterCount` is 1,000. `ParserFactory.parse()` validates them up front, and parsers use `validateAllocation`/`readBuffer`/`readToken` before reading lengths taken from the file. Tests: `test/test-allocation-limits.ts`.

## Known import cycles

- `lib/core.ts` ↔ `lib/ParserFactory.ts` (`ParserFactory` imports `scanAppendingHeaders`).
- `lib/id3v2/FrameParser.ts` ↔ `lib/id3v2/FrameHeader.ts` (`FrameHeader` imports `Id3v2ContentError`).

Both work under ESM because the imported values are only used at call time.

## Adding a format

Add `lib/<format>/` with a `*Loader.ts`, a parser and (if it has its own tags) a tag mapper registered in `CombinedTagMapper`. Register the loader in the `ParserFactory` constructor. Add a `test/test-file-<format>.ts` suite with a small fixture in `test/samples`, following CONTRIBUTING.md.
