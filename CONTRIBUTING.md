## Contributing to @fluxomail/sdk

Thanks for helping improve the Fluxomail SDK!

### Prerequisites
- Node.js 18 or 20
- npm 9+

### Setup
```bash
git clone https://github.com/fluxomail/fluxomail-sdk-js.git
cd fluxomail-sdk-js
npm install
npm test
```

### Development
- Build: `npm run build`
- Tests: `npm test` or `npm run test:coverage`
- Minimal diffs; keep API stable and typed.

### Commit Messages
We use Conventional Commits. Examples:
- `feat: add unsubscribe API`
- `fix(http): retry on 429 with Retry-After`
- `docs(cli): add examples for tail`

### Pull Requests
- Include tests for new behavior.
- Update README/docs where relevant.
- Keep changes scoped; avoid unrelated refactors.

### Releases
Automated via release-please. Merge the generated release PR to cut a new tag; CI will publish to npm.

