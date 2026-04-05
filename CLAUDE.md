# Swiftly — AI-Powered Command Center for monday.com

## Project Overview
Swiftly is a monday.com marketplace MicroSaaS app that provides cross-board reporting, AI chat assistant, time tracking, and Sidekick skills in one unified app. Built for enterprise teams who need deep insights from their monday.com data.

## Tech Stack
- **Frontend:** React 18 + Vite + monday.com Vibe Design System (`@mondayhq/vibe`)
- **Backend:** Node.js + Express.js (hosted on Monday Code)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Monday.com SDK:** `monday-sdk-js` (client), `@mondaydotcom/api` (server)
- **Charts:** Recharts
- **PDF:** @react-pdf/renderer
- **Testing:** Vitest (unit), Playwright (e2e)

## Project Structure
```
Swiftly/
├── src/
│   ├── app/                     # React frontend (Vite)
│   │   ├── features/
│   │   │   ├── reporting/       # Cross-board reporting view
│   │   │   ├── ai-chat/        # AI chat assistant view
│   │   │   └── dashboard-widget/# Dashboard KPI widget
│   │   ├── core/
│   │   │   ├── api/            # Monday client + GraphQL queries
│   │   │   ├── components/     # Shared UI components
│   │   │   └── hooks/          # Shared React hooks
│   │   └── styles/             # Global styles
│   └── server/                  # Express backend
│       ├── routes/             # API endpoints
│       ├── services/           # Business logic
│       ├── middleware/         # Auth, error handling
│       └── config/             # Environment config
├── tests/
├── assets/                      # App icon, images
└── public/                      # Static files
```

## Monday.com App Features (registered in app manifest)
1. **Board View: Swiftly Reports** — Cross-board reporting with subitems
2. **Board View: Swiftly AI Chat** — AI assistant for board data Q&A
3. **Dashboard Widget: Swiftly KPIs** — KPI cards and charts
4. **Sidekick Skill: Generate Report** — AI status report generation
5. **Sidekick Skill: Analyze Board** — AI board analysis

## Key Architecture Decisions
- All Monday.com API calls go through the backend (server-side token, not client-side)
- AI processing is server-side only (API keys never exposed to frontend)
- Cross-board data aggregation uses the server-side GraphQL client with pagination
- Subitem traversal fetches subitems in batches to respect rate limits
- Frontend communicates with backend via REST API endpoints
- Monday.com webhook events handled by Express routes

## API Keys (via environment variables)
- `MONDAY_API_TOKEN` — Monday.com API token
- `ANTHROPIC_API_KEY` — Claude API key (for AI features)
- `MONDAY_SIGNING_SECRET` — Webhook verification
- `PORT` — Server port (default 8080)

## Commands
- `npm run dev` — Start both frontend (Vite) and backend (Express) in dev mode
- `npm run dev:client` — Frontend only
- `npm run dev:server` — Backend only
- `npm run build` — Production build
- `npm run test` — Run unit tests
- `npm run test:e2e` — Run Playwright e2e tests
- `npm run lint` — ESLint check

## Monday.com API Conventions
- Always use API version `2025-04` or later
- Paginate board queries with `limit` and `cursor`
- Subitem queries: fetch via `subitems { id name column_values { id text value } }`
- Rate limit: 10,000,000 complexity points/min, 5,000 requests/min
- Use `items_page_by_column_values` for filtered queries

## Code Style
- ES Modules (`import/export`)
- Functional React components with hooks
- No class components
- Use Monday Vibe components for ALL UI elements
- Error boundaries on every feature view
- Async/await everywhere (no raw promises)
- Environment variables via dotenv (never hardcode secrets)
