/**
 * Tag utility functions for normalizing and managing tags.
 */

export const DEFAULT_HOSTEL_TAGS = [
  'veg',
  'non-veg',
  'rice',
  'bread',
  'dal',
  'sabzi',
  'paneer',
  'egg',
  'chicken',
  'fried',
  'sweet',
  'dessert',
  'spicy',
  'healthy',
  'beverage'
];

/**
 * Normalizes an array of tags: trims whitespace, converts to lowercase,
 * removes empty strings and duplicates.
 */
export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const normalized = tags
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);

  return Array.from(new Set(normalized));
}
