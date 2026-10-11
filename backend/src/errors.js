export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Validate with a zod schema; unknown fields are rejected via .strict() in the schemas.
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ');
    throw new HttpError(400, 'VALIDATION_ERROR', msg);
  }
  return r.data;
}

export function page(query) {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  return { take: limit, skip: offset };
}

// Consistent error shape: { error: { code, message } }. Never leaks internals.
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: { code: 'TOO_LARGE', message: 'Request too large' } });
  if (err instanceof SyntaxError) return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Malformed JSON' } });
  if (err?.code === 'P2002') return res.status(409).json({ error: { code: 'CONFLICT', message: 'That conflicts with an existing record' } });
  console.error('Unhandled error:', err?.code || err?.name || 'unknown'); // no payloads, tokens or PII
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
}
