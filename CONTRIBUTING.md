# Contributing

## Code style

Biome is the source of truth for TypeScript formatting, import organization, and linting.
Use the version pinned in `package.json` and the settings in `biome.jsonc`.

- Use two spaces, LF line endings, single quotes, and semicolons.
- Let Biome wrap code at 120 columns and normalize spacing. Trailing commas are disabled.
- Omit parentheses around a single arrow parameter when possible.
- Let Biome organize imports and exports; keep type-only imports marked with `type`.
- Use braces for control-flow statements, shorthand array types (`T[]`), and `node:` imports for Node.js built-ins.

Run `yarn lint:ts:fix` to format code, organize imports, and apply safe lint fixes.
Run `yarn lint:ts` to check the result; CI runs this same check.
Some rules, including missing braces, require manual changes or a reviewed rule-specific unsafe fix.
Do not apply all unsafe fixes indiscriminately.

Checks cover TypeScript in `lib`, `test`, and `doc-gen`, plus the Biome configuration itself.
Git-ignored files and generated declaration files are excluded so building does not change the lint input.
Existing recommended-rule warnings remain advisory; the explicitly enabled style rules are errors.

For editor integration, use the Biome extension with this workspace configuration and enable Biome formatting
and import organization on save. Avoid configuring a second formatter for these TypeScript files.

## Unit tests and fixtures

Add focused unit tests for new behavior and regression tests for bug fixes.
Use local fixtures in `test/samples` so tests are deterministic and do not depend on network access.
Reuse an existing fixture when it represents the case being tested.

- Use valid, decodable audio files and trim the audio portion to one second or less.
- Use generated silence or tones, or audio permitted for redistribution, with any required attribution.
- Keep fixtures as small as possible and omit metadata or artwork unrelated to the test.
- Deliberately malformed or truncated fixtures are appropriate for tests of invalid input. Clearly identify
  the intended defect in the test and fixture name, and keep the sample minimal.

Assert the specific metadata, format properties, or error behavior that the test is intended to verify.

Extend an existing suite instead of creating a test file for each issue or PR. Choose the suite by
the format or behavior being tested, then place the case next to related tests:

| Coverage | Location |
| --- | --- |
| File/container parsing | The matching `test/test-file-*.ts` suite; DSDIFF uses `test/test-dsdiff.ts` |
| Shared ID3v2 headers, padding, encodings, lyrics and embedded tags | `test/test-id3v2.ts` |
| Version-specific ID3 frames and mappings | `test/test-id3v1.1.ts`, `test/test-id3v2.2.ts`, `test/test-id3v2.3.ts`, `test/test-id3v2.4.ts` |
| APEv2 tags and shared Vorbis comment decoding | `test/test-apev2.ts`, `test/test-vorbis-comments.ts` |
| Cross-format tag mapping | The existing common, Picard, Discogs, comment or ReplayGain suite |
| Public API behavior and shared policies | The existing options, MIME, parse-file, async, track-info or allocation-limit suite |

Use nested `describe` groups for related chunks, frames or behaviors, with descriptive `it` names.
Keep format variants and input adapters together, and reuse `Parsers` from `test/metadata-parsers.ts`
when checking the same fixture across supported input APIs. Retain issue/PR references in comments
or case names as context. Create a new test file when introducing a format or a distinct shared concern.
Keep synthetic fixture builders local to their group; builders used by multiple suites can live in
`test/fixtures`.

## Issues and pull requests

For issues and PRs concerning audio or metadata formats, cite the relevant formal specification.
Include a link, the specification version, and the section, field, or frame that defines the expected behavior.
Explain how the reported behavior or proposed change relates to that requirement.
If no formal specification is available, state this and identify the reference used.

PR descriptions should state which issue is resolved. Leave test validation details to CI.

## Checks

Run `yarn compile:dev` to compile the source, tests, and documentation generator.
Run `yarn test` for the test suite and `yarn lint:md` for Markdown linting.

Run `yarn build:test` for a clean development build of the source and tests, preserving documentation generator outputs.
Run `yarn test:compiled` to test an existing build without cleaning or recompiling it. CI uses this command to test
the downloaded build artifacts on each runtime.

Run `yarn test-coverage` for a clean development build followed by coverage, or `yarn test-coverage:compiled` to collect
coverage from an existing development build. The library is compiled last so test and documentation compilation do
not overwrite its source maps. Coverage is remapped to TypeScript sources; the TypeScript-only filter in `.c8rc.json`
keeps generated JavaScript and declaration files out of the report.

Run `yarn test:watch` to rebuild and rerun tests after changing TypeScript sources or compiler configuration.
Each run cleans generated library and test files before compilation so deleted or renamed tests do not leave stale
JavaScript behind. Documentation generator outputs are preserved.
Generated JavaScript and declaration files do not trigger a rebuild.

IntelliJ IDEA and WebStorm can run TypeScript tests directly through the Mocha gutter icons using `.mocharc.json`.
Use the project root as the working directory and remove any old `--require ts-node/register` options.

The workspace does not override VS Code's TypeScript SDK: TypeScript 7 no longer supplies the legacy `tsserver`.
VS Code can use its bundled language service without affecting the TypeScript 7 compiler used by the build.
