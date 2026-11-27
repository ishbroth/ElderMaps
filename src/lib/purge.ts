/** What a map mark says once its place is cleared: a city (shield or large icon) has its gates cleared, any other place is purged. */
export const purgedTag = (kind: string): string => (kind === 'crest' || kind === 'town' ? '[Gates Cleared]' : '[Purged]');
