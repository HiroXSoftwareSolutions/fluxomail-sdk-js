Release {{VERSION}}

Summary
- Bump package.json to {{VERSION}}.
- Tag v{{VERSION}} will be created by the auto‑publish job.
- Publish runs inline on merge using environment `npm-publish` (NPM_TOKEN, OIDC provenance).

Checklist
- [ ] CI green (Node 18/20 + commitlint)
- [ ] Approver confirmed version matches intended release
- [ ] Optional: add `semver:minor` or `semver:major` label if needed

Notes
- If branch protection blocks the commit push to `main`, the job opens this PR automatically to keep package.json on `main` in sync with npm.
- The job is idempotent: if version exists on npm, it skips publish.
