import config from '../config/index.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Call OpenRouter API (OpenAI-compatible format).
 * Supports any model available on OpenRouter.
 */
async function callAI(messages, { system = null, maxTokens = 4096, model = null } = {}) {
  const apiKey = config.ai.apiKey;
  if (!apiKey) return null;

  const body = {
    model: model || config.ai.model,
    max_tokens: maxTokens,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
  };

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://swiftly.app',
      'X-Title': 'Swiftly',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${text}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    text: choice?.message?.content || '',
    model: data.model || config.ai.model,
    tokensUsed: data.usage?.completion_tokens || 0,
  };
}

// ---------------------------------------------------------------------------
// Action parsing — extract structured actions from AI response
// ---------------------------------------------------------------------------

/**
 * Parse the AI response text to extract the clean markdown and any
 * embedded action blocks.  Actions are encoded as:
 *
 *   <!--ACTIONS
 *   [ ... JSON array ... ]
 *   ACTIONS-->
 *
 * Returns { text, actions }.
 */
function parseAiResponse(text) {
  const actionMatch = text.match(/<!--ACTIONS\n([\s\S]*?)\nACTIONS-->/);
  let actions = [];
  let cleanText = text;

  if (actionMatch) {
    try {
      actions = JSON.parse(actionMatch[1]);
    } catch {
      // Malformed JSON — silently drop actions so the user still gets text.
    }
    cleanText = text.replace(actionMatch[0], '').trim();
  }

  // Assign default icons when the AI omits them
  const defaultIcons = {
    create_subitems: 'import',
    update_status: 'status',
    create_item: 'add',
    bulk_update: 'update',
    assign: 'person',
  };

  for (const action of actions) {
    if (!action.icon && defaultIcons[action.type]) {
      action.icon = defaultIcons[action.type];
    }
  }

  return { text: cleanText, actions };
}

// ---------------------------------------------------------------------------
// Status report
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive status report from aggregated board data.
 */
export async function generateStatusReport(reportData, options = {}) {
  const { tone = 'professional', audience = 'manager', includeRecommendations = true } = options;

  const prompt = `You are Swiftly, an AI assistant for monday.com project management.

Analyze the following project data and generate a clear, actionable status report.

**Report Data:**
- Total Boards: ${reportData.totalBoards}
- Total Items: ${reportData.totalItems}
- Total Subitems: ${reportData.totalSubitems}
- Completed Items: ${reportData.completedItems}
- Overall Progress: ${reportData.overallProgress}%

**Board Breakdown:**
${reportData.boards.map((b) => `- ${b.name}: ${b.progress}% complete (${b.completedItems}/${b.totalItems} items, ${b.subitems} subitems)`).join('\n')}

**Status Distribution:**
${Object.entries(reportData.statusBreakdown).map(([status, count]) => `- ${status}: ${count} items`).join('\n')}

**Group Distribution:**
${Object.entries(reportData.groupBreakdown).map(([group, count]) => `- ${group}: ${count} items`).join('\n')}

Generate a ${tone} status report for a ${audience} audience.

Include:
1. Executive summary (2-3 sentences)
2. Key metrics at a glance
3. Board-by-board progress
4. Risk areas and blockers (items not progressing)
5. ${includeRecommendations ? 'Actionable recommendations' : 'Summary'}

Format with clear headers and bullet points. Be concise but thorough.`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }], { maxTokens: 4096 });
    if (!result) return generateFallbackReport(reportData);

    return {
      report: result.text,
      model: result.model,
      tokensUsed: result.tokensUsed,
    };
  } catch (err) {
    console.warn('[Swiftly AI] Falling back to basic report:', err.message);
    return generateFallbackReport(reportData);
  }
}

// ---------------------------------------------------------------------------
// Agentic chat with structured action responses
// ---------------------------------------------------------------------------

/**
 * AI Chat — agentic assistant with full item-level board data.
 *
 * Returns a structured response:
 * {
 *   answer:     "markdown text",
 *   actions:    [ { type, label, icon, data } ],
 *   tokensUsed: number
 * }
 *
 * The AI is instructed to embed an ACTIONS block when the conversation
 * warrants actionable follow-ups (creating subitems, updating statuses, etc.).
 */
