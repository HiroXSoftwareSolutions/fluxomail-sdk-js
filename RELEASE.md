Release Process (0.x)
=====================

Main is production. Releases are tag-driven and published via GitHub Actions with npm provenance.

Pre-release
-----------
1) Enable OpenAPI drift check in CI (optional)
   - Repo Settings -> Actions -> Variables -> New variable
   - FLUXOMAIL_OPENAPI = path or URL to the public OpenAPI spec
   - CI will run codegen and fail if src/gen/openapi-types.ts drifts

2) E2E smoke on staging (optional)
   - Repo Settings -> Actions -> Secrets:
     - FLUXOMAIL_BASE_URL (e.g., https://api.fluxomail.com/api/v1)
     - FLUXOMAIL_API_KEY or FLUXOMAIL_TOKEN_CMD
   - Actions -> "E2E Staging" -> Run workflow

3) Ensure tests and build pass locally
   - npm ci && npm test
   - npm run build && npm pack --dry-run

Release PR
----------
- Create a release branch (e.g., release/0.3.0) and open a PR to main.
- Review CHANGELOG and README/docs updates.
- Merge when CI is green.

Publish
-------
1) Tag the version on main
   - VERSION=$(node -p "require('./package.json').version")
   - git fetch origin && git checkout main && git pull
   - git tag v$VERSION
   - git push origin v$VERSION

2) GitHub Actions publishes to npm
   - Workflow: .github/workflows/release.yml
   - Uses OIDC provenance (npm publish --provenance --access public)

Post-release
------------
- Verify: npm view @fluxomail/sdk version
- Smoke check: npx -y @fluxomail/sdk fluxomail --help
- Announce in release notes

Notes
-----
- During 0.x, breaking changes may occur in minor versions; keep CHANGELOG clear.
- Keep src/gen/openapi-types.ts generated and committed; CI guards drift when var is set.
- main is prod; tags drive publish.

