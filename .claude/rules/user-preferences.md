# User Preferences — Pandu Chinna

## Communication Style
- Be direct, no fluff — get to the point
- Don't give vague summaries — give specifics
- When presenting ideas, show concrete examples (not just descriptions)
- Use tables for comparisons
- Don't over-explain things the user already understands

## Development Approach
- User wants to build a MicroSaaS, not separate small apps
- Prefers doing everything in parallel for speed
- Values working features over perfect code — ship fast, iterate
- Wants enterprise-grade quality but fast delivery
- User validates ideas with multiple LLMs (Grok, ChatGPT) — be thorough in reasoning

## Things User Has Corrected
- "It is vague" — AI responses were too generic, not using actual item data. Fixed by passing full item-level data to AI.
- "Not looking good right now" — V1 was a proof of concept, not a product. User expects polished, action-oriented UI.
- "It should provide a directly option to import them into monday.com" — AI suggestions must have one-click action buttons, not just text.
- "Use a better model" — Switched from Gemini Flash to Claude Sonnet for quality.
- "This has to be intelligent agentic AI" — AI must combine board data with domain expertise, never say "I can't".
- "Not for some random company" — Build for enterprise, not hobby projects.

## Technical Preferences
- OpenRouter for AI (not direct Anthropic SDK) — flexibility to switch models
- Prefers Render.com for deployment
- Has Monday.com developer account + API key
- Has OpenRouter API key (chat key, not management key)
- Has Firecrawl API key for web scraping
- Uses Windows 10 with bash shell
- Uses Synthesia for marketing videos

## Component Architecture
- Break large view files into smaller focused components (keep files under ~300 lines)
- Makes debugging easier — can read one component instead of 1000 lines
- Each feature should have its own folder with sub-components

## Deployment Pipeline
- ALWAYS run the deploy pipeline (npm run predeploy → git push) after completing fixes
- Do NOT wait for user to tell you to deploy — do it automatically
- Use the deploy skill after every completed fix/feature batch
- Push to GitHub triggers Render auto-deploy

## What NOT To Do
- Don't build vague/generic features — everything must be specific and actionable
- Don't use tunnels that keep dying (localtunnel, cloudflared) for production — deploy to real hosting
- Don't use @mondaycom/apps-cli in production builds — it breaks with patch-package
- Don't put vite in devDependencies — Render.com won't install it
- Don't use Anthropic SDK directly — use OpenRouter REST API
- Don't send null parentItemId when creating subitems
- Don't include management API keys when chat API keys are needed
- Don't use column_values { title } — use column_values { column { title } } for API 2025-04
- Don't use unused GraphQL variables (e.g., $cursor when not referenced in query)
