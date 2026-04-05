import { Router } from 'express';
import mondayApi from '../services/monday-api.js';
import aiEngine from '../services/ai-engine.js';

const router = Router();

/**
 * GET /api/boards
 * List all boards for the authenticated user.
 */
router.get('/boards', async (req, res, next) => {
  try {
    const boards = await mondayApi.getBoards(req.mondayToken);
    res.json({ boards });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/boards/:boardId
 * Get a single board with details.
 */
router.get('/boards/:boardId', async (req, res, next) => {
  try {
    const board = await mondayApi.getBoard(req.mondayToken, req.params.boardId);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json({ board });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/boards/:boardId/items
 * Get items from a board with subitems.
 */
router.get('/boards/:boardId/items', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const cursor = req.query.cursor || null;
    const result = await mondayApi.getBoardItems(req.mondayToken, req.params.boardId, { limit, cursor });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/generate
 * Generate a cross-board report.
 * Body: { boardIds: string[], options?: { tone, audience, includeRecommendations } }
 */
router.post('/reports/generate', async (req, res, next) => {
  try {
    const { boardIds, options = {} } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    if (boardIds.length > 20) {
      return res.status(400).json({ error: 'Maximum 20 boards per report' });
    }

    // Fetch cross-board data
    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);

    // Aggregate into report structure
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    // Generate AI report (includes insights in one call to save costs)
    const aiReport = await aiEngine.generateStatusReport(aggregated, options);
    // Extract insights from report or generate lightweight fallback
    const rawInsights = aiReport?.insights || generateLocalInsights(aggregated);

    // Enrich insights with boardId by matching board name
    const boardNameToId = {};
    for (const board of (aggregated.boards || [])) {
      const bName = board.name || board.boardName;
      if (bName) boardNameToId[bName] = board.id;
      // Also index by boardName if different from name
      if (board.boardName && board.boardName !== bName) {
        boardNameToId[board.boardName] = board.id;
      }
    }

    const insights = (rawInsights || []).map((insight) => {
      const enriched = { ...insight };
      if (insight.board && boardNameToId[insight.board]) {
        enriched.boardId = String(boardNameToId[insight.board]);
      } else if (aggregated.boards && aggregated.boards.length === 1) {
        // If only one board, always link to it
        enriched.boardId = String(aggregated.boards[0].id);
      }
      return enriched;
    });

    res.json({
      report: aiReport,
      data: aggregated,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/reports/quick
 * Quick report for a single board (lighter weight).
 */
router.post('/reports/quick', async (req, res, next) => {
  try {
    const { boardId } = req.body;
    if (!boardId) return res.status(400).json({ error: 'boardId is required' });

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, [boardId]);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    res.json({
      data: aggregated,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Generate rule-based insights without AI (zero cost).
 * Used as fallback when AI report doesn't include insights.
 */
function generateLocalInsights(data) {
  const insights = [];
  const progress = data.overallProgress || 0;
  const total = data.totalItems || 0;
  const completed = data.completedItems || 0;
  const stuck = data.statusBreakdown?.Stuck || data.statusBreakdown?.Blocked || 0;

  if (progress === 0 && total > 0) {
    insights.push({ type: 'risk', title: 'No items completed', description: `All ${total} items are still in progress. Consider prioritizing quick wins.`, severity: 'high' });
  }
  if (stuck > 0) {
    insights.push({ type: 'risk', title: `${stuck} blocked item${stuck > 1 ? 's' : ''}`, description: 'Blocked items need immediate attention to unblock the team.', severity: 'high' });
  }
  if (progress > 0 && progress < 30) {
    insights.push({ type: 'insight', title: 'Low completion rate', description: `Only ${progress}% complete. Review scope or allocate more resources.`, severity: 'medium' });
  }
  if (progress >= 75) {
    insights.push({ type: 'insight', title: 'Strong progress', description: `${progress}% complete — on track for delivery.`, severity: 'low' });
  }
  for (const board of (data.boards || [])) {
    if (board.progress === 0 && (board.totalItems || 0) > 0) {
      insights.push({ type: 'risk', title: `${board.name || board.boardName} has no progress`, description: `${board.totalItems} items with 0% completion.`, severity: 'medium', board: board.name || board.boardName });
    }
  }
  return insights;
}

export default router;
