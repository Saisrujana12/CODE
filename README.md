# CodePulse AI

CodePulse AI is a React + Node.js code review website that accepts pasted code and returns:

- advantages
- disadvantages
- syntax notes
- prioritized suggestions
- quality metrics
- a next-step roadmap
- session history
- Chroma-backed review memory when real credentials are configured

## What makes this project stand out

The base review flow is extended with five bigger product features:

1. Focus toggles for security, performance, readability, architecture, and testing.
2. Review modes for mentor, strict, ship-ready, and interview-style critique.
3. Syntax health scoring with highlighted risky lines and complexity signals.
4. Export tools for Markdown and JSON reports.
5. Chroma memory retrieval to surface similar past reviews.

## Stack

- Frontend: React
- Backend: Node.js + Express
- Memory database: Chroma Cloud
- AI path: OpenAI Responses API when `OPENAI_API_KEY` is valid
- Fallback path: built-in multi-language heuristic reviewer

## Environment setup

Copy `.env.example` to `.env` and fill in the keys.

The values from your message were used as defaults where possible:

```env
CHROMA_HOST=https://api.trychroma.com
CHROMA_TENANT=3ef1a77c-239b-4e46-8562-280d127e21e1
CHROMA_DATABASE=developement
```

Notes:

- `CHROMA_API_KEY=YOUR_API_KEY` is still a placeholder, so Chroma storage will stay disabled until you replace it.
- The `OPENAI_API_KEY` is not bundled in the repo. If it is missing or invalid, the app still works using the heuristic review engine.

## Run locally

PowerShell on this machine blocks `npm.ps1`, so use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://localhost:4000
```

## Build for production

```powershell
npm.cmd install
npm.cmd run build
npm.cmd start
```

## Project structure

```text
frontend/src     React UI
server           Express API and review services
public           Static entry HTML and bundled frontend assets
scripts          Esbuild dev/build scripts
```

## Main API routes

- `GET /api/config` returns languages, features, and service status.
- `GET /api/history` returns review history and summary stats.
- `POST /api/review` analyzes pasted code and returns a full review payload.
- `GET /api/health` returns app health and service flags.
