/**
 * Encode a cursor (start index) to base64
 */
export function encodeCursor(index: number): string {
  return Buffer.from(String(index)).toString('base64');
}

/**
 * Decode a base64 cursor to start index
 */
export function decodeCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const index = parseInt(decoded, 10);
    if (isNaN(index) || index < 0) {
      throw new Error('Invalid cursor value');
    }
    return index;
  } catch {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Apply cursor-based pagination to an array of items.
 * @param items - Full array of items to paginate
 * @param limit - Number of items per page
 * @param cursor - Base64-encoded start index (optional)
 * @returns Paginated response with prev/next cursors
 */
export function cursorPaginate<T>(
  items: T[],
  limit: number = 25,
  cursor?: string
): {
  data: T[];
  prevCursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
} {
  const startIndex = cursor ? decodeCursor(cursor) : 0;
  const endIndex = startIndex + limit;

  const data = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;

  return {
    data,
    prevCursor: startIndex > 0 ? encodeCursor(Math.max(0, startIndex - limit)) : null,
    nextCursor: hasMore ? encodeCursor(endIndex) : null,
    hasMore,
  };
}
