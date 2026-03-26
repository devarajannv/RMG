# Visual Regression Baseline Screenshots

This directory contains baseline screenshots for visual regression testing.

## Generating Baselines

```bash
cd apps/frontend
GENERATE_BASELINE=true npx vitest run src/test/visual-regression/screenshots.test.ts
```

## Running Comparisons

```bash
cd apps/frontend
npx vitest run src/test/visual-regression/screenshots.test.ts
```

## Prerequisites

```bash
npm install --save-dev puppeteer pixelmatch pngjs @types/pngjs
```

## Directory Structure

```
visual-regression/
├── config.ts              # Viewports, pages, thresholds
├── screenshots.test.ts    # Test suite
├── baseline/              # Baseline screenshots (committed)
│   └── README.md
├── current/               # Current test screenshots (gitignored)
└── diffs/                 # Diff images (gitignored)
```
