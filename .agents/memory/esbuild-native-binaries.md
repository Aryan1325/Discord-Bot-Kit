---
name: esbuild bundling native-binary npm packages
description: Packages that ship prebuilt .node binaries (e.g. @napi-rs/canvas) break esbuild bundling unless marked external.
---

Packages that load a prebuilt native `.node` binary at runtime (e.g. `@napi-rs/canvas`, which picks a platform-specific binding package like `@napi-rs/canvas-linux-x64-gnu`) fail esbuild's bundle step with "No loader is configured for '.node' files", because esbuild tries to statically bundle the `require()` call.

**Why:** esbuild can't inline a compiled native binary; it must stay a real runtime `require`/`import` resolved from `node_modules` at deploy time.

**How to apply:** add the package (and its `*-<platform>` binding packages, via a glob like `"@napi-rs/canvas-*"`) to esbuild's `external` array in the relevant `build.mjs`, rather than trying to bundle it.
