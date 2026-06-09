// ── Standardised API response envelope ───────────────────────────────────────
// All responses follow the same shape so the client can handle them uniformly:
// { success, message, data?, meta?, errors? }

export const sendSuccess = (res, { message = 'OK', data = null, meta = null, status = 200 } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(status).json(body);
};

export const sendError = (res, { message = 'An error occurred', errors = null, status = 500 } = {}) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;

  // Never leak stack traces to the client
  return res.status(status).json(body);
};

// ── Named shortcuts ───────────────────────────────────────────────────────────

export const created    = (res, data, message = 'Created') => sendSuccess(res, { status: 201, message, data });
export const ok         = (res, data, message = 'OK')      => sendSuccess(res, { status: 200, message, data });
export const noContent  = (res)                             => res.status(204).send();

export const badRequest  = (res, message = 'Bad request',       errors = null) => sendError(res, { status: 400, message, errors });
export const unauthorized= (res, message = 'Unauthorized')                      => sendError(res, { status: 401, message });
export const forbidden   = (res, message = 'Forbidden')                         => sendError(res, { status: 403, message });
export const notFound    = (res, message = 'Not found')                         => sendError(res, { status: 404, message });
export const conflict    = (res, message = 'Conflict')                          => sendError(res, { status: 409, message });
export const tooMany     = (res, message = 'Too many requests')                 => sendError(res, { status: 429, message });
export const serverError = (res, message = 'Internal server error')             => sendError(res, { status: 500, message });
