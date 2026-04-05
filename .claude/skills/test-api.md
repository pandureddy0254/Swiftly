# Skill: Test API Endpoints

## When to use
When user wants to verify the API is working correctly.

## Quick Test Suite
```bash
# Health
curl -s http://localhost:8080/api/health | python3 -m json.tool

# List boards (standalone mode)
curl -s http://localhost:8080/api/boards \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json"

# Generate report
curl -s -X POST http://localhost:8080/api/reports/generate \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"boardIds": ["5027626777", "5027626778", "5027626779"]}'

# AI chat
curl -s -X POST http://localhost:8080/api/ai/chat \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"question": "Give me a summary of all boards", "boardIds": ["5027626777", "5027626778", "5027626779"]}'

# AI insights
curl -s -X POST http://localhost:8080/api/ai/insights \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"boardIds": ["5027626778"]}'

# Create subitems
curl -s -X POST http://localhost:8080/api/actions/create-subitems \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"parentItemId": "ITEM_ID", "subitems": [{"name": "Subtask 1"}, {"name": "Subtask 2"}]}'

# Export HTML report
curl -s -X POST http://localhost:8080/api/export/html \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"boardIds": ["5027626778"]}'
```

## Important
- All API endpoints (except /health) require `Authorization: Bearer <token>` header
- In standalone mode, use `Bearer standalone` — server falls back to MONDAY_API_TOKEN from env
- In production (inside Monday.com), the frontend sends the JWT session token automatically

## Test Board IDs
- Marketing Campaign Q2: 5027626777
- Product Development Sprint 14: 5027626778
- Sales Pipeline 2026: 5027626779
- Welcome board: 5027625311
