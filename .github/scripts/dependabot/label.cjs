const {classify} = require('./classify.cjs');

module.exports = async ({github, context, core, parseYaml, dependencyNames}) => {
  const pr = context.payload.pull_request;
  const issue = {...context.repo, issue_number: pr.number};
  let label = 'dependencies';
  try {
    const files = await github.paginate(github.rest.pulls.listFiles, {
      ...context.repo, pull_number: pr.number, per_page: 100
    });
    if (files.length !== pr.changed_files) {
      throw new Error('Incomplete pull request file list');
    }
    async function read(ref, path) {
      const {data} = await github.rest.repos.getContent({...context.repo, ref, path});
      if (data.type !== 'file' || data.encoding !== 'base64') {
        throw new Error(`Unable to read ${path} at ${ref}`);
      }
      return Buffer.from(data.content, 'base64').toString('utf8');
    }
    async function snapshot(ref) {
      const [manifest, lock] = await Promise.all([read(ref, 'package.json'), read(ref, 'yarn.lock')]);
      return {manifest: JSON.parse(manifest), lock: parseYaml(lock)};
    }
    // Compare from the merge base, matching the PR diff even when its branch is behind.
    const {data: comparison} = await github.rest.repos.compareCommits({
      ...context.repo, base: pr.base.sha, head: pr.head.sha
    });
    const [base, head] = await Promise.all([snapshot(comparison.merge_base_commit.sha), snapshot(pr.head.sha)]);
    label = classify({base, head, dependencyNames, files: files.map(file => file.filename)});
  } catch (error) {
    core.warning(`Keeping update visible in release notes: ${error.message}`);
  }
  // Ignore stale events so an older run cannot overwrite classification of a new head.
  const {data: current} = await github.rest.pulls.get({...context.repo, pull_number: pr.number});
  if (current.head.sha !== pr.head.sha) {
    core.info('PR head changed; leaving labels to the newer run');
    return;
  }
  core.info(`Dependency scope label: ${label}`);
  await github.rest.issues.addLabels({...issue, labels: [label]});
  const opposite = label === 'dev-dependencies' ? 'dependencies' : 'dev-dependencies';
  try {
    await github.rest.issues.removeLabel({...issue, name: opposite});
  } catch (error) {
    if (error.status !== 404) {
      throw error;
    }
  }
};
