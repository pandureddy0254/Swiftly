# API Keys Reference

## Monday.com
- **API Token:** Set in .env as MONDAY_API_TOKEN
- **Client ID:** 3ce58d1bb51ce05bfd065244cf6a0901
- **Client Secret:** Set in .env as MONDAY_CLIENT_SECRET
- **Signing Secret:** Set in .env as MONDAY_SIGNING_SECRET
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

## Firecrawl
- **API Key:** Set in .env (for marketplace research, not used in app)

## Render.com
- **API Key:** Set separately in Render dashboard
- **Deployment:** Auto-deploys from GitHub main branch

## Monday.com Board IDs (Test Data)
- Marketing Campaign Q2: 5027626777
- Product Development Sprint 14: 5027626778
- Sales Pipeline 2026: 5027626779
- Welcome board: 5027625311

## IMPORTANT
- NEVER commit actual API keys to git
- Keys are stored in .env (gitignored)
- This file only references key NAMES, not values
