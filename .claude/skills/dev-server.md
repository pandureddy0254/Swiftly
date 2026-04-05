# Skill: Start Dev Server

## When to use
When user wants to test the app locally or needs the server running.

## Commands
```bash
# Kill existing server, build, and start fresh
cd C:/Users/pandu/Downloads/Swiftly
pkill -f "node.*server" 2>/dev/null
npx vite build
npm start &>/dev/null &
sleep 3
curl -s http://localhost:8080/api/health
```

## Quick restart (no rebuild)
```bash
cd C:/Users/pandu/Downloads/Swiftly
pkill -f "node.*server" 2>/dev/null
npm start &>/dev/null &
sleep 3
echo "Server ready at http://localhost:8080"
```

## Verify
```bash
curl -s http://localhost:8080/api/health
# Expected: {"status":"ok","app":"Swiftly","version":"1.0.0",...}
```

## Ports
- Server: 8080 (serves both API and built frontend)
- No separate frontend dev server needed — always build then serve

## Notes
- Static assets served with max-age=0 (no caching issues)
- Standalone mode: token = "standalone", uses MONDAY_API_TOKEN from env
- Inside Monday.com: token = JWT sessionToken, verified with signing secret
