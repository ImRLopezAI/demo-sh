# E2E Browser Tests

This project uses Playwright for browser-level regression coverage of high-risk flows.

## Commands

- `bun run test:e2e`: run full Playwright suite
- `bun run test:e2e:smoke`: run smoke-tagged specs (used by CI)

By default, Playwright expects the app to already be running on `http://127.0.0.1:3000`.
To let Playwright manage the server startup itself, run with:

- `PLAYWRIGHT_USE_WEBSERVER=1 bun run test:e2e:smoke`

## Covered Smoke Flows

- Hub notifications bulk select + bulk action count sync
- Market sales order create-with-lines dialog flow
- Replenishment purchase order create-with-lines dialog flow

## Failure Artifacts

Playwright keeps failure artifacts automatically:

- trace: `retain-on-failure`
- screenshot: `only-on-failure`
- video: `retain-on-failure`

Artifacts are stored in `test-results/playwright` and HTML report in `playwright-report`.
