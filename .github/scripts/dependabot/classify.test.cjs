const assert = require('node:assert/strict');
const {test} = require('node:test');
const {classify} = require('./classify.cjs');
const label = require('./label.cjs');

function fixture() {
  const manifest = {name: 'project', dependencies: {runtime: '^1'}, devDependencies: {'remark-cli': '^1', typescript: '^1'}};
  const lock = {__metadata: {version: 8}};
  function entry(name, dependencies = {}) {
    lock[`${name}@npm:^1`] = {version: '1.0.0', resolution: `${name}@npm:1.0.0`, dependencies};
  }
  lock['project@workspace:.'] = {resolution: 'project@workspace:.', dependencies: {runtime: 'npm:^1', 'remark-cli': 'npm:^1', typescript: 'npm:^1'}};
  entry('runtime', {shared: 'npm:^1'});
  entry('shared');
  entry('remark-cli', {socks: 'npm:^1', shared: 'npm:^1'});
  entry('socks', {'ip-address': 'npm:^1'});
  entry('ip-address');
  entry('typescript');
  const base = {manifest, lock};
  return {base, head: structuredClone(base), dependencyNames: ['ip-address'], files: ['yarn.lock']};
}

function bump(input, name) {
  const entry = input.head.lock[`${name}@npm:^1`];
  entry.version = '1.0.1';
  entry.resolution = `${name}@npm:1.0.1`;
}

test('development-only transitive security update is excluded (#2759)', () => {
  const input = fixture();
  bump(input, 'ip-address');
  assert.equal(classify(input), 'dev-dependencies');
});

test('TypeScript remains a development dependency', () => {
  const input = fixture();
  input.dependencyNames = ['typescript'];
  bump(input, 'typescript');
  assert.equal(classify(input), 'dev-dependencies');
});

test('shared and direct runtime dependencies remain visible', () => {
  for (const name of ['runtime', 'shared']) {
    const input = fixture();
    input.dependencyNames = [name];
    bump(input, name);
    assert.equal(classify(input), 'dependencies');
  }
});

test('all members of grouped updates must be development-only', () => {
  const input = fixture();
  input.dependencyNames = ['typescript', 'ip-address'];
  bump(input, 'typescript');
  bump(input, 'ip-address');
  assert.equal(classify(input), 'dev-dependencies');
  input.dependencyNames.push('shared');
  bump(input, 'shared');
  assert.equal(classify(input), 'dependencies');
});

test('collateral runtime changes remain visible without metadata naming them', () => {
  const input = fixture();
  bump(input, 'ip-address');
  bump(input, 'shared');
  assert.equal(classify(input), 'dependencies');
});

test('both base and head dependency scopes are checked', () => {
  const input = fixture();
  input.base.lock['runtime@npm:^1'].dependencies['ip-address'] = 'npm:^1';
  bump(input, 'ip-address');
  assert.equal(classify(input), 'dependencies');
});

test('unknown updates and unrelated files remain visible', () => {
  const input = fixture();
  input.dependencyNames = ['unknown'];
  assert.equal(classify(input), 'dependencies');
  input.dependencyNames = [];
  assert.equal(classify(input), 'dependencies');
  input.dependencyNames = ['ip-address'];
  input.files.push('lib/index.ts');
  assert.equal(classify(input), 'dependencies');
});

test('unresolved graph edges fail classification instead of assuming development scope', () => {
  const input = fixture();
  delete input.base.lock['shared@npm:^1'];
  assert.throws(() => classify(input), /Unresolved dependency/);
});

test('cycles and combined descriptors are supported', () => {
  const input = fixture();
  for (const snapshot of [input.base, input.head]) {
    snapshot.lock['ip-address@npm:^1'].dependencies = {socks: 'npm:^1'};
    snapshot.lock['shared@npm:^1, shared@npm:~1'] = snapshot.lock['shared@npm:^1'];
    delete snapshot.lock['shared@npm:^1'];
  }
  bump(input, 'ip-address');
  assert.equal(classify(input), 'dev-dependencies');
});

test('optional runtime roots and consumer peer dependencies remain visible', () => {
  for (const field of ['optionalDependencies', 'peerDependencies']) {
    const input = fixture();
    for (const snapshot of [input.base, input.head]) {
      snapshot.manifest[field] = {'ip-address': '^1'};
      snapshot.lock['project@workspace:.'].dependencies['ip-address'] = 'npm:^1';
    }
    bump(input, 'ip-address');
    assert.equal(classify(input), 'dependencies');
  }
});

test('runtime manifest changes remain visible even with unchanged lock resolutions', () => {
  const input = fixture();
  input.head.manifest.dependencies.runtime = '>=1';
  assert.equal(classify(input), 'dependencies');
});

function mock(input, {readError = false, stale = false} = {}) {
  const changes = [];
  const github = {
    paginate: async () => input.files.map(filename => ({filename})),
    rest: {
      pulls: {listFiles: {}, get: async () => ({data: {head: {sha: stale ? 'new-head' : 'head'}}})},
      repos: {compareCommits: async () => ({data: {merge_base_commit: {sha: 'base'}}}), getContent: async ({ref, path}) => {
        if (readError) {
          throw new Error('Unavailable lockfile');
        }
        const data = path === 'package.json' ? input[ref].manifest : input[ref].lock;
        return {data: {type: 'file', encoding: 'base64', content: Buffer.from(JSON.stringify(data)).toString('base64')}};
      }},
      issues: {
        addLabels: async ({labels}) => changes.push(['add', ...labels]),
        removeLabel: async ({name}) => changes.push(['remove', name])
      }
    }
  };
  return {changes, args: {
    github,
    context: {repo: {owner: 'owner', repo: 'repo'}, payload: {pull_request: {number: 1, changed_files: input.files.length, base: {sha: 'base'}, head: {sha: 'head'}}}},
    core: {info() {}, warning() {}}, parseYaml: JSON.parse, dependencyNames: input.dependencyNames
  }};
}

test('label synchronization removes the opposite label in both directions', async () => {
  for (const name of ['ip-address', 'shared']) {
    const input = fixture();
    input.dependencyNames = [name];
    bump(input, name);
    const {args, changes} = mock(input);
    await label(args);
    const expected = name === 'shared' ? ['dependencies', 'dev-dependencies'] : ['dev-dependencies', 'dependencies'];
    assert.deepEqual(changes, [['add', expected[0]], ['remove', expected[1]]]);
  }
});

test('API errors fall back to runtime labels and stale runs do not change labels', async () => {
  const failed = mock(fixture(), {readError: true});
  await label(failed.args);
  assert.deepEqual(failed.changes, [['add', 'dependencies'], ['remove', 'dev-dependencies']]);
  const stale = mock(fixture(), {stale: true});
  await label(stale.args);
  assert.deepEqual(stale.changes, []);
});
