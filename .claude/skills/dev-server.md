# Skill: Start Dev Server

## When to use
When user wants to test the app locally or needs the server running.

## Commands
```bash
# Start both frontend + backend
cd C:/Users/pandu/Downloads/Swiftly && npm run dev

# Backend only (port 8080)
cd C:/Users/pandu/Downloads/Swiftly && node src/server/index.js

# Build frontend then serve everything from backend
cd C:/Users/pandu/Downloads/Swiftly && npm run build && npm start
```

## Verify
```bash
curl -s http://localhost:8080/api/health
```

## Ports
- Backend: 8080
- Frontend (dev): 3000 (proxies /api to 8080)
