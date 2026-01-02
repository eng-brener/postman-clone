# AGENTS.md

## Project Overview
- Tauri v2 app with React frontend and Rust backend.
- Frontend code lives in `src/`, backend in `src-tauri/`.
- UI currently mimics an Insomnia-style layout (dark theme).

## How to Run
- Install deps: `pnpm install`
- Dev (Tauri): `pnpm tauri dev`
- Web-only dev: `pnpm dev`

## Key Files
- `src/App.tsx`: main UI + request logic (uses `@tauri-apps/plugin-http`).
- `src/App.css`: UI styling.
- `src-tauri/src/lib.rs`: Tauri setup, plugins.
- `src-tauri/capabilities/default.json`: Tauri capability scopes (HTTP allowlist).

## Conventions
- Prefer minimal edits; keep UI consistent with the Insomnia-like layout.
- Use ASCII in files unless already using Unicode.
- Avoid adding web-only features that conflict with Tauri desktop behavior.

## HTTP Requests (Tauri)
- Requests use `@tauri-apps/plugin-http` to avoid CORS.
- HTTP allowlist lives in `src-tauri/capabilities/default.json`.
  - Add domains to the `http:default` permission `allow` list as needed.

## When Changing UI
- Match existing structure: menubar, tabs, rail, sidebar, workspace.
- Keep palette consistent with dark UI unless asked otherwise.

## Testing
- No automated tests set up.
- Manual check: run `pnpm tauri dev` and send a request (e.g. ViaCEP).
