# Skill: Run Tests

## When to use
ALWAYS run before pushing code to GitHub. No exceptions.

## Commands
```bash
cd C:/Users/pandu/Downloads/Swiftly

# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/services/monday-api.test.js

# Run pre-deploy pipeline (tests + build + verify + deploy)
npm run predeploy
```

## Expected
All tests pass with 0 failures before pushing.

## Full deploy pipeline
```bash
npm run deploy
# Runs: predeploy (secret scan → tests → build → verify) → git push
```
