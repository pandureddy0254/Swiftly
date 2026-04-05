import { Router } from 'express';
import mondayActions from '../services/monday-actions.js';

const router = Router();

/**
 * POST /api/actions/create-item
 * Create a new item on a board.
 * Body: { boardId, itemName, columnValues?, groupId? }
 */
router.post('/create-item', async (req, res, next) => {
  try {
    const { boardId, itemName, columnValues, groupId } = req.body;

    if (!boardId) {
      return res.status(400).json({ error: 'boardId is required' });
    }
    if (!itemName || typeof itemName !== 'string') {
      return res.status(400).json({ error: 'itemName is required' });
    }

    const item = await mondayActions.createItem(
      req.mondayToken, boardId, itemName, columnValues || {}, groupId || null
    );

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/create-subitems
 * Create multiple subitems under a parent item.
 * Body: { parentItemId, subitems: [{ name, columnValues? }] }
 */
router.post('/create-subitems', async (req, res, next) => {
  try {
    const { parentItemId, subitems } = req.body;

    if (!parentItemId) {
      return res.status(400).json({ error: 'parentItemId is required' });
    }
    if (!Array.isArray(subitems) || subitems.length === 0) {
      return res.status(400).json({ error: 'subitems must be a non-empty array' });
    }

    for (const sub of subitems) {
      if (!sub.name || typeof sub.name !== 'string') {
        return res.status(400).json({ error: 'Each subitem must have a name string' });
      }
    }

    const result = await mondayActions.createSubitems(req.mondayToken, parentItemId, subitems);

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/update-item
 * Update column values of an item.
 * Body: { boardId, itemId, columnValues }
 */
router.post('/update-item', async (req, res, next) => {
  try {
    const { boardId, itemId, columnValues } = req.body;

    if (!boardId) {
      return res.status(400).json({ error: 'boardId is required' });
    }
    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }
    if (!columnValues || typeof columnValues !== 'object') {
      return res.status(400).json({ error: 'columnValues object is required' });
    }

    const item = await mondayActions.updateItem(req.mondayToken, boardId, itemId, columnValues);

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/bulk-update
 * Bulk update multiple items with the same column values.
 * Body: { boardId, itemIds: [], columnValues }
 */
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { boardId, itemIds, columnValues } = req.body;

    if (!boardId) {
      return res.status(400).json({ error: 'boardId is required' });
    }
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: 'itemIds must be a non-empty array' });
    }
    if (!columnValues || typeof columnValues !== 'object') {
      return res.status(400).json({ error: 'columnValues object is required' });
    }

    const result = await mondayActions.updateMultipleItems(
      req.mondayToken, boardId, itemIds, columnValues
    );

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/move-item
 * Move an item to a different group.
 * Body: { itemId, groupId }
 */
router.post('/move-item', async (req, res, next) => {
  try {
    const { itemId, groupId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }
    if (!groupId || typeof groupId !== 'string') {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const item = await mondayActions.moveItemToGroup(req.mondayToken, itemId, groupId);

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/delete-item
 * Delete an item.
 * Body: { itemId }
 */
router.post('/delete-item', async (req, res, next) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    const item = await mondayActions.deleteItem(req.mondayToken, itemId);

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/archive-item
 * Archive an item.
 * Body: { itemId }
 */
router.post('/archive-item', async (req, res, next) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ error: 'itemId is required' });
    }

    const item = await mondayActions.archiveItem(req.mondayToken, itemId);

    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/actions/create-group
 * Create a new group on a board.
 * Body: { boardId, groupName }
 */
router.post('/create-group', async (req, res, next) => {
  try {
    const { boardId, groupName } = req.body;

    if (!boardId) {
      return res.status(400).json({ error: 'boardId is required' });
    }
    if (!groupName || typeof groupName !== 'string') {
      return res.status(400).json({ error: 'groupName is required' });
    }

    const group = await mondayActions.createGroup(req.mondayToken, boardId, groupName);

    res.json({ success: true, group });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/actions/users
 * Get all users in the account.
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await mondayActions.getUsers(req.mondayToken);

    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

export default router;
