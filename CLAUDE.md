# Swiftly — AI-Powered Command Center for monday.com

## Project Overview
Swiftly is a monday.com marketplace MicroSaaS app that provides a unified command center with cross-board reporting, AI chat assistant, sprint management, time tracking, and exportable reports. Built for enterprise teams who need deep insights and actions from their monday.com data. Designed to be sold on the Monday.com marketplace.

## Tech Stack
- **Frontend:** React 18 + Vite (functional components + hooks only)
- **Backend:** Node.js + Express.js (deployed on Render.com)
- **AI:** OpenRouter REST API (model: `anthropic/claude-sonnet-4`)
- **Monday.com:** `monday-sdk-js` (client sessionToken), JWT verification (server)
- **Charts:** Recharts
- **Testing:** Vitest (unit — 64 tests), Playwright (e2e via MCP)
- **Auth:** JWT verification of Monday.com session tokens via signing secret

## Project Structure
```
Swiftly/
├── src/
│   ├── app/                          # React frontend (Vite)
│   │   ├── App.jsx                   # 5-tab layout, all tabs always mounted (display:none)
│   │   ├── features/
│   │   │   ├── dashboard/            # Command center (9 sub-components)
│   │   │   │   ├── DashboardView.jsx # Orchestrator (~350 lines)
│   │   │   │   ├── HealthGauge.jsx
│   │   │   │   ├── SuggestionCards.jsx
│   │   │   │   ├── BoardOverviewCards.jsx
│   │   │   │   ├── ActivityTimeline.jsx
│   │   │   │   ├── QuickActions.jsx
│   │   │   │   ├── DashboardSkeleton.jsx
│   │   │   │   └── dashboardUtils.js
│   │   │   ├── ai-chat/              # AI agent (4 sub-components)
│   │   │   │   ├── AiChatView.jsx
│   │   │   │   ├── ChatMessage.jsx
│   │   │   │   ├── ChatInput.jsx
│   │   │   │   └── WelcomeScreen.jsx
│   │   │   ├── sprint/               # Sprint management (5 sub-components)
│   │   │   │   ├── SprintView.jsx
│   │   │   │   ├── KanbanBoard.jsx
│   │   │   │   ├── BurndownChart.jsx
│   │   │   │   ├── VelocityMetrics.jsx
│   │   │   │   └── SprintSummary.jsx
│   │   │   ├── time-tracking/        # Time tracking (6 sub-components)
│   │   │   │   ├── TimeTrackingView.jsx
│   │   │   │   ├── Timer.jsx
│   │   │   │   ├── TimeLog.jsx
│   │   │   │   ├── TimeCharts.jsx
│   │   │   │   ├── TimeSummary.jsx
│   │   │   │   └── timeTrackingUtils.js
│   │   │   ├── reporting/            # Reports + exports (5 sub-components)
│   │   │   │   ├── ReportingView.jsx
│   │   │   │   ├── ReportCharts.jsx
│   │   │   │   ├── ReportSummary.jsx
│   │   │   │   ├── InsightCards.jsx
│   │   │   │   └── ExportButtons.jsx
│   │   │   └── dashboard-widget/     # KPI widget for monday.com dashboard
│   │   ├── core/
│   │   │   ├── api/swiftly-client.js # REST API client
│   │   │   ├── components/           # Shared: BoardSelector, Toast
│   │   │   ├── hooks/useMonday.js    # Monday SDK + standalone fallback
│   │   │   └── state/                # SwiftlyContext (useReducer + 5-min cache)
│   │   └── styles/global.css         # Full design system
│   └── server/
│       ├── index.js                  # Express app, CORS, static serving
│       ├── routes/                   # reporting, ai, actions, export, health
│       ├── services/                 # monday-api, ai-engine, monday-actions, pdf-generator
│       ├── middleware/auth.js        # JWT verification, standalone fallback
│       └── config/index.js           # Environment config
├── tests/unit/                       # 64 tests across 5 test files
├── assets/                           # PNG logos (192/512/1024)
├── scripts/pre-deploy.js             # Secret scan → tests → build → verify
└── .claude/                          # Rules, skills, settings
```

## Key Architecture Decisions
- **Multi-tenant auth:** Server verifies Monday.com JWT session tokens, extracts shortLivedToken per user
- **All tabs always mounted:** Uses CSS `display:none` (not conditional rendering) to preserve state across tab switches
- **Shared state:** React Context + useReducer with 5-minute TTL cache, shared BoardSelector component
- **Toggle logic in reducer:** TOGGLE_BOARD action handled in reducer to avoid stale closures
- **fetchDashboardData takes boardIds param:** Prevents race conditions when multiple tabs call simultaneously
- **AI costs on developer:** OpenRouter API key is server-side only, users never provide AI keys
- **Cache-busting:** Static assets served with max-age=0 to prevent stale bundles

## Environment Variables
- `MONDAY_SIGNING_SECRET` — Required in production (JWT verification)
- `MONDAY_API_TOKEN` — Optional (dev/standalone fallback only)
- `OPENROUTER_API_KEY` — AI features (developer pays)
- `AI_MODEL` — Default: `anthropic/claude-sonnet-4`
- `NODE_ENV` — `production` for marketplace, locks CORS to *.monday.com
- `PORT` — Default 8080

## Commands
- `npm start` — Production server (serves built frontend)
- `npm run build` — Vite production build
- `npm test` — Run all 64 unit tests (Vitest)
- `npm run test:coverage` — Tests with v8 coverage
- `npm run predeploy` — Full pipeline: secret scan → tests → build → verify
- `npm run deploy` — predeploy + git push (triggers Render auto-deploy)

## Monday.com API Conventions
- Always use API version `2025-04`
- Use `column_values { column { title } }` NOT `column_values { title }` (breaking change in 2025-04)
- Paginate: `getBoards` uses page-based (200/page), `getBoardItems` uses cursor-based
- Rate limits: retry with exponential backoff on HTTP 429 (3 retries)
- 30-second fetch timeout via AbortController
- parentItemId must NEVER be null when creating subitems

## CSS Architecture
- `.swiftly-card::before` has `pointer-events: none` — decorative overlay must never block clicks
- `.swiftly-board-chip` / `.swiftly-board-chip--selected` — shared chip styles
- `.swiftly-board-selector-*` — 6 classes for the shared BoardSelector component
- Responsive breakpoints at 768px and 480px
- Toast has entry (slideUp) + exit (fadeOut) animations
