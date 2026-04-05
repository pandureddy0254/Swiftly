# Swiftly

**AI-Powered Command Center for monday.com**

Swiftly is a monday.com marketplace app that turns your board data into actionable intelligence. Cross-board reporting, AI chat assistant, sprint management, time tracking, and smart insights — all in one unified command center.

---

## Features

### Dashboard — Command Center
- Health score gauge with breakdown analysis
- Smart suggestions (rule-based + AI-powered)
- Board overview cards with progress tracking
- Activity timeline across all boards
- Quick action buttons for common workflows

### AI Agent
- Ask questions about your boards in natural language
- AI deep dives into tasks with expert analysis
- **One-click action buttons** — create subitems, update statuses, assign people directly from AI suggestions
- Conversation memory within sessions
- Powered by Claude Sonnet via OpenRouter (configurable model)

### Sprint Management
- Kanban board (Backlog / To Do / In Progress / Done)
- Burndown chart with ideal vs actual progress
- Velocity metrics and story point tracking
- AI-powered sprint summary

### Time Tracking
- Start/stop timer with item selector
- Billable vs non-billable toggle
- Subitem time rollup to parent items
- Weekly and monthly bar charts
- Full time log with export capability
- LocalStorage persistence (works offline)

### Reports & Export
- AI-generated professional status reports
- Cross-board KPI cards, bar charts, pie charts
- Board breakdown tables with item-level detail
- AI insight cards with action buttons
- Export as PDF (HTML), TXT, or JSON

### Dashboard Widget
- At-a-glance KPI metrics for monday.com dashboards
- Circular progress ring with board breakdown
- Status distribution bars
- Auto-refreshes every 5 minutes

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **AI** | OpenRouter (Claude Sonnet, GPT-4o, Gemini, Llama) |
| **monday.com** | monday-sdk-js + GraphQL API (v2025-04) |
| **Auth** | JWT verification of monday.com session tokens |
| **Charts** | Recharts |
| **Styling** | Custom CSS Design System (monday.com-inspired) |
| **Testing** | Vitest (64 unit tests) + Playwright (e2e) |
| **Deployment** | Render.com (auto-deploy from GitHub) |

---

## Project Structure

```
Swiftly/
├── src/
│   ├── app/                          # React Frontend
│   │   ├── App.jsx                   # 5-tab layout
│   │   ├── core/
│   │   │   ├── api/swiftly-client.js # REST API client
│   │   │   ├── components/           # Shared: BoardSelector, Toast
│   │   │   ├── hooks/useMonday.js    # monday.com SDK integration
│   │   │   └── state/               # SwiftlyContext (React Context + useReducer)
│   │   ├── features/
│   │   │   ├── dashboard/            # Command center (9 components)
│   │   │   ├── ai-chat/              # AI agent (4 components)
│   │   │   ├── sprint/               # Sprint management (5 components)
│   │   │   ├── time-tracking/        # Time tracking (6 components)
│   │   │   ├── reporting/            # Reports & export (5 components)
│   │   │   └── dashboard-widget/     # KPI widget
│   │   └── styles/global.css         # Full design system
│   │
│   └── server/                        # Express Backend
│       ├── index.js                   # Server entry
│       ├── config/                    # Environment config
│       ├── middleware/auth.js         # JWT auth + error handling
│       ├── routes/                    # reporting, ai, actions, export, health
│       └── services/                  # monday-api, ai-engine, monday-actions, pdf-generator
│
├── tests/unit/                        # 64 unit tests (5 test files)
├── assets/                            # PNG logos (192/512/1024)
├── scripts/pre-deploy.js              # CI pipeline
└── .claude/                           # AI assistant rules & skills
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- monday.com developer account
- OpenRouter API key (for AI features)

### Installation

```bash
git clone https://github.com/pandureddy0254/Swiftly.git
cd Swiftly
npm install
```

### Configuration

Create a `.env` file:

```env
# Required for production (JWT verification)
MONDAY_SIGNING_SECRET=your_signing_secret

# Optional — dev/standalone mode fallback
MONDAY_API_TOKEN=your_monday_api_token

