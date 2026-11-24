# Publishing a release

Maintainer instructions for publishing `music-metadata`.

Releases are manually started through the **Stage to npm** GitHub Actions workflow (`.github/workflows/npm-stage.yml`), not by pushing a tag or publishing a GitHub release.
Choose `patch`, `minor` or `major` when starting the workflow; it does not fetch a version from Release Drafter or npm.
The workflow stages the package for review; a maintainer must approve it on npm before it becomes publicly available.

## One-time setup

1. Create a GitHub environment named `npm`, restrict its deployment branches to `master`, and optionally require approval from a maintainer.
2. In the npm settings for `music-metadata`, add or update a GitHub Actions trusted publisher with organization/user `Borewit`, repository `music-metadata`, workflow filename `npm-stage.yml` (no directory prefix), and environment `npm`. Replace the old `publish.yml` filename if already configured.
3. Allow `npm stage publish` for the trusted publisher; direct `npm publish` is not needed and should be disabled. Enable 2FA on the maintainer's npm account for approval.
4. Ensure repository rules allow this workflow's `GITHUB_TOKEN` to push the version commit to `master` and create `v*` tags; `contents: write` does not bypass branch protection or required pull requests.

No `NPM_TOKEN` or `NODE_AUTH_TOKEN` secret is used.
The workflow uses a GitHub-hosted runner, Node.js 24 and npm 11.15.0 or later within npm 11 with OIDC and provenance enabled.
After a successful staged release, remove any obsolete npm publishing tokens if they are no longer needed.

## Release procedure

1. Wait for CI to finish on `master` and decide whether this is a patch, minor or major release.
2. Open **Actions → Stage to npm → Run workflow** and select `master`.
3. Choose the **Version increment** (`patch` by default) and start the workflow.
4. Approve the `npm` environment deployment if required.
5. After the workflow succeeds, review the package in npm's **Staged Packages** tab and approve it with 2FA. Alternatively, use `npm stage list music-metadata`, `npm stage view <stage-id>` and `npm stage approve <stage-id>` from an authenticated local npm CLI (11.15.0 or later).
6. Confirm the version is publicly available on npm, then review and manually publish the GitHub draft release using the version tag pushed by the workflow.

The workflow runs `npm version patch`, `npm version minor` or `npm version major` as `Borewit`, based on the current `package.json` version.
It tests the package, compiles the production library, and checks that the working tree is clean and `master` has not moved before staging to npm.
Only after `npm stage publish` succeeds does it atomically push the version commit and tag; failed staging leaves both local to the runner.
The pushed tag records the staged version, not approval: it can exist before the version is publicly available. The workflow does not approve the package or wait for approval.
GitHub release notes and draft publication remain manual and independent of npm publishing.
The production compile is explicit, so `npm stage publish --ignore-scripts` avoids repeating the `prepublishOnly` build and does not generate documentation.
Local `npm publish` behavior is unchanged.

## Failed runs

- If preparation or the pre-staging checks fail, nothing has been staged or pushed; fix the failure and start a new run on `master`.
- If `npm stage publish` fails, the workflow does not push the version commit or tag. Check the staged packages and public registry in case npm accepted the upload despite the error (for example, after a network timeout). A staged version reserves its version number; do not blindly retry it. If no staged or published version exists, fix the problem and start a new run on `master` with the same increment.
- npm staging and the Git push are not a single transaction. If staging succeeds but the push fails, the package awaits approval. Recover the matching version commit and tag before approving it, without staging again or bumping the version again.
- The final push refuses to overwrite newer commits if `master` moves after the pre-staging check; treat this as a post-staging push failure, not as failed staging.
- If approval fails, check the staged and public version status before retrying approval; do not rerun the staging workflow for an existing staged package. If you reject a staged package, the pushed commit and tag remain; make corrections and stage a new version rather than reusing the tag.
- Never move an existing release tag or attempt to overwrite a published npm version.
