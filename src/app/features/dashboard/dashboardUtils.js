import * as api from '@core/api/swiftly-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const STALE_DAYS = 7;

export function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

/** Resolve board name from various field patterns */
export function resolveBoardName(board) {
  return board?.name || board?.boardName || board?.board_name || `Board ${board?.id || '?'}`;
}

// ---------------------------------------------------------------------------
// Health Score Calculation (weighted, with breakdown)
// ---------------------------------------------------------------------------
export function calculateHealthScore(reportData, allItems) {
  const breakdown = [];
  if (!reportData || allItems.length === 0) {
    return { score: 0, breakdown: [] };
  }

  let score = 0;
  const total = allItems.length || 1;

  // +15: boards have items at all
  const hasItemsPts = Math.min(15, allItems.length > 0 ? 15 : 0);
  score += hasItemsPts;
  breakdown.push({ label: 'Has items', points: hasItemsPts, max: 15 });

  // +20: items with status columns configured
  const withStatus = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return s && s.text;
  }).length;
  const statusPts = Math.round((withStatus / total) * 20);
  score += statusPts;
  breakdown.push({ label: 'Statuses set', points: statusPts, max: 20 });

  // +20: items with assignees
  const withAssignee = allItems.filter((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    return p && p.text;
  }).length;
  const assigneePts = Math.round((withAssignee / total) * 20);
  score += assigneePts;
  breakdown.push({ label: 'Assignees', points: assigneePts, max: 20 });

  // +20: items with due dates
  const withDueDate = allItems.filter((it) => {
    const d = it.column_values?.find((c) => c.type === 'date' || c.type === 'timeline');
    return d && d.text;
  }).length;
  const datePts = Math.round((withDueDate / total) * 20);
  score += datePts;
  breakdown.push({ label: 'Due dates', points: datePts, max: 20 });

  // +15: items completed
  const completed = reportData.completedItems || 0;
  const completedPts = Math.round((completed / total) * 15);
  score += completedPts;
  breakdown.push({ label: 'Completion', points: completedPts, max: 15 });

  // +10: items updated in last 7 days
  const recentlyUpdated = allItems.filter((it) => daysSince(it.updated_at) <= STALE_DAYS).length;
  const recentPts = Math.round((recentlyUpdated / total) * 10);
  score += recentPts;
  breakdown.push({ label: 'Recent activity', points: recentPts, max: 10 });

  return { score: Math.min(100, Math.max(0, score)), breakdown };
}

