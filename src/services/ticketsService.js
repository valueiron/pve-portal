import { API_ENDPOINTS } from '../config/api';

const jsonFetch = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      errMsg = body.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  if (response.status === 204) return null;
  return response.json();
};

// ── Boards ──────────────────────────────────────────────────────────────────

export const fetchBoards = () =>
  jsonFetch(API_ENDPOINTS.TICKETS_BOARDS);

export const createBoard = (data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_BOARDS, { method: 'POST', body: JSON.stringify(data) });

export const updateBoard = (id, data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_BOARD(id), { method: 'PUT', body: JSON.stringify(data) });

export const deleteBoard = (id) =>
  jsonFetch(API_ENDPOINTS.TICKETS_BOARD(id), { method: 'DELETE' });

// ── Columns ─────────────────────────────────────────────────────────────────

export const fetchColumns = (boardId) =>
  jsonFetch(API_ENDPOINTS.TICKETS_COLUMNS(boardId));

export const createColumn = (boardId, data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_COLUMNS(boardId), { method: 'POST', body: JSON.stringify(data) });

export const updateColumn = (boardId, colId, data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_COLUMN(boardId, colId), { method: 'PUT', body: JSON.stringify(data) });

export const deleteColumn = (boardId, colId) =>
  jsonFetch(API_ENDPOINTS.TICKETS_COLUMN(boardId, colId), { method: 'DELETE' });

export const reorderColumns = (boardId, order) =>
  jsonFetch(API_ENDPOINTS.TICKETS_COLUMNS_REORDER(boardId), { method: 'PUT', body: JSON.stringify({ order }) });

// ── Tickets ─────────────────────────────────────────────────────────────────

export const fetchTickets = (boardId, columnId) => {
  const url = columnId
    ? `${API_ENDPOINTS.TICKETS_LIST(boardId)}?column_id=${columnId}`
    : API_ENDPOINTS.TICKETS_LIST(boardId);
  return jsonFetch(url);
};

export const createTicket = (boardId, data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_LIST(boardId), { method: 'POST', body: JSON.stringify(data) });

export const updateTicket = (boardId, tickId, data) =>
  jsonFetch(API_ENDPOINTS.TICKETS_TICKET(boardId, tickId), { method: 'PUT', body: JSON.stringify(data) });

export const deleteTicket = (boardId, tickId) =>
  jsonFetch(API_ENDPOINTS.TICKETS_TICKET(boardId, tickId), { method: 'DELETE' });

export const moveTicket = (boardId, tickId, columnId, position) =>
  jsonFetch(API_ENDPOINTS.TICKETS_MOVE(boardId, tickId), {
    method: 'PUT',
    body: JSON.stringify({ column_id: columnId, position }),
  });
