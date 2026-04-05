# Skill: Full Audit

## When to use
When user wants a comprehensive check of the codebase.

## Steps

### 1. Build verification
```bash
cd C:/Users/pandu/Downloads/Swiftly
npm test && npx vite build
```

### 2. Check for common issues
- CSS: `pointer-events`, `overflow: hidden`, `::before`/`::after` overlays blocking clicks
- State: stale closures in useCallback, toggle logic must be in reducer
- Auth: JWT verification, no hardcoded tokens in production
- Types: String(board.id) everywhere, no number/string mismatches
- Tabs: all mounted with display:none, never key={activeTab}

### 3. Run Playwright visual check
Navigate to http://localhost:8080, take screenshots of all 5 tabs, verify:
- Board chips toggle correctly on every tab
- Data loads without errors
- No "Failed to load" errors
- Selected count syncs across all tabs

### 4. API smoke test
```bash
curl -s http://localhost:8080/api/health
curl -s http://localhost:8080/api/boards -H "Authorization: Bearer standalone"
curl -s -X POST http://localhost:8080/api/reports/generate \
  -H "Authorization: Bearer standalone" \
  -H "Content-Type: application/json" \
  -d '{"boardIds":["5027626778"]}'
```

### 5. Console errors
Check browser console for errors on each tab via Playwright.