// ---------------------------------------------------------------------------
// Rule-based Suggestion Engine
// ---------------------------------------------------------------------------
export function generateSuggestions(reportData, allItems, boardItemsMap, invalidateCache) {
  const suggestions = [];
  if (!reportData || allItems.length === 0) return suggestions;

  // Items with no status
  const noStatus = allItems.filter((it) => {
    const s = it.column_values?.find((c) => c.type === 'status');
    return !s || !s.text;
  });
  if (noStatus.length > 0) {
    suggestions.push({
      id: 'no-status',
      title: `${noStatus.length} item${noStatus.length > 1 ? 's' : ''} have no status`,
      description: 'Items without a status column make it impossible to track progress. Add or configure a Status column on these boards.',
      severity: 'warning',
      actions: noStatus.slice(0, 3).map((it) => ({
        key: `set-status-${it.id}`,
        label: `Update "${it.name.slice(0, 20)}"`,
        icon: '\uD83D\uDD04',
        handler: async (token) => {
          await api.updateItem(token, it._boardId, it.id, { status: { label: 'Working on it' } });
        },
      })),
    });
  }

  // Items with no assignee
  const noAssignee = allItems.filter((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    return !p || !p.text;
  });
  if (noAssignee.length > 0) {
    suggestions.push({
      id: 'no-assignee',
      title: `${noAssignee.length} item${noAssignee.length > 1 ? 's' : ''} unassigned`,
      description: 'Unassigned items risk being overlooked. Consider distributing these across your team.',
      severity: 'warning',
      actions: [{
        key: 'view-unassigned',
        label: 'View Unassigned Items',
        icon: '\uD83D\uDC65',
        handler: async () => { /* no-op, visual only */ },
      }],
    });
  }

  // Stale items (not updated in 7+ days)
  const staleItems = allItems.filter((it) => daysSince(it.updated_at) > STALE_DAYS);
  if (staleItems.length > 0) {
    suggestions.push({
      id: 'stale-items',
      title: `${staleItems.length} item${staleItems.length > 1 ? 's' : ''} stale (7+ days)`,
      description: 'These items have not been updated recently and may be blocked or forgotten.',
      severity: 'critical',
      actions: [
        ...staleItems.slice(0, 2).map((it) => ({
          key: `mark-stuck-${it.id}`,
          label: `Mark "${it.name.slice(0, 18)}" Stuck`,
          icon: '\u26A0\uFE0F',
          handler: async (token) => {
            await api.updateItem(token, it._boardId, it.id, { status: { label: 'Stuck' } });
          },
        })),
        {
          key: 'remind-stale',
          label: 'Create Reminder',
          icon: '\uD83D\uDD14',
          handler: async (token) => {
            const boardId = staleItems[0]._boardId;
            await api.createItem(token, boardId, `[Reminder] ${staleItems.length} stale items need attention`, {}, null);
          },
        },
      ],
    });
  }

  // Zero completed items
  if ((reportData.completedItems || 0) === 0 && allItems.length > 0) {
    suggestions.push({
      id: 'zero-completed',
      title: 'No items completed yet',
      description: 'None of the items across selected boards are marked as Done. Start marking progress to track your team velocity.',
      severity: 'info',
      actions: [{
        key: 'mark-first-done',
        label: 'Mark Progress Tips',
        icon: '\u2705',
        handler: async () => {},
      }],
    });
  }

  // Missing due dates
  const noDueDate = allItems.filter((it) => {
    const d = it.column_values?.find((c) => c.type === 'date' || c.type === 'timeline');
    return !d || !d.text;
  });
  if (noDueDate.length > 0) {
    suggestions.push({
      id: 'no-due-date',
      title: `${noDueDate.length} item${noDueDate.length > 1 ? 's' : ''} have no deadline`,
      description: 'Items without due dates are hard to prioritize and may slip through the cracks.',
      severity: 'warning',
      actions: [{
        key: 'set-dates-reminder',
        label: 'Create Date Reminder',
        icon: '\uD83D\uDCC5',
        handler: async (token) => {
          const boardId = noDueDate[0]._boardId;
          await api.createItem(token, boardId, `[Action] Set due dates for ${noDueDate.length} items`, {}, null);
        },
      }],
    });
  }

  // Workload imbalance
  const assigneeCounts = {};
  allItems.forEach((it) => {
    const p = it.column_values?.find((c) => c.type === 'people' || c.type === 'multiple-person');
    if (p && p.text) {
      const name = p.text;
      assigneeCounts[name] = (assigneeCounts[name] || 0) + 1;
    }
  });
  const counts = Object.values(assigneeCounts);
  if (counts.length >= 2) {
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    if (max > min * 2) {
      const heaviest = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])[0];
      const lightest = Object.entries(assigneeCounts).sort((a, b) => a[1] - b[1])[0];
      suggestions.push({
        id: 'workload-imbalance',
        title: 'Workload imbalance detected',
        description: `${heaviest[0]} has ${heaviest[1]} tasks while ${lightest[0]} has ${lightest[1]}. Consider redistributing work for better balance.`,
        severity: 'warning',
        actions: [{
          key: 'redistribute',
          label: 'Create Redistribution Plan',
          icon: '\u2696\uFE0F',
          handler: async (token) => {
            const boardId = allItems[0]._boardId;
            await api.createItem(token, boardId, `[Action] Redistribute workload: ${heaviest[0]} (${heaviest[1]}) -> ${lightest[0]} (${lightest[1]})`, {}, null);
          },
        }],
      });
    }
  }

  // Board has only one group
  if (reportData.boards) {
    reportData.boards.forEach((board) => {
      const bName = resolveBoardName(board);
      if (board.groups && board.groups.length <= 1 && board.totalItems > 5) {
        suggestions.push({
          id: `single-group-${board.id}`,
          title: `"${bName}" has all items in one group`,
          description: 'Organizing items into groups (phases, sprints, categories) improves visibility and planning.',
          severity: 'info',
          board: bName,
          actions: [{
            key: `organize-${board.id}`,
            label: 'Create Organization Plan',
            icon: '\uD83D\uDCC1',
            handler: async (token) => {
              await api.createItem(token, board.id, '[Action] Organize board items into groups/phases', {}, null);
            },
          }],
        });
      }
    });
  }

  return suggestions;
}
