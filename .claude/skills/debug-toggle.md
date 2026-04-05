# Skill: Debug Board Toggle

## When to use
When board chip toggle stops working on any tab.

## Root cause checklist
1. **CSS overlay?** Check `.swiftly-card::before` has `pointer-events: none`
2. **Inside swiftly-card?** BoardSelector inside a card div can be blocked by hover overlays
3. **String vs number?** All board IDs must use `String(board.id)` 
4. **Stale closure?** Toggle logic must be in the TOGGLE_BOARD reducer case, NOT in useCallback
5. **fetchDashboardData race?** Must take boardIds as parameter, not read from closure

## Quick test
```bash
# Start server
cd C:/Users/pandu/Downloads/Swiftly
pkill -f "node.*server" 2>/dev/null
npx vite build && npm start &>/dev/null &
sleep 3
```

Then use Playwright:
1. Navigate to http://localhost:8080
2. Wait for dashboard to load
3. Switch to failing tab
4. Use `elementFromPoint` to check if chip is covered
5. Check computed `pointer-events` on chip and all ancestors
6. Try real Playwright click (not JS .click()) — if Playwright click works but user click doesn't, it's a CSS overlay

## Key files
- `src/app/core/components/BoardSelector.jsx` — shared component
- `src/app/core/state/SwiftlyContext.jsx` — TOGGLE_BOARD reducer
- `src/app/styles/global.css` — .swiftly-card::before
