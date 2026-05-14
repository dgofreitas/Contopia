// Contopia — Standard Response Envelope Helpers

/**
 * Success envelope with optional metadata.
 * @param {*} data - The response payload
 * @param {object} meta - Additional metadata (merged with defaults)
 * @returns {{ data, meta }}
 */
export function ok(data, meta = {}) {
  return { data, meta };
}

/**
 * Paginated success envelope.
 * @param {*} data - The response payload (array of items)
 * @param {{ total, page, pageSize, totalPages }} pagination - Pagination metadata
 * @returns {{ data, meta: { pagination } }}
 */
export function paginated(data, pagination) {
  return { data, meta: { pagination } };
}

/**
 * Error envelope.
 * @param {string} code - Error code (e.g. 'VALIDATION_ERROR')
 * @param {string} message - Child-friendly error message
 * @param {object} meta - Additional metadata
 * @returns {{ error: { code, message }, meta }}
 */
export function fail(code, message, meta = {}) {
  return { error: { code, message }, meta };
}