# Dependabot release-note labels

The Dependabot workflow labels npm/Yarn updates using the root `package.json`
and Yarn Berry dependency graph from both PR revisions. It applies to version
updates and security updates, including grouped and transitive updates.

- `dev-dependencies`: every named update and changed lockfile entry is
  development-only. Release Drafter excludes these PRs. TypeScript remains in
  this category.
- `dependencies`: an update affects a runtime dependency, mixes scopes, or
  cannot be classified confidently. These PRs remain visible in release notes.

The workflow synchronizes these two labels while preserving unrelated labels.
GitHub Actions updates retain their existing Dependabot labeling.

Only scripts from the trusted base commit are executed. PR manifests and
lockfiles are read as data via the GitHub API; PR dependencies are never
installed. The graph classifier supports this repository's single root Yarn
workspace. Unsupported graphs or incomplete API responses default to
`dependencies` and emit a workflow warning.

Run the regression tests with:

```sh
node --test .github/scripts/dependabot/classify.test.cjs
```
