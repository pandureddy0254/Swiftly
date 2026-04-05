# Swiftly — Project Rules

## Product Vision
- Swiftly is a MicroSaaS, NOT a collection of small apps
- One app that keeps growing with features — users install once, get everything
- Built for enterprise teams, not hobbyists
- Every feature must be production-grade, not a proof of concept

## Architecture Rules
- All Monday.com API calls go through the backend (never expose tokens to frontend)
- AI processing is server-side only (API keys never in client code)
- Frontend communicates with backend via REST API endpoints only
- Use OpenRouter for AI (not Anthropic SDK directly) — allows model switching
- Environment variables via .env — never hardcode secrets
- ES Modules everywhere (import/export, not require)

## AI/Chat Rules
- AI must NEVER give vague/generic responses — always reference specific item names, IDs, and numbers
- AI must NEVER say "I cannot do that" — always provide value using board data + domain expertise
- When AI suggests subtasks, it MUST include action buttons to import them into Monday.com
- When AI deep dives into a task, provide: scope, best practices, risks, effort estimate, and importable subtasks
- Auto-detect actions from AI text if the model doesn't generate the ACTIONS block
- Every AI suggestion should be actionable with one click

## UI/UX Rules
- Use Monday.com Vibe-inspired design tokens (colors, spacing, typography)
- Every insight card must have action buttons (not just text)
- Toast notifications for all user actions (success/error)
- No generic "AI slop" aesthetics — must feel enterprise-grade
- Action buttons must show loading state, then checkmark when done
- Never show a dead-end — always give the user a next action

## Code Quality
- Functional React components with hooks only (no class components)
- Async/await everywhere (no raw .then() chains)
- Error boundaries on every feature view
- Graceful fallbacks when AI is unavailable (fallback reports still work)
- No unused variables, no commented-out code
- Keep files focused — one component per file

## Monday.com API
- Always use API version 2025-04 or later
- column_values use `column { title }` not `title` directly (changed in 2025-04)
- Paginate board queries with limit and cursor
- Rate limit: 10M complexity points/min, 5K requests/min
- Subitem queries: fetch via `subitems { id name column_values { ... } }`
- parentItemId must NEVER be null when creating subitems — validate before calling API

## Deployment
- Never commit .env files
- Never commit node_modules or dist folders
- Build command: `npm install && npm run build`
- Start command: `npm start`
- vite and @vitejs/plugin-react must be in dependencies (not devDependencies) for production builds
- Do NOT include @mondaycom/apps-cli in production — it breaks builds with patch-package errors

## Git
- Meaningful commit messages explaining WHY, not just what
- Never push secrets to GitHub
- Always verify build passes before pushing
