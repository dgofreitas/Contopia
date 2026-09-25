/**
 * semantic-release — Contopia
 *
 * One version for the whole repository: both images ship under the same tag,
 * so `v1.2.3` names a deployable state of the system rather than a package.
 *
 * Only feat / fix / BREAKING CHANGE produce a release. docs, test, style and
 * chore deliberately do not — a version number that moves without behaviour
 * moving stops meaning anything, and under the tag-driven pipeline a release
 * is also a production deploy.
 *
 * The corollary is a real trap: a `chore:` that changes a Dockerfile or a
 * bind-mounted config never reaches production. Commit runtime-affecting work
 * as `fix:`.
 */

module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'revert', release: 'patch' },
          { breaking: true, release: 'major' },
          { type: 'docs', release: false },
          { type: 'style', release: false },
          { type: 'test', release: false },
          { type: 'chore', release: false },
          { type: 'refactor', release: false },
          { type: 'build', release: false },
          { type: 'ci', release: false }
        ]
      }
    ],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/exec',
      {
        // `npm pkg set` rewrites only the version field — no lockfile churn,
        // no git side effects. The two packages had drifted to 1.0.2-dev and
        // 1.1.7-dev; from here they follow the repository version.
        prepareCmd:
          'npm pkg set version=${nextRelease.version} --prefix backend && ' +
          'npm pkg set version=${nextRelease.version} --prefix frontend'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'backend/package.json', 'frontend/package.json'],
        // [skip ci] matters: this commit lands on main, which is the trigger
        // for the very workflow that created it.
        message: 'chore(release): v${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ],
    [
      '@semantic-release/github',
      {
        // Off because the history predates this pipeline: older messages carry
        // #79, #2 and similar from another tracker, and the plugin fails the
        // whole run trying to comment on issues that do not exist here.
        successComment: false,
        failComment: false,
        releasedLabels: false
      }
    ]
  ]
};
