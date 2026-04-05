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

    // Optionally generate AI report
    let aiReport = null;
    if (includeAi) {
      aiReport = await aiEngine.generateStatusReport(aggregated);
    }

    // Generate HTML
    const html = pdfGenerator.generateReportHtml(aggregated, aiReport, {
      title: title || 'Project Status Report',
      generatedAt: new Date().toISOString(),
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/export/text
 * Generate a plain-text report (for email or clipboard).
 * Body: { boardIds: string[] }
 */
router.post('/text', async (req, res, next) => {
  try {
    const { boardIds } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);
    const text = pdfGenerator.generateReportText(aggregated);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(text);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/export/json
 * Export raw report data as JSON (for integrations).
 * Body: { boardIds: string[] }
 */
router.post('/json', async (req, res, next) => {
  try {
    const { boardIds } = req.body;

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return res.status(400).json({ error: 'boardIds array is required' });
    }

    const crossBoardData = await mondayApi.getCrossBoardItems(req.mondayToken, boardIds);
    const aggregated = mondayApi.aggregateBoardData(crossBoardData);

    res.setHeader('Content-Disposition', 'attachment; filename="swiftly-report.json"');
    res.json({
      ...aggregated,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Swiftly',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
