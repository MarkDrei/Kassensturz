# Kassensturz

Public web app that visualises German public finances (Bund, Länder, Gemeinden, Sozialversicherung):
income and spending by type and function, over the years, ideally comparing the 16 Länder.
Idea note (Knowledge Vault): "Idee: Interaktive Übersicht Staatsfinanzen Deutschland (Bund, Länder, Gemeinden)".

## Architecture
- One backend that serves the whole site: `server.js` (Node, no framework yet) serves `public/` and `/api/*`.
  The stack may be changed (e.g. a framework, a build step), but keep: one container, one process.
- Data should be prepared ahead of time (scripts + committed, compact JSON/CSV), not fetched live per request.

## Deployment contract (VPS platform, do not change without the orchestrator)
- `Dockerfile` at the repo root builds the image; the container must listen on `0.0.0.0:3000` (`PORT` env).
- Push to `main` = live deploy to https://kassensturz.ironstrike.de (public, no auth).
  Other branches = preview `<branch-slug>.kassensturz.ironstrike.de` (max 3). Work on branches, merge to main.
- No database. RAM on the VPS is tight: keep the runtime small (target well below 150 MB), no headless
  browsers or heavy build steps at runtime, keep the image small.
- Deploy logs: https://deploy.ironstrike.de/dashboard
