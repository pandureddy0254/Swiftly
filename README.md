# ⚡ Swiftly

**AI-Powered Command Center for monday.com**

Swiftly is a monday.com marketplace app that turns your board data into actionable intelligence. Cross-board reporting, AI chat assistant, one-click task creation, and smart insights — all in one app.

![Swiftly](assets/logo.svg)

---

## Features

### 📊 Cross-Board Reporting
- Aggregate data across multiple boards in one view
- Full subitem support (something native dashboards can't do)
- KPI cards, bar charts, pie charts, and progress tables
- Status distribution and group breakdown analysis

### 🤖 Agentic AI Assistant
- Ask questions about your boards in natural language
- AI deep dives into tasks with expert analysis
- **One-click action buttons** — create subitems, update statuses, assign people directly from AI suggestions
- Powered by Claude Sonnet via OpenRouter (configurable model)

### 📥 One-Click Import
- AI suggests subtasks → click "Import" → subitems created on monday.com instantly
- No copy-pasting, no manual entry
- Works with any item across any board

### 📄 Export & Reports
- AI-generated professional status reports
- Export as PDF, TXT, or JSON
- Scheduled report delivery (coming soon)
- Enterprise-grade HTML reports with branding

### 🎯 Smart Insights
- Automatic risk detection and anomaly analysis
- Actionable insight cards with buttons (View Items, Create Action Plan, Send Reminder)
- Board health scoring and progress tracking

### 📈 Dashboard Widget
- At-a-glance KPI metrics
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
| **Charts** | Recharts |
| **Styling** | Custom CSS Design System (monday.com Vibe-inspired) |
| **Deployment** | Render.com / Monday Code |

---

## Project Structure

```
Swiftly/
├── src/
│   ├── app/                        # React Frontend
│   │   ├── App.jsx                 # Main app with 3-tab layout
│   │   ├── core/
│   │   │   ├── api/swiftly-client.js    # API client (all endpoints)
│   │   │   └── hooks/useMonday.js       # monday.com SDK integration
│   │   ├── features/
│   │   │   ├── reporting/          # Dashboard & Reports views
│   │   │   ├── ai-chat/           # AI Agent view with action buttons
│   │   │   └── dashboard-widget/  # KPI Dashboard Widget
│   │   └── styles/global.css      # Design system
│   │
│   └── server/                     # Express Backend
│       ├── index.js               # Server entry point
│       ├── config/                # Environment config
│       ├── middleware/auth.js     # monday.com auth + error handling
│       ├── routes/
│       │   ├── reporting.js       # Board data & report generation
│       │   ├── ai.js             # AI chat & insights
│       │   ├── actions.js        # Write operations (create/update/delete)
│       │   ├── export.js         # PDF/TXT/JSON export
│       │   └── health.js         # Health check
│       └── services/
│           ├── monday-api.js     # monday.com GraphQL client
│           ├── monday-actions.js # Write operations (mutations)
│           ├── ai-engine.js      # OpenRouter AI with action detection
│           └── pdf-generator.js  # HTML report generator
│
├── assets/                        # Logo & icons
├── scripts/                       # Dev utilities
├── tests/                         # Test suites
├── .env                          # Environment variables (not committed)
└── vite.config.js                # Vite build config
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- monday.com account with API token
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
MONDAY_API_TOKEN=your_monday_api_token
MONDAY_SIGNING_SECRET=your_signing_secret
MONDAY_CLIENT_ID=your_client_id
MONDAY_CLIENT_SECRET=your_client_secret
MONDAY_APP_ID=your_app_id

OPENROUTER_API_KEY=your_openrouter_key
AI_MODEL=anthropic/claude-sonnet-4

PORT=8080
NODE_ENV=development
```

### Running Locally

```bash
# Start both frontend + backend
npm run dev

# Or separately
npm run dev:server   # Express on :8080
npm run dev:client   # Vite on :3000
```

### Building for Production

```bash
npm run build        # Builds frontend
npm start            # Serves everything from :8080
```

---

## API Endpoints

### Data & Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/boards` | List all boards |
| GET | `/api/boards/:id` | Get board details |
| GET | `/api/boards/:id/items` | Get board items with subitems |
| POST | `/api/reports/generate` | Generate cross-board report with AI |
| POST | `/api/reports/quick` | Quick single-board report |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/chat` | AI chat with action buttons |
| POST | `/api/ai/insights` | Generate AI insights |

### Actions (Write Operations)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/actions/create-item` | Create a new item |
| POST | `/api/actions/create-subitems` | Create multiple subitems |
| POST | `/api/actions/update-item` | Update item columns |
| POST | `/api/actions/bulk-update` | Bulk update items |
| POST | `/api/actions/move-item` | Move item to group |
| POST | `/api/actions/delete-item` | Delete an item |
| GET | `/api/actions/users` | List all users |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/export/html` | HTML report (printable PDF) |
| POST | `/api/export/text` | Plain text report |
| POST | `/api/export/json` | JSON data export |

---

## AI Models (via OpenRouter)

Configure `AI_MODEL` in `.env` to use any model:

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
5. Deploy → get permanent URL

### Monday Code

1. Use `@mondaycom/apps-cli` to deploy
2. `mapps code:push` uploads to monday.com's hosting
3. SOC2, ISO 27001, GDPR, HIPAA compliant

---

## monday.com App Setup

1. Go to [developer.monday.com](https://developer.monday.com/apps/manage)
2. Create app → add **Board View** feature
3. Set Custom URL to your deployed URL
4. Install on your account
5. Open any board → Add View → Select "Swiftly"

---

## Roadmap

- [ ] Time tracking with subitem support
- [ ] Sprint management (burndown, velocity)
- [ ] OKR / Goal tracking
- [ ] Sidekick Skills integration
- [ ] Scheduled report delivery
- [ ] Team workload visualization
- [ ] Industry template packs
- [ ] monday.com marketplace submission

---

## License

Proprietary — All rights reserved.

---

Built with ⚡ by [Pandu Chinna](https://github.com/pandureddy0254)
