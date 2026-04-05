# Skill: Run Tests

## When to use
ALWAYS run before pushing code to GitHub. No exceptions.

## Commands
```bash
cd C:/Users/pandu/Downloads/Swiftly

# Run all unit tests (64 tests, 5 files)
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/services/monday-api.test.js

# Run pre-deploy pipeline (tests + build + verify)
npm run predeploy
```

## Test Files
| File | Tests | Coverage |
|------|-------|----------|
| tests/unit/services/monday-api.test.js | 19 | API service |
| tests/unit/services/ai-engine.test.js | 15 | AI engine |
| tests/unit/services/monday-actions.test.js | 16 | Write operations |
| tests/unit/routes/reporting.test.js | 5 | Report routes |
| tests/unit/routes/actions.test.js | 9 | Action routes |

## Expected
All 64 tests pass with 0 failures before pushing.

## Full deploy pipeline
```bash
npm run deploy
# Runs: predeploy (secret scan → tests → build → verify) → git push
```
