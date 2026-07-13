---
name: Discord bot package placement
description: How to add a Discord.js bot (or similar always-on non-web process) into this pnpm artifacts monorepo when no artifact type fits.
---

Discord bots (and similar headless, always-on processes) don't match any `createArtifact` type (react-vite, expo, slides, video-js, data-visualization, openscad) — they have no preview path and aren't deployable through the artifact system.

**How to apply:** add them as a plain top-level workspace package (e.g. `discord-bot/`), same pattern as `scripts/`:
- Add the dir name to `packages:` in `pnpm-workspace.yaml`.
- Give it its own `package.json` (`@workspace/<name>`), `tsconfig.json` extending root `tsconfig.base.json`, `dev`/`build`/`start`/`typecheck` scripts.
- Use `esbuild` + a `build.mjs` bundling to `dist/index.mjs` for production, matching `artifacts/api-server`'s bundling approach (mirror its `external` list if native modules get pulled in).
- Register it as a long-running process via `configureWorkflow` with `outputType: "console"` (no port to wait on) — not through the artifact/workflow system, since there's no `artifact.toml` service for it.
- Add its dir to the root `package.json` `typecheck` filter list so `pnpm run typecheck` covers it.

**Why:** the artifact system assumes a servable preview; a Discord bot has none, so forcing it through `createArtifact` fails or produces meaningless routing. A plain workspace package + manual `configureWorkflow` is the natural fit.

**Command/event registries must stay statically imported, not fs-scanned.** Production builds bundle via esbuild (single entry point); a `fs.readdirSync` + dynamic `import(computedPath)` pattern for commands/events can't be statically analyzed by esbuild, so those files are silently missing from the bundled `dist`. Keep one explicit `import` line per command/event file in `handlers/commandHandler.ts` / `handlers/eventHandler.ts` instead.

**discord.js v14.26 type gotcha:** don't hoist `{ flags: MessageFlags.Ephemeral, ... }` into an intermediate `const payload = {...}` variable before passing it to `interaction.reply`/`followUp` — TS widens the `flags` property to the whole `MessageFlags` enum type there, which no longer matches `BitFieldResolvable`. Inline the options object directly in the call instead.
