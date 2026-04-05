import { Router } from 'express';
import mondayApi from '../services/monday-api.js';
import aiEngine from '../services/ai-engine.js';
import pdfGenerator from '../services/pdf-generator.js';

const router = Router();

/**
 * POST /api/export/html
 * Generate an HTML report (can be printed to PDF from browser).
 * Body: { boardIds: string[], title?: string, includeAi?: boolean }
 */
router.post('/html', async (req, res, next) => {
  try {
    const { boardIds, title, includeAi = true } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    // Fetch and aggregate data
    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    // Optionally generate AI report + insights
    let aiReport = null;
    let insights = [];
    if (includeAi) {
      [aiReport, insights] = await Promise.all([
        aiEngine.generateStatusReport(aggregated),
        aiEngine.generateInsights(aggregated),
      ]);
    }

    // Generate HTML
    const html = pdfGenerator.generateReportHtml(aggregated, aiReport, {
      title: title || 'Project Status Report',
      generatedAt: new Date().toISOString(),
      insights,
      crossBoardData,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/export/text
 * Generate a full plain-text report (for email or clipboard).
 * Includes AI analysis, insights, all board breakdowns, and per-board items.
 * Body: { boardIds: string[], includeAi?: boolean }
 */
router.post('/text', async (req, res, next) => {
  try {
    const { boardIds, includeAi = true } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    // Generate AI report and insights in parallel
    let aiReport = null;
    let insights = [];
    if (includeAi) {
      [aiReport, insights] = await Promise.all([
        aiEngine.generateStatusReport(aggregated),
        aiEngine.generateInsights(aggregated),
      ]);
    }

    const text = pdfGenerator.generateReportText(aggregated, {
      aiReport,
      insights,
      crossBoardData,
    });

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/export/json
 * Export full report data as JSON (for integrations).
 * Includes AI report, insights, full aggregated data, and all items per board.
 * Body: { boardIds: string[], includeAi?: boolean }
 */
router.post('/json', async (req, res, next) => {
  try {
    const { boardIds, includeAi = true } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    // Generate AI report and insights in parallel
    let aiReport = null;
    let insights = [];
    if (includeAi) {
      [aiReport, insights] = await Promise.all([
        aiEngine.generateStatusReport(aggregated),
        aiEngine.generateInsights(aggregated),
      ]);
    }

    // Build per-board item details for full export
    const boardDetails = crossBoardData.map((board) => ({
      boardId: board.boardId,
      boardName: board.boardName || board.name || `Board ${board.boardId}`,
      columns: (board.columns || []).map((c) => ({ id: c.id, title: c.title, type: c.type })),
      groups: (board.groups || []).map((g) => ({ id: g.id, title: g.title })),
      itemCount: board.itemCount,
      completedCount: board.completedCount,
      items: (board.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        state: item.state,
        group: item.group?.title || 'No Group',
        columnValues: (item.column_values || []).reduce((acc, cv) => {
          const colTitle = cv.column?.title || cv.id;
          acc[colTitle] = cv.text || null;
          return acc;
        }, {}),
        subitems: (item.subitems || []).map((s) => ({
          id: s.id,
          name: s.name,
          state: s.state,
          columnValues: (s.column_values || []).reduce((acc, cv) => {
            const colTitle = cv.column?.title || cv.id;
            acc[colTitle] = cv.text || null;
            return acc;
          }, {}),
        })),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    }));

    res.setHeader('Content-Disposition', 'attachment; filename="swiftly-report.json"');
    res.json({
      ...aggregated,
      aiReport: aiReport ? { report: aiReport.report, model: aiReport.model } : null,
      insights,
      boardDetails,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Swiftly',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
