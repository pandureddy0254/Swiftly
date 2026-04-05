# API Keys Reference

## Monday.com
- **API Token:** Set in .env as MONDAY_API_TOKEN (dev/standalone fallback only)
- **Signing Secret:** Set in .env as MONDAY_SIGNING_SECRET (required — JWT verification)
- **Client ID:** 3ce58d1bb51ce05bfd065244cf6a0901
- **Client Secret:** Set in .env as MONDAY_CLIENT_SECRET
- **App ID:** 11092514
- **App Name:** Swiftly
- **Account:** panduchinna54's Team (ID: 34527705)
- **Account Slug:** panduchinna54s-team-company
- **API Version:** 2025-04
- **Region:** apse2

## OpenRouter
- **Chat API Key:** Set in .env as OPENROUTER_API_KEY (use chat key, NOT management key)
- **Default Model:** anthropic/claude-sonnet-4
- **Endpoint:** https://openrouter.ai/api/v1/chat/completions
- **Cost:** Developer pays (standard SaaS model)

## Firecrawl
- **API Key:** Set in .env (for marketplace research, not used in app)

## Render.com
- **Live URL:** https://swiftly-2gqs.onrender.com
- **Deployment:** Auto-deploys from GitHub main branch on push
- **Dashboard:** https://dashboard.render.com

## Multi-tenant Auth Flow
1. User installs Swiftly from Monday.com marketplace
2. Monday SDK provides sessionToken (JWT) in iframe
3. Frontend sends JWT as Bearer token to backend
4. Backend verifies JWT using MONDAY_SIGNING_SECRET
5. Extracts shortLivedToken from JWT payload → uses for that user's API calls
6. Each user sees ONLY their own boards/data
7. AI costs are on developer's OpenRouter key

## Monday.com Board IDs (Dev Test Data)
- Marketing Campaign Q2: 5027626777
- Product Development Sprint 14: 5027626778
- Sales Pipeline 2026: 5027626779
- Subitems of Product Dev Sprint 14: 5027631916
- Welcome board: 5027625311

## IMPORTANT
- NEVER commit actual API keys to git
- Keys are stored in .env (gitignored)
- This file only references key NAMES, not values
- MONDAY_API_TOKEN is NOT needed in production — each user's JWT provides their token