# AI (developer pays — standard SaaS model)
OPENROUTER_API_KEY=your_openrouter_key
AI_MODEL=anthropic/claude-sonnet-4

# Server
PORT=8080
NODE_ENV=development
```

### Running Locally

```bash
# Build and start
npm run build
npm start
# Open http://localhost:8080
```

### Testing

```bash
npm test                    # Run all 64 unit tests
npm run test:coverage       # With coverage report
npm run predeploy           # Full pipeline: secret scan + tests + build + verify
```

---

## API Endpoints

All endpoints (except `/api/health`) require `Authorization: Bearer <token>`.

### Data & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/boards` | List all boards (paginated, 200/page) |
| GET | `/api/boards/:id` | Get board details with columns/groups |
| GET | `/api/boards/:id/items` | Get board items with subitems |
| POST | `/api/reports/generate` | Generate cross-board report with AI |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI chat with full item context + action buttons |
| POST | `/api/ai/insights` | Generate AI insights for boards |
| DELETE | `/api/ai/chat/:sessionId` | Clear chat session |

### Actions (Write Operations)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/create-item` | Create a new item |
| POST | `/api/actions/create-subitems` | Create multiple subitems |
| POST | `/api/actions/update-item` | Update item columns |
| POST | `/api/actions/bulk-update` | Bulk update items |
| POST | `/api/actions/move-item` | Move item to group |
| POST | `/api/actions/delete-item` | Delete an item |
| POST | `/api/actions/archive-item` | Archive an item |
| POST | `/api/actions/create-group` | Create a new group |
| GET | `/api/actions/users` | List workspace users |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export/html` | HTML report (printable as PDF) |
| POST | `/api/export/text` | Plain text report with AI analysis |
| POST | `/api/export/json` | JSON data export |

---

## Authentication

### For Marketplace Users (Production)
1. User installs Swiftly from monday.com marketplace
2. monday.com SDK provides a JWT session token
3. Server verifies JWT using the app's signing secret
4. Extracts `shortLivedToken` — used for API calls on behalf of that user
5. Each user sees **only their own boards and data**

### For Local Development
- Set `MONDAY_API_TOKEN` in `.env`
- Frontend sends `Bearer standalone` → server uses the env token as fallback

---

## AI Models (via OpenRouter)

Configure `AI_MODEL` in `.env`:

| Model | Quality | Speed | Cost |
|-------|---------|-------|------|
| `anthropic/claude-sonnet-4` | Best | Medium | $$ |
| `openai/gpt-4o` | Great | Fast | $$ |
| `google/gemini-2.0-flash-001` | Good | Fastest | $ |
| `meta-llama/llama-3.3-70b-instruct` | Good | Fast | Free |

---

## Deployment

### Render.com (Recommended)

1. Connect GitHub repo on [render.com](https://render.com)
2. **Build Command:** `npm install && npm run build`
3. **Start Command:** `npm start`
4. Add environment variables in Render dashboard
5. Push to `main` → auto-deploys

### monday.com App Setup

1. Go to [developer.monday.com](https://developer.monday.com/apps/manage)
2. Create app → add **Board View** feature
3. Set Custom URL to your Render URL
4. Set OAuth scopes: `boards:read`, `boards:write`, `users:read`
5. Install on your account → open any board → Add View → "Swiftly"

---

## Architecture Highlights

- **Multi-tenant:** Each user's data is isolated via JWT-verified session tokens
- **State preserved across tabs:** All 5 tabs stay mounted (CSS `display:none`), no data loss when switching
- **Shared state:** React Context + useReducer with 5-minute TTL cache
- **Rate limit resilient:** Exponential backoff on Monday.com API 429 responses (3 retries)
- **30-second timeouts:** AbortController on all API calls
- **Cache-busted:** Static assets served with `max-age=0` to prevent stale bundles
- **AI fallback:** App works without AI — reports degrade to data-only mode

---

## License

Proprietary — All rights reserved.

---

Built with speed by [Pandu Chinna](https://github.com/pandureddy0254)
