# Testing Guide

This project includes comprehensive test suites to ensure all major functionality works correctly before each push.

## Test Setup

The project uses **Jest** as the testing framework with **jsdom** for DOM testing.

### Installation

Install test dependencies:

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Structure

Tests are located in the `__tests__/` directory:

- **sql-engine.test.js** - Tests for SQL query execution and parsing
- **metric-calculator.test.js** - Tests for metric calculation functions (mean, sum, min, max, stdev, count, count_distinct)
- **metric-execution-engine.test.js** - Tests for metric execution engine
- **datasets.test.js** - Tests for dataset storage and operations
- **visualization.test.js** - Tests for chart rendering and visualization panel
- **script-execution-engine.test.js** - Tests for Python/R script execution
- **query-builder.test.js** - Tests for query builder component
- **integration.test.js** - End-to-end integration tests for complete workflows

## Pre-Push Hook

A Git pre-push hook is configured to automatically run all tests and attempt to fix common issues before pushing to the remote repository.

The hook is located at `.git/hooks/pre-push` and will:
1. Run `npm test` before each push
2. If tests fail, automatically attempt to fix common issues (import/export errors, syntax issues)
3. Re-run tests after fixes
4. Show a summary of any remaining failures
5. Proceed with push (with warnings if tests still fail)

### Auto-Fix Script

The hook uses an auto-fix script (`scripts/auto-fix-tests.js`) that can automatically fix:
- Missing `.js` extensions in ES module imports
- Common import/export syntax issues
- Some syntax errors in test files

You can run the auto-fix script manually:
```bash
npm run test:fix
```

### Bypassing the hook (not recommended)

If you need to bypass the hook in an emergency (not recommended), use:
```bash
git push --no-verify
```

## Test Coverage

The test suite covers:

✅ **SQL Engine**
- Query parsing and execution
- JOIN operations
- Column aliases
- Error handling

✅ **Metric Calculations**
- Mean, Sum, Min, Max
- Standard Deviation
- Count and Count Distinct
- Edge cases and error handling

✅ **Dataset Operations**
- Create, Read, Update, Delete
- Persistence to localStorage
- Data validation

✅ **Visualization**
- Chart rendering (line, bar, scatter, pie)
- KPI cards
- Data conversion
- Axis selection

✅ **Component Integration**
- Query Builder → Dataset creation
- Dataset → Metric calculation
- Metric → Visualization rendering

✅ **Error Handling**
- Invalid inputs
- Missing data
- Edge cases

## Writing New Tests

When adding new functionality, please add corresponding tests:

1. Create a test file in `__tests__/` directory
2. Follow the naming convention: `*.test.js`
3. Use descriptive test names
4. Test both success and error cases
5. Run tests before committing

## Continuous Integration

For CI/CD pipelines, run:
```bash
npm test
```

The test suite is designed to run in headless environments and does not require a browser.

