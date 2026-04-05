# Skill: Add New Feature

## When to use
When building a new feature tab or sub-feature.

## Component structure
Every feature lives in `src/app/features/<feature-name>/`:
```
src/app/features/<feature-name>/
├── <FeatureName>View.jsx    # Orchestrator (max ~300 lines)
├── <SubComponent1>.jsx       # Focused sub-component
├── <SubComponent2>.jsx
└── <featureName>Utils.js     # Pure helper functions (if needed)
```

## Checklist
1. Create feature folder with orchestrator + sub-components
2. Use shared `BoardSelector` from `@core/components/BoardSelector` for board selection
3. Use shared `Toast` from `@core/components/Toast` for notifications
4. Use `useSwiftly()` hook for shared state (boards, selectedBoardIds, toggleBoard, etc.)
5. Add tab entry in `src/app/App.jsx` TABS array
6. Add always-mounted wrapper with `display:none` pattern:
   ```jsx
   <div className="swiftly-fade-in" style={{ display: activeTab === 'feature-id' ? 'block' : 'none' }}>
     <FeatureView />
   </div>
   ```
7. NEVER use `key={activeTab}` — causes state loss
8. Add API endpoints in `src/server/routes/` if needed
9. Add tests in `tests/unit/`
10. Run tests + build + push

## State management
- Read from context: `const { token, boards, selectedBoardIds, ... } = useSwiftly();`
- For feature-local state: `useState` + `useRef`
- For API calls: handle loading/error locally, use context cache for shared data
- Always pass `boardIds` as parameter to context functions (never rely on closure state)
