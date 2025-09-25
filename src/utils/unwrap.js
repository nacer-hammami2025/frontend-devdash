// Generic helpers to unwrap API responses that may be wrapped in { success, data } and/or pagination { items, meta }
// Always returns a normalized shape to keep components simpler.

export function unwrapPayload(resp) {
  return resp?.data?.data ?? resp?.data; // axios response -> backend envelope or raw
}

export function unwrapList(resp) {
  const payload = unwrapPayload(resp);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export function unwrapWithMeta(resp) {
  const payload = unwrapPayload(resp);
  if (Array.isArray(payload)) return { items: payload, meta: undefined };
  if (payload && Array.isArray(payload.items)) return { items: payload.items, meta: payload.meta };
  return { items: [], meta: undefined };
}

// Unwrap a single object (project / task detail) potentially wrapped twice
export function unwrapSingle(resp) {
  const payload = unwrapPayload(resp);
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;
  return null;
}
