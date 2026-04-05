# Skill: Test API Endpoints

## When to use
When user wants to verify the API is working correctly.

## Quick Test Suite
```bash
# Health
curl -s http://localhost:8080/api/health | python3 -m json.tool

# List boards
curl -s http://localhost:8080/api/boards | python3 -c "import sys,json; [print(f'  {b[\"id\"]}: {b[\"name\"]}') for b in json.load(sys.stdin).get('boards',[])]"

# Generate report
curl -s -X POST http://localhost:8080/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"boardIds": ["5027626777", "5027626778", "5027626779"]}'

# AI chat
curl -s -X POST http://localhost:8080/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Give me a summary of all boards", "boardIds": ["5027626777", "5027626778", "5027626779"]}'

# Create subitems
curl -s -X POST http://localhost:8080/api/actions/create-subitems \
  -H "Content-Type: application/json" \
  -d '{"parentItemId": "ITEM_ID", "subitems": [{"name": "Subtask 1"}, {"name": "Subtask 2"}]}'

# Export HTML report
curl -s -X POST http://localhost:8080/api/export/html \
  -H "Content-Type: application/json" \
  -d '{"boardIds": ["5027626778"]}'
```

## Test Board IDs
- Marketing Campaign Q2: 5027626777
- Product Development Sprint 14: 5027626778
- Sales Pipeline 2026: 5027626779
