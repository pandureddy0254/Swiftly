import { Router } from 'express';
import mondayApi from '../services/monday-api.js';
import aiEngine from '../services/ai-engine.js';

const router = Router();

const conversations = new Map();
const CONVERSATION_TTL = 30 * 60 * 1000;
const MAX_CONVERSATIONS = 1000;

/**
 * POST /api/ai/chat
 * Intelligent AI chat with FULL item-level board data.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { question, boardIds, sessionId } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    // Fetch FULL item-level data (not just aggregated summaries)
    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds, {
      maxItemsPerBoard: 200,
    });

    // Build rich context with every item detail
    const richContext = buildRichContext(crossBoardData);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    // Get or create conversation history
    const convId = sessionId || `conv_${Date.now()}`;
    const entry = conversations.get(convId);
    let history = entry ? entry.history : [];

    // Send BOTH rich item data AND aggregated summary to AI
    const result = await aiEngine.chatWithBoardData(question, {
      summary: aggregated,
      boards: richContext,
    }, history);

    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: result.answer });

    if (history.length > 20) {
      history = history.slice(-20);
    }

    conversations.set(convId, { history, lastAccessedAt: Date.now() });
    cleanupConversations();

    res.json({
      answer: result.answer,
      actions: result.actions || [],
      sessionId: convId,
      tokensUsed: result.tokensUsed,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Build rich context with every item name, status, dates, assignees, subitems.
 */
function buildRichContext(crossBoardData) {
  return (crossBoardData || []).map((board) => ({
    boardName: board.boardName || board.name || `Board ${board.boardId || '?'}`,
    boardId: board.boardId,
    totalItems: (board.items || []).length,
    columns: (board.columns || []).map((c) => ({ title: c.title, type: c.type })),
    groups: (board.groups || []).map((g) => typeof g === 'object' ? g.title : g),
    items: (board.items || []).map((item) => {
      const itemData = {
        id: item.id,
        name: item.name,
        state: item.state,
        group: item.group?.title || 'No Group',
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };

      // Extract all column values into readable format
      for (const col of (item.column_values || [])) {
        const colName = col.column?.title || col.id;
        if (col.text && col.text.trim()) {
          itemData[colName] = col.text;
        }
      }

      // Include subitems with their details
      if (item.subitems && item.subitems.length > 0) {
        itemData.subitems = item.subitems.map((sub) => {
          const subData = { name: sub.name, state: sub.state };
          for (const col of (sub.column_values || [])) {
            const colName = col.column?.title || col.id;
            if (col.text && col.text.trim()) {
              subData[colName] = col.text;
            }
          }
          return subData;
        });
      }

      return itemData;
    }),
  }));
}

/**
 * POST /api/ai/insights
 */
router.post('/insights', async (req, res, next) => {
  try {
    const { boardIds } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);
    const insights = await aiEngine.generateInsights(aggregated);

    res.json({ insights });
  } catch (err) {
    next(err);
  }
});

router.delete('/chat/:sessionId', (req, res) => {
  conversations.delete(req.params.sessionId);
  res.json({ ok: true });
});

function cleanupConversations() {
  const now = Date.now();

  // Evict entries older than TTL
  for (const [key, entry] of conversations) {
    if (now - entry.lastAccessedAt > CONVERSATION_TTL) {
      conversations.delete(key);
    }
  }

  // Cap at MAX_CONVERSATIONS by evicting oldest entries
  if (conversations.size > MAX_CONVERSATIONS) {
    const sorted = [...conversations.entries()].sort(
      (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
    );
    const toRemove = sorted.length - MAX_CONVERSATIONS;
    for (let i = 0; i < toRemove; i++) {
      conversations.delete(sorted[i][0]);
    }
  }
}

export default router;
