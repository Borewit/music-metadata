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

## Issues and pull requests

For issues and PRs concerning audio or metadata formats, cite the relevant formal specification.
Include a link, the specification version, and the section, field, or frame that defines the expected behavior.
Explain how the reported behavior or proposed change relates to that requirement.
If no formal specification is available, state this and identify the reference used.

PR descriptions should state which issue is resolved. Leave test validation details to CI.

## Checks

Run `yarn compile:dev` to compile the source, tests, and documentation generator.
Run `yarn test` for the test suite and `yarn lint:md` for Markdown linting.
