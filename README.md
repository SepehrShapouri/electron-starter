# Electron Update Starter

Reusable Electron boilerplate built with Electron Forge, React 19,
TypeScript, TanStack Router, and Tailwind CSS v4.

The app has been reduced to a single `"/"` route and keeps the updater
plumbing in place:

- Main-process auto-update setup through `electron-updater`'s built-in
  Electron `autoUpdater` flow
- Preload bridge for checking, downloading, and installing updates
- In-app starter screen that surfaces updater status and install actions
- File-based routing with TanStack Router
- Theme support with a simple dark/light toggle

## Getting started

```bash
npm install
npm start
```

## Available scripts

- `npm start` - run the Electron app in development
- `npm run type-check` - run TypeScript without emitting files
- `npm run lint` - run ESLint on `src/` and `tests/`
- `npm run test` - run Vitest once
- `npm run test:e2e` - run Playwright
- `npm run routes:generate` - regenerate `src/routeTree.gen.ts`
- `npm run make` - create distributable packages

## Update configuration

Automatic updates are disabled until you configure a release repository.

You can set it in either place:

1. `package.json`
   Set `electronBoilerplate.updateRepository` to `owner/repo`
2. Environment variable
   Set `UPDATE_REPOSITORY=owner/repo`

In development builds, the updater stays disabled by design.

## Project shape

```text
src/
  main.ts              Electron main process with window + updater setup
  preload.ts           Safe renderer bridge
  App.tsx              App providers
  routes/              TanStack Router file routes
  hooks/use-app-update.ts
  routeTree.gen.ts     Generated route tree
```

## Next customization steps

1. Rename the package, executable, and icons for your app.
2. Point `electronBoilerplate.updateRepository` at your release repo.
3. Add new route files under `src/routes`.
4. Run `npm run routes:generate` after route changes.
