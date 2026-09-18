function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source).sort().map(key => [key, canonicalize(source[key])]),
    );
  }
  return value;
}

/**
 * Canonical JSON: object keys sorted lexicographically at every depth,
 * arrays kept in domain order, and no insignificant whitespace.
 */
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
