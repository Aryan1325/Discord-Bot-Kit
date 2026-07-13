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
