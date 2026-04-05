# Swiftly — Project Rules

## Product Vision
- Swiftly is a MicroSaaS, NOT a collection of small apps
- One app that keeps growing with features — users install once, get everything
- Built for enterprise teams, not hobbyists
- Every feature must be production-grade, not a proof of concept
- App is sold on Monday.com marketplace — must work for OTHER users, not just the developer

## Architecture Rules
- All Monday.com API calls go through the backend (never expose tokens to frontend)
- Multi-tenant auth: verify JWT session tokens server-side, extract shortLivedToken per user
- MONDAY_API_TOKEN is for dev/standalone mode ONLY — production uses per-user JWT tokens
- AI processing is server-side only (OpenRouter API key never in client code)
- Frontend communicates with backend via REST API endpoints only
- Use OpenRouter for AI (not Anthropic SDK directly) — allows model switching
- Environment variables via .env — never hardcode secrets
- ES Modules everywhere (import/export, not require)
- CORS locked to *.monday.com in production

## Component Architecture
- Break large view files into smaller focused components (keep under ~300 lines)
- Each feature has its own folder with sub-components
- Use the shared BoardSelector component from @core/components/BoardSelector
- Use the shared Toast component from @core/components/Toast
- All tabs always mounted (display:none), never use key={activeTab} for tab switching
- Toggle logic must be in the reducer (TOGGLE_BOARD action), never in useCallback closures
- fetchDashboardData takes boardIds as a parameter, never reads from closure state

## AI/Chat Rules
- AI must NEVER give vague/generic responses — always reference specific item names, IDs, and numbers
- AI must NEVER say "I cannot do that" — always provide value using board data + domain expertise
- When AI suggests subtasks, it MUST include action buttons to import them into Monday.com
- Auto-detect actions from AI text if the model doesn't generate the ACTIONS block
- Every AI suggestion should be actionable with one click

## UI/UX Rules
- Use Monday.com-inspired design tokens (colors, spacing, typography)
- Every insight card must have action buttons (not just text)
- Toast notifications for all user actions (success/error)
- No generic "AI slop" aesthetics — must feel enterprise-grade
- Never show a dead-end — always give the user a next action
- .swiftly-card::before MUST have pointer-events: none (decorative overlay blocks clicks otherwise)
- Board chips use String(board.id) everywhere for type consistency

## Code Quality
- Functional React components with hooks only (no class components)
- Async/await everywhere (no raw .then() chains)
- Graceful fallbacks when AI is unavailable (fallback reports still work)
- No unused variables, no commented-out code
- Keep files focused — one component per file
- All 64 tests must pass before pushing

## Monday.com API
- Always use API version 2025-04
- column_values use `column { title }` not `title` directly (breaking change in 2025-04)
- Paginate: getBoards uses page-based (200/page), getBoardItems uses cursor-based
- Retry on HTTP 429 with exponential backoff (3 retries)
- 30-second fetch timeout via AbortController
- parentItemId must NEVER be null when creating subitems

## Deployment
- ALWAYS run tests + build + push after completing fixes — don't wait to be told
- Never commit .env files
- Never commit node_modules or dist folders
- Build command: `npm install && npm run build`
- Start command: `npm start`
- vite and @vitejs/plugin-react must be in dependencies (not devDependencies)
- Do NOT include @mondaycom/apps-cli in production
- Push to main triggers Render.com auto-deploy
- Static assets served with max-age=0 to prevent stale bundles

## Git
- Always use pandureddy0254 account for this repo
- Meaningful commit messages explaining WHY, not just what
- Never push secrets to GitHub
- Always verify build passes before pushing
