# Skill: Deploy to Production

## When to use
ALWAYS after completing fixes or features. Do NOT wait for user to ask.

## Steps

### 1. Test
```bash
cd C:/Users/pandu/Downloads/Swiftly
npm test
```
All 64 tests must pass.

### 2. Build
```bash
cd C:/Users/pandu/Downloads/Swiftly
npx vite build
```

### 3. Verify locally (optional)
```bash
cd C:/Users/pandu/Downloads/Swiftly
pkill -f "node.*server" 2>/dev/null
npm start &>/dev/null &
sleep 3
curl -s http://localhost:8080/api/health
```

### 4. Commit & Push
```bash
cd C:/Users/pandu/Downloads/Swiftly
git add -A
git commit -m "description of changes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin main
```
Git is configured to use pandureddy0254 account for this repo.

### 5. Render auto-deploys from main branch
- Live URL: https://swiftly-2gqs.onrender.com
- Dashboard: https://dashboard.render.com
- Build command: `npm install && npm run build`
- Start command: `npm start`

### 6. Verify deployment
```bash
curl -s https://swiftly-2gqs.onrender.com/api/health
```

## Environment Variables (Render)
- MONDAY_SIGNING_SECRET (required)
- OPENROUTER_API_KEY
- AI_MODEL=anthropic/claude-sonnet-4
- MONDAY_API_TOKEN (optional dev fallback)
- NODE_ENV=production
- PORT=8080

## Full pipeline shortcut
```bash
cd C:/Users/pandu/Downloads/Swiftly
npm run predeploy
# Runs: secret scan → tests → build → verify
```
