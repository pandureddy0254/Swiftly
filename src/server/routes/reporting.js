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

    // Generate AI-enhanced report and insights in parallel
    const [aiReport, rawInsights] = await Promise.all([
      aiEngine.generateStatusReport(aggregated, options),
      aiEngine.generateInsights(aggregated),
    ]);

    // Enrich insights with boardId by matching board name
    const boardNameToId = {};
    for (const board of aggregated.boards) {
      boardNameToId[board.name] = board.id;
    }

    const insights = (rawInsights || []).map((insight) => {
      const enriched = { ...insight };
      if (insight.board && boardNameToId[insight.board]) {
        enriched.boardId = String(boardNameToId[insight.board]);
      } else if (aggregated.boards.length === 1) {
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

export default router;
