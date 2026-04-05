import config from '../config/index.js';

const MONDAY_API_URL = config.monday.apiUrl;
const API_VERSION = config.monday.apiVersion;

/**
 * Execute a GraphQL query against the Monday.com API.
 * Shared helper for all write actions.
 */
async function executeQuery(query, variables = {}, token = null) {
  const apiToken = token || config.monday.apiToken;

  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken,
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Monday API HTTP ${response.status}: ${text}`);
  }

  const result = await response.json();

  if (result.errors) {
    const messages = result.errors.map((e) => e.message).join('; ');
    throw new Error(`Monday API error: ${messages}`);
  }

  return result.data;
}

/**
 * Create a new item on a board.
 * @param {string} token - Monday.com API token
 * @param {string|number} boardId - Target board ID
 * @param {string} itemName - Name of the new item
 * @param {object} [columnValues] - Column values to set (e.g. {status: {label: "Working on it"}})
 * @param {string} [groupId] - Group to place the item in
 * @returns {object} Created item with id and name
 */
export async function createItem(token, boardId, itemName, columnValues = {}, groupId = null) {
  const colValuesStr = JSON.stringify(columnValues);

  let mutation;
  let variables;

  if (groupId) {
    mutation = `mutation ($boardId: ID!, $itemName: String!, $groupId: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId, column_values: $columnValues) {
        id
        name
      }
    }`;
    variables = { boardId: String(boardId), itemName, groupId, columnValues: colValuesStr };
  } else {
    mutation = `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id
        name
      }
    }`;
    variables = { boardId: String(boardId), itemName, columnValues: colValuesStr };
  }

  const data = await executeQuery(mutation, variables, token);
  return data.create_item;
}

/**
 * Create multiple subitems under a parent item.
 * Monday API does not support batch subitem creation, so items are created sequentially.
 * @param {string} token - Monday.com API token
 * @param {string|number} parentItemId - Parent item ID
 * @param {Array<{name: string, columnValues?: object}>} subitems - Array of subitems to create
 * @returns {Array<object>} Array of created subitems with id and name
 */
export async function createSubitems(token, parentItemId, subitems) {
  if (!Array.isArray(subitems) || subitems.length === 0) {
    throw new Error('subitems must be a non-empty array');
  }

  const mutation = `mutation ($parentItemId: ID!, $itemName: String!, $columnValues: JSON!) {
    create_subitem(parent_item_id: $parentItemId, item_name: $itemName, column_values: $columnValues) {
      id
      name
    }
  }`;

  const results = [];
  const errors = [];

  for (const subitem of subitems) {
    const colValuesStr = JSON.stringify(subitem.columnValues || {});

    try {
      const data = await executeQuery(mutation, {
        parentItemId: String(parentItemId),
        itemName: subitem.name,
        columnValues: colValuesStr,
      }, token);

      results.push(data.create_subitem);
    } catch (err) {
      errors.push({ name: subitem.name, error: err.message });
    }
  }

  return {
    created: results,
    errors,
    totalRequested: subitems.length,
    totalCreated: results.length,
  };
}

/**
 * Update column values of an item.
 * @param {string} token - Monday.com API token
 * @param {string|number} boardId - Board ID the item belongs to
 * @param {string|number} itemId - Item ID to update
 * @param {object} columnValues - Column values to set
 * @returns {object} Updated item with id
 */
export async function updateItem(token, boardId, itemId, columnValues) {
  const colValuesStr = JSON.stringify(columnValues);

  const mutation = `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
    change_multiple_column_values(board_id: $boardId, item_id: $itemId, column_values: $columnValues) {
      id
      name
    }
  }`;

  const data = await executeQuery(mutation, {
    boardId: String(boardId),
    itemId: String(itemId),
    columnValues: colValuesStr,
  }, token);

  return data.change_multiple_column_values;
}

/**
 * Bulk update multiple items with the same column values.
 * @param {string} token - Monday.com API token
 * @param {string|number} boardId - Board ID
 * @param {Array<string|number>} itemIds - Array of item IDs to update
 * @param {object} columnValues - Column values to apply to all items
 * @returns {object} Results with created/errors breakdown
 */
export async function updateMultipleItems(token, boardId, itemIds, columnValues) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error('itemIds must be a non-empty array');
  }

  const results = [];
  const errors = [];

  for (const itemId of itemIds) {
    try {
      const updated = await updateItem(token, boardId, itemId, columnValues);
      results.push(updated);
    } catch (err) {
      errors.push({ itemId, error: err.message });
    }
  }

  return {
    updated: results,
    errors,
    totalRequested: itemIds.length,
    totalUpdated: results.length,
  };
}

/**
 * Move an item to a different group.
 * @param {string} token - Monday.com API token
 * @param {string|number} itemId - Item ID to move
 * @param {string} groupId - Target group ID
 * @returns {object} Moved item with id
 */
export async function moveItemToGroup(token, itemId, groupId) {
  const mutation = `mutation ($itemId: ID!, $groupId: String!) {
    move_item_to_group(item_id: $itemId, group_id: $groupId) {
      id
    }
  }`;

  const data = await executeQuery(mutation, {
    itemId: String(itemId),
    groupId,
  }, token);

  return data.move_item_to_group;
}

/**
 * Delete an item.
 * @param {string} token - Monday.com API token
 * @param {string|number} itemId - Item ID to delete
 * @returns {object} Deleted item with id
 */
export async function deleteItem(token, itemId) {
  const mutation = `mutation ($itemId: ID!) {
    delete_item(item_id: $itemId) {
      id
    }
  }`;

  const data = await executeQuery(mutation, {
    itemId: String(itemId),
  }, token);

  return data.delete_item;
}

/**
 * Create a new group on a board.
 * @param {string} token - Monday.com API token
 * @param {string|number} boardId - Board ID
 * @param {string} groupName - Name for the new group
 * @returns {object} Created group with id
 */
export async function createGroup(token, boardId, groupName) {
  const mutation = `mutation ($boardId: ID!, $groupName: String!) {
    create_group(board_id: $boardId, group_name: $groupName) {
      id
    }
  }`;

  const data = await executeQuery(mutation, {
    boardId: String(boardId),
    groupName,
  }, token);

  return data.create_group;
}

/**
 * Get all users in the account (for assignment dropdowns).
 * @param {string} token - Monday.com API token
 * @returns {Array<object>} Array of users with id, name, email
 */
export async function getUsers(token) {
  const query = `query {
    users {
      id
      name
      email
    }
  }`;

  const data = await executeQuery(query, {}, token);
  return data.users;
}

/**
 * Archive an item.
 * @param {string} token - Monday.com API token
 * @param {string|number} itemId - Item ID to archive
 * @returns {object} Archived item with id
 */
export async function archiveItem(token, itemId) {
  const mutation = `mutation ($itemId: ID!) {
    archive_item(item_id: $itemId) {
      id
    }
  }`;

  const data = await executeQuery(mutation, {
    itemId: String(itemId),
  }, token);

  return data.archive_item;
}

export default {
  createItem,
  createSubitems,
  updateItem,
  updateMultipleItems,
  moveItemToGroup,
  deleteItem,
  createGroup,
  getUsers,
  archiveItem,
};