export async function chatWithBoardData(question, boardData, conversationHistory = []) {
  const { summary, boards } = boardData;

  // Build detailed data context for the AI
  let dataContext = '';

  if (boards && boards.length > 0) {
    for (const board of boards) {
      dataContext += `\n### Board: "${board.boardName}" (ID: ${board.boardId || 'unknown'}) — ${board.totalItems} items\n`;
      dataContext += `Groups: ${board.groups.map(g => typeof g === 'object' ? `${g.title} (ID: ${g.id})` : g).join(', ') || 'Default'}\n`;
      dataContext += `Columns: ${board.columns.map(c => `${c.title} (${c.type})`).join(', ')}\n`;
      dataContext += `\nItems:\n`;

      for (const item of board.items) {
        const fields = Object.entries(item)
          .filter(([k]) => !['createdAt', 'updatedAt'].includes(k))
          .map(([k, v]) => {
            if (k === 'subitems' && Array.isArray(v)) {
              return `subitems: [${v.map(s => s.name).join(', ')}]`;
            }
            return `${k}: ${v}`;
          })
          .join(' | ');
        dataContext += `- ${fields}\n`;
      }
    }
  }

  // Add summary stats
  if (summary) {
    dataContext += `\n### Overall Summary\n`;
    dataContext += `Total Boards: ${summary.totalBoards} | Total Items: ${summary.totalItems} | Subitems: ${summary.totalSubitems}\n`;
    dataContext += `Completed: ${summary.completedItems} | Progress: ${summary.overallProgress}%\n`;
    if (Object.keys(summary.statusBreakdown).length > 0) {
      dataContext += `Status: ${Object.entries(summary.statusBreakdown).map(([s, c]) => `${s}:${c}`).join(', ')}\n`;
    }
  }

  const systemPrompt = `You are Swiftly, an intelligent AI project management assistant embedded inside monday.com. You combine board data analysis with deep domain expertise AND the ability to suggest concrete actions the user can execute with one click.

You have FULL access to the user's monday.com board data including every item name, ID, status, assignee, dates, groups, subitems, and all column values.

## Your Capabilities:
1. **Detailed item-level analysis** — Reference every item by name with all its fields
2. **Cross-board analysis** — Compare data across multiple boards
3. **Status & risk tracking** — Identify overdue, stuck, blocked, or at-risk items
4. **Workload analysis** — See assignments and identify imbalances
5. **Progress reporting** — Calculate progress at board, group, and item level
6. **Expert recommendations** — Suggest actions, priorities, dependencies, and next steps
7. **Summaries** — Generate executive summaries, standup updates, sprint reviews, or client reports
8. **Deep dives** — When asked to deep dive into a task, use your expert knowledge to explain what that task typically involves, best practices, common pitfalls, estimated effort, and suggested subtasks
9. **Agentic actions** — You can suggest concrete actions (create subitems, update statuses, create items, bulk updates, assign people) that the user can execute with one click

## Rules:
- ALWAYS reference specific item names, IDs, numbers, and board names — never be vague or generic
- If the user asks for "full details" or "all items", LIST EVERY ITEM with all available fields in a table
- When asked to "deep dive" or "research" an item, provide expert analysis using your knowledge:
  * What this task typically involves (scope, steps)
  * Best practices and common approaches
  * Potential risks or blockers
  * Estimated effort (T-shirt size: S/M/L/XL)
  * Suggested subtasks or checklist
  * Dependencies on other items in the board
- Format responses with headers, bullet points, and tables — make them scannable
- If data is missing (e.g., no status column), explain what's missing and suggest the user add it
- Be proactive — spot risks, patterns, and dependencies even if not asked
- When items have no status set, flag it as a gap
- If the user asks something you can partially answer, give what you can and explain what's missing
- NEVER say "I cannot do that" — always provide value by combining board data with your expertise

## Action Detection — IMPORTANT:
When your response includes actionable suggestions, you MUST append a structured action block so the frontend can render action buttons. Detect these situations:

- **Subtask breakdown / deep dive**: When you suggest subtasks for an item, include a \`create_subitems\` action with ALL suggested subtasks
- **Status update requests**: When the user asks to change a status (e.g. "mark as done", "set to in progress"), include an \`update_status\` action
- **New task creation**: When the user asks to create a task or you recommend creating one, include a \`create_item\` action
- **Prioritization / bulk changes**: When you recommend reordering or updating multiple items, include \`bulk_update\` actions
- **Assignment**: When you recommend assigning someone, include an \`assign\` action
- **Deep dives**: ALWAYS include a \`create_subitems\` action containing the suggested subtasks from your analysis

Append the action block at the END of your response in this exact format (no extra whitespace before/after the JSON):

<!--ACTIONS
[{"type": "create_subitems", "label": "Create All as Subitems", "data": {"parentItemId": "ITEM_ID", "parentItemName": "Item Name", "subitems": [{"name": "Subtask 1"}, {"name": "Subtask 2"}]}}, {"type": "update_status", "label": "Mark as In Progress", "data": {"boardId": "BOARD_ID", "itemId": "ITEM_ID", "status": "Working on it"}}, {"type": "create_item", "label": "Create as New Item", "data": {"boardId": "BOARD_ID", "itemName": "New Task Name", "groupId": "GROUP_ID"}}, {"type": "bulk_update", "label": "Update All Priorities", "data": {"boardId": "BOARD_ID", "updates": [{"itemId": "ID1", "field": "priority", "value": "High"}, {"itemId": "ID2", "field": "priority", "value": "Medium"}]}}, {"type": "assign", "label": "Assign to Person", "data": {"boardId": "BOARD_ID", "itemId": "ITEM_ID", "personId": "PERSON_ID", "personName": "Name"}}]
ACTIONS-->

Rules for the action block:
- Use REAL item IDs and board IDs from the board data — never use placeholder strings
- Only include action types that are relevant to your response
- The \`label\` should be short, human-readable, and describe what the button does
- If you cannot determine an ID (e.g. groupId is unknown), use the best available value
- If no actions are appropriate (e.g. the user just asks a question), do NOT include the block

## Current Board Data:
${dataContext}`;

  const messages = [
    ...conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: question },
  ];

  try {
    const result = await callAI(messages, { system: systemPrompt, maxTokens: 4096 });
    if (!result) {
      // Intelligent fallback using the raw data
      return generateDataDrivenFallback(question, boardData);
    }

    const { text, actions: parsedActions } = parseAiResponse(result.text);

    // If the model didn't include ACTIONS block, auto-detect from text
    let actions = parsedActions;
    console.log(`[Swiftly] Parsed actions: ${parsedActions.length}, text length: ${text.length}, boards: ${boards?.length || 0}`);
    if (actions.length === 0) {
      actions = autoDetectActions(text, question, boards);
      console.log(`[Swiftly] Auto-detected actions: ${actions.length}`);
    }
    // Always try auto-detect as a supplement if parsed actions don't have subitems
    if (actions.length === 0 || !actions.some(a => a.type === 'create_subitems')) {
      const autoActions = autoDetectActions(text, question, boards);
      if (autoActions.length > 0) {
        actions = [...actions, ...autoActions];
      }
    }

    return {
      answer: text,
      actions,
      tokensUsed: result.tokensUsed,
    };
  } catch (err) {
    console.warn('[Swiftly AI] Chat error:', err.message);
    return {
      answer: `Sorry, I encountered an error: ${err.message}`,
      actions: [],
      tokensUsed: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Auto-detect actions from AI response text
// ---------------------------------------------------------------------------

/**
 * Scans the AI response text for subtask lists, status suggestions, etc.
 * and auto-generates action buttons even when the model didn't include them.
 */
function autoDetectActions(text, question, boards) {
  const actions = [];
  const q = question.toLowerCase();

  // Detect subtask suggestions — look for numbered/bulleted lists after keywords
  const subtaskPatterns = [
    /(?:subtask|sub-task|checklist|breakdown|suggested task|proposed task|step)s?[:\s]*\n((?:\s*[-*\d.]+\s*\*{0,2}[^*\n]+\*{0,2}\s*\n?)+)/gi,
    /\|\s*(?:subtask|task|name|step)\s*\|[^\n]*\n\|[-\s|:]+\n((?:\|[^\n]+\n?)+)/gi,
  ];

  let detectedSubtasks = [];

  // Pattern 1: Numbered list with bold names — "1. **Task Name**"
  const numberedBoldPattern = /\d+[.)]\s*\*\*([^*]+)\*\*/g;
  const numberedMatches = [...text.matchAll(numberedBoldPattern)];
  console.log(`[Swiftly Actions] Pattern 1 found ${numberedMatches.length} matches:`, numberedMatches.map(m => m[1]));
  if (numberedMatches.length >= 2) {
    detectedSubtasks = numberedMatches.map(m => m[1].trim());
  }

  // Pattern 2: Bullet list with bold names — "- **Task Name**"
  if (detectedSubtasks.length < 2) {
    const bulletBoldPattern = /[-*•]\s*\*\*([^*]+)\*\*/g;
    const bulletMatches = [...text.matchAll(bulletBoldPattern)];
    if (bulletMatches.length >= 2) {
      detectedSubtasks = bulletMatches.map(m => m[1].trim());
    }
  }

  // Pattern 3: Table rows — "| **Task Name** |"
  if (detectedSubtasks.length < 2) {
    const tablePattern = /\|\s*\*\*([^|*]+)\*\*\s*\|/g;
    const tableMatches = [...text.matchAll(tablePattern)];
    if (tableMatches.length >= 2) {
      detectedSubtasks = tableMatches.map(m => m[1].trim());
    }
  }

  // Pattern 4: Table rows without bold — "| Task Name | description |"
  if (detectedSubtasks.length < 2) {
    const tableNoBoldPattern = /\|\s*([^|*\n-]{5,80})\s*\|[^|]*\|/g;
    const tableNoBold = [...text.matchAll(tableNoBoldPattern)]
      .map(m => m[1].trim())
      .filter(t => !t.toLowerCase().includes('subtask') && !t.toLowerCase().includes('name') && !t.toLowerCase().includes('---'));
    if (tableNoBold.length >= 2) {
      detectedSubtasks = tableNoBold;
    }
  }

  // Pattern 5: Heading-style subtasks — "### 1. Task Name" or "#### Task Name"
  if (detectedSubtasks.length < 2) {
    const headingPattern = /#{3,4}\s*\d*\.?\s*\*{0,2}([^*\n#]+)\*{0,2}/g;
    const headingMatches = [...text.matchAll(headingPattern)];
    const filtered = headingMatches
      .map(m => m[1].trim())
      .filter(t => t.length > 5 && t.length < 150 && !t.toLowerCase().includes('overview') && !t.toLowerCase().includes('best practice') && !t.toLowerCase().includes('summary'));
    if (filtered.length >= 2) {
      detectedSubtasks = filtered;
    }
  }

  // Remove duplicates
  detectedSubtasks = [...new Set(detectedSubtasks)];

  // Find the parent item from the question or context
  if (detectedSubtasks.length >= 2) {
    let parentItem = null;

    if (boards) {
      for (const board of boards) {
        for (const item of board.items) {
          const itemNameLower = item.name.toLowerCase();
          if (q.includes(itemNameLower) || text.toLowerCase().includes(`"${itemNameLower}"`)) {
            parentItem = { id: item.id, name: item.name, boardId: board.boardId };
            break;
          }
        }
        if (parentItem) break;
      }
    }

    if (parentItem) {
      actions.push({
        type: 'create_subitems',
        label: `Import ${detectedSubtasks.length} Subtasks to "${parentItem.name}"`,
        icon: 'import',
        data: {
          parentItemId: parentItem.id,
          parentItemName: parentItem.name,
          boardId: parentItem.boardId,
          subitems: detectedSubtasks.map(name => ({ name })),
        },
      });
    } else {
      // No specific parent found — offer to create as new standalone items instead
      const boardId = boards?.[0]?.boardId;
      if (boardId) {
        actions.push({
          type: 'create_item',
          label: `Create ${detectedSubtasks.length} Items on Board`,
          icon: 'add',
          data: {
            boardId,
            items: detectedSubtasks.map(name => ({ name })),
          },
        });
      }
    }
  }

  // Detect status update requests
  if (q.includes('mark as') || q.includes('set status') || q.includes('change status') || q.includes('update status')) {
    const statusMatch = q.match(/mark (?:as |it |them )?(done|complete|in progress|working on it|stuck|blocked|not started)/i);
    if (statusMatch && boards) {
      for (const board of boards) {
        for (const item of board.items) {
          if (q.includes(item.name.toLowerCase())) {
            actions.push({
              type: 'update_status',
              label: `Mark "${item.name}" as ${statusMatch[1]}`,
              icon: 'status',
              data: {
                boardId: board.boardId,
                itemId: item.id,
                status: statusMatch[1],
              },
            });
          }
        }
      }
    }
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

/**
 * Data-driven fallback when AI is not available.
 * Actually parses the data and answers common questions.
 */
function generateDataDrivenFallback(question, boardData) {
  const { summary, boards } = boardData;
  const q = question.toLowerCase();

  // Handle common questions with real data
  if (q.includes('full detail') || q.includes('all item') || q.includes('list')) {
    let answer = '## All Items\n\n';
    for (const board of boards) {
      answer += `### ${board.boardName}\n`;
      for (const item of board.items) {
        answer += `- **${item.name}** (${item.state || 'active'})`;
        if (item.subitems) answer += ` — ${item.subitems.length} subitems`;
        answer += '\n';
      }
      answer += '\n';
    }
    return { answer, actions: [], tokensUsed: 0 };
  }

  if (q.includes('summary') || q.includes('overview')) {
    let answer = `## Summary\n\n`;
    answer += `**${summary.totalBoards} boards** with **${summary.totalItems} items** (${summary.overallProgress}% complete)\n\n`;
    for (const board of boards) {
      answer += `### ${board.boardName}\n`;
      answer += `${board.items.length} items: ${board.items.map(i => i.name).join(', ')}\n\n`;
    }
    return { answer, actions: [], tokensUsed: 0 };
  }

  // Default: list everything
  let answer = `I have data for ${summary.totalBoards} boards with ${summary.totalItems} total items. AI-powered analysis requires an OpenRouter API key. Here's what I can see:\n\n`;
  for (const board of boards) {
    answer += `**${board.boardName}:** ${board.items.map(i => i.name).join(', ')}\n`;
  }
  return { answer, actions: [], tokensUsed: 0 };
}

/**
 * Generate AI insights from board data (anomalies, trends, risks).
 */
export async function generateInsights(reportData) {
  const prompt = `Analyze this monday.com project data and provide 3-5 key insights.
Focus on: risks, bottlenecks, overdue items, workload imbalance, and progress trends.

Data:
${JSON.stringify(reportData, null, 2).slice(0, 10000)}

Return as JSON array:
[{ "type": "risk|insight|recommendation", "title": "short title", "description": "1-2 sentences", "severity": "high|medium|low", "board": "board name or null" }]

Return ONLY the JSON array, no other text.`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }], { maxTokens: 1024 });
    if (!result) return generateFallbackInsights(reportData);

    const jsonMatch = result.text.trim().match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : generateFallbackInsights(reportData);
  } catch (err) {
    console.warn('[Swiftly AI] Insights fallback:', err.message);
    return generateFallbackInsights(reportData);
  }
}

