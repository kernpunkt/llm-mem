# mem-coverage Examples

This directory contains example configurations and CI usage for the mem-coverage CLI.

## Files
- `.coverage.json`: Example coverage configuration consumed directly by the CLI.
- `vitest.config.js`: Example Vitest config from which mem-coverage extracts include/exclude and thresholds.
- `jest.config.cjs`: Example Jest config from which mem-coverage extracts include/exclude and thresholds.
- `ci.sh`: Example CI script to run mem-coverage with threshold enforcement.
- `github-actions.yml`: GitHub Actions workflow example to run mem-coverage on pushes/PRs.

## Run with .coverage.json
```bash
pnpm mem-coverage -- --config=src/mem-coverage/_examples/.coverage.json --verbose
```

## Glob patterns
- Allowed: relative patterns with `*`, `**`, `?`, `{}`, `[]`
- Rejected: absolute paths, parent traversal (`../`), null bytes

## CI usage
- See `ci.sh` for a basic CI integration example that fails the build on threshold violations.
- For GitHub Actions, copy `github-actions.yml` to `.github/workflows/mem-coverage.yml` in your repository.
