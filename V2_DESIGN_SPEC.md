# Swiftly V2 — Complete Redesign Spec

## Problem with V1
- AI is read-only — can't take actions on Monday.com
- Chat is generic text — no action buttons, no import
- UI is basic — doesn't feel enterprise-grade
- No real workflows — just a chatbox and charts
- Weak model — needs better AI quality

## V2 Vision
Swiftly V2 is an **agentic AI command center** that doesn't just analyze — it **acts**.
Every AI response includes actionable buttons. The AI can create items, update statuses,
assign people, and manage boards directly.

---

## V2 Feature Map

### 1. AGENTIC AI ENGINE (Backend)
The AI can execute Monday.com write operations:
- `createItem(boardId, name, columnValues)` — create new items
- `createSubitem(parentItemId, name, columnValues)` — create subitems
- `updateItem(itemId, columnValues)` — update status, assignee, dates
- `moveItem(itemId, groupId)` — move items between groups
- `deleteItem(itemId)` — delete items
- `createGroup(boardId, name)` — create new groups

AI decides which actions to take based on the conversation.
Returns structured responses with both text AND action buttons.

### 2. ACTION RESPONSES (Frontend)
AI responses are NOT just text. They contain:
```json
{
  "text": "Here are 5 subtasks for User Auth Refactor:",
  "actions": [
    {
      "type": "create_subitems",
      "label": "Create All as Subitems",
      "icon": "import",
      "parentItemId": "123",
      "items": [
        {"name": "Review current auth code", "status": "Not Started"},
        {"name": "Design new auth flow", "status": "Not Started"}
      ]
    },
    {
      "type": "update_status",
      "label": "Mark as In Progress",
      "itemId": "123",
      "value": "Working on it"
    },
    {
      "type": "assign",
      "label": "Assign to...",
      "itemId": "123"
    }
  ]
}
```

### 3. SMART DASHBOARD (not just charts)
Each insight card has action buttons:
- Risk detected → [View Items] [Reassign] [Change Priority]
- Overdue items → [Extend Deadline] [Mark Blocked] [Notify Owner]
- Workload imbalance → [Redistribute] [View Workload]

### 4. AI CAPABILITIES
- Deep dive with auto-import subtasks
- Sprint planning — AI creates sprint board structure
- Status bulk update — "Mark all Marketing items as In Progress"
- Smart assignment — "Assign these tasks evenly across the team"
- Meeting prep — Generate agenda from board data
- Client report — Professional PDF with AI narrative
- Risk scanner — Proactive alerts on at-risk items

### 5. UI/UX OVERHAUL
- Polished, enterprise-grade design
- Three main sections: Dashboard | AI Agent | Reports
- Action buttons on every AI response
- Toast notifications for completed actions
- Loading states with meaningful progress
- Mobile-responsive

---

## Technical Changes

### Backend — New Monday.com Write API
File: `src/server/services/monday-actions.js`
- All write operations (create, update, move, delete)
- Mutation GraphQL queries
- Batch operations support

### Backend — Agentic AI
File: `src/server/services/ai-engine.js` (rewrite)
- AI returns structured JSON (text + actions)
- Action detection from natural language
- Context-aware suggestions

### Backend — New Routes
File: `src/server/routes/actions.js`
- POST /api/actions/create-item
- POST /api/actions/create-subitems
- POST /api/actions/update-item
- POST /api/actions/bulk-update
- POST /api/actions/move-item

### Frontend — Complete UI Rebuild
- New component: ActionButton (executes Monday.com actions)
- New component: AiMessage (renders text + action buttons)
- New component: InsightCard (with action buttons)
- New component: SmartDashboard
- New component: DeepDivePanel
- Redesigned layout with 3 tabs: Dashboard | AI Agent | Reports

### Model Upgrade
- Default: `anthropic/claude-sonnet-4` via OpenRouter (best quality)
- Fallback: `google/gemini-2.0-flash-001` (fast/cheap)
