// Classify the root Yarn workspace without installing or executing PR dependencies.
function graph(manifest, lock) {
  if (!lock?.__metadata || manifest.workspaces) {
    throw new Error('Expected a single-workspace Yarn Berry lockfile');
  }
  const entries = new Map();
  for (const [key, entry] of Object.entries(lock)) {
    if (key !== '__metadata') {
      for (const descriptor of key.split(', ')) {
        entries.set(descriptor, entry);
      }
    }
  }
  const root = entries.get(`${manifest.name}@workspace:.`);
  if (!root) {
    throw new Error('Missing root workspace');
  }
  function visit(roots) {
    const seen = new Set();
    const names = new Set();
    function walk(name, range) {
      names.add(name);
      const descriptor = `${name}@${range}`;
      const entry = entries.get(descriptor);
      if (!entry?.resolution) {
        throw new Error(`Unresolved dependency: ${descriptor}`);
      }
      // Include the real package name for npm aliases.
      names.add(entry.resolution.slice(0, entry.resolution.lastIndexOf('@')));
      if (seen.has(entry)) {
        return;
      }
      seen.add(entry);
      for (const [child, childRange] of Object.entries(entry.dependencies || {})) {
        walk(child, childRange);
      }
      // Peer dependencies are supplied by consumers; conservatively treat their
      // names as part of the same scope even if not installed in this workspace.
      for (const peer of Object.keys(entry.peerDependencies || {})) {
        names.add(peer);
      }
    }
    for (const name of Object.keys(roots)) {
      walk(name, root.dependencies?.[name]);
    }
    return {seen, names};
  }
  const runtime = visit({...manifest.dependencies, ...manifest.optionalDependencies});
  for (const name of Object.keys(manifest.peerDependencies || {})) {
    runtime.names.add(name);
  }
  return {entries, runtime, development: visit(manifest.devDependencies || {})};
}

function classify({base, head, dependencyNames, files}) {
  if (!dependencyNames.length || files.some(file => !['package.json', 'yarn.lock'].includes(file))) {
    return 'dependencies';
  }
  const before = graph(base.manifest, base.lock);
  const after = graph(head.manifest, head.lock);
  // Runtime manifest changes must stay visible even if they resolve to the same version.
  for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    if (JSON.stringify(base.manifest[field]) !== JSON.stringify(head.manifest[field])) {
      return 'dependencies';
    }
  }
  for (const name of dependencyNames) {
    if (before.runtime.names.has(name) || after.runtime.names.has(name) ||
        !(before.development.names.has(name) || after.development.names.has(name))) {
      return 'dependencies';
    }
  }
  // Inspect collateral lockfile changes too, not just Dependabot's named updates.
  const descriptors = new Set([...before.entries.keys(), ...after.entries.keys()]);
  for (const descriptor of descriptors) {
    if (descriptor === `${base.manifest.name}@workspace:.`) {
      continue;
    }
    const previous = before.entries.get(descriptor);
    const next = after.entries.get(descriptor);
    if (JSON.stringify(previous) === JSON.stringify(next)) {
      continue;
    }
    for (const [snapshot, entry] of [[before, previous], [after, next]]) {
      if (entry && (snapshot.runtime.seen.has(entry) || !snapshot.development.seen.has(entry))) {
        return 'dependencies';
      }
    }
  }
  return 'dev-dependencies';
}

module.exports = {classify};