/**
 * Fallback report when AI is not configured.
 */
function generateFallbackReport(data) {
  const lines = [
    '# Project Status Report',
    '',
    '## Executive Summary',
    `Tracking ${data.totalItems} items across ${data.totalBoards} boards with ${data.overallProgress}% overall completion.`,
    '',
    '## Key Metrics',
    `- **Total Items:** ${data.totalItems}`,
    `- **Completed:** ${data.completedItems}`,
    `- **Subitems:** ${data.totalSubitems}`,
    `- **Progress:** ${data.overallProgress}%`,
    '',
    '## Board Progress',
    ...data.boards.map((b) => `- **${b.name}:** ${b.progress}% (${b.completedItems}/${b.totalItems})`),
    '',
    '## Status Breakdown',
    ...Object.entries(data.statusBreakdown).map(([s, c]) => `- ${s}: ${c}`),
  ];

  return { report: lines.join('\n'), model: 'fallback', tokensUsed: 0 };
}

/**
 * Fallback insights when AI is not configured.
 */
function generateFallbackInsights(data) {
  const insights = [];

  if (data.overallProgress < 50) {
    insights.push({
      type: 'risk',
      title: 'Low overall progress',
      description: `Projects are at ${data.overallProgress}% completion. Review timelines and resource allocation.`,
      severity: 'high',
      board: null,
    });
  }

  for (const board of data.boards) {
    if (board.progress < 25 && board.totalItems > 5) {
      insights.push({
        type: 'risk',
        title: `${board.name} is behind schedule`,
        description: `Only ${board.progress}% complete with ${board.totalItems} items.`,
        severity: 'high',
        board: board.name,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'insight',
      title: 'Projects on track',
      description: `Overall progress is ${data.overallProgress}% across ${data.totalBoards} boards.`,
      severity: 'low',
      board: null,
    });
  }

  return insights;
}

export default {
  generateStatusReport,
  chatWithBoardData,
  generateInsights,
};
