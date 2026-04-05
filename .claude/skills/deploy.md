# Skill: Deploy to Production

## When to use
When user wants to deploy or update the production app.

## Steps

### 1. Build & verify locally
```bash
cd C:/Users/pandu/Downloads/Swiftly
npm run build
npm start
# Test: curl http://localhost:8080/api/health
```

### 2. Commit & push
```bash
cd C:/Users/pandu/Downloads/Swiftly
git add -A
git commit -m "description of changes"
git push origin main
```

### 3. Render auto-deploys from main branch
- Dashboard: https://dashboard.render.com
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables are set in Render dashboard

### 4. Verify deployment
```bash
curl -s https://YOUR_RENDER_URL/api/health
```

## Environment Variables (Render)
- MONDAY_API_TOKEN
- OPENROUTER_API_KEY
- AI_MODEL=anthropic/claude-sonnet-4
- MONDAY_SIGNING_SECRET
- NODE_ENV=production
- PORT=8080
