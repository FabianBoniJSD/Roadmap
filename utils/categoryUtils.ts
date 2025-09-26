import { Category } from '@/types';

export const UNCATEGORIZED_ID = '__uncategorized__';

const toTrimmedString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

/**
 * Attempts to locate a category by comparing against multiple representations
 * that SharePoint may return (Id, numeric string, decimal numeric string, or name).
 */
export const findCategoryByAnyValue = (
  value: unknown,
  categories: Category[]
): Category | undefined => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return undefined;
  }

  const raw = toTrimmedString(value);
  if (!raw) {
    return undefined;
  }

  const direct = categories.find((cat) => cat.id === raw);
  if (direct) {
    return direct;
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const collapsed = String(parseInt(raw, 10));
    const numericExact = categories.find((cat) => cat.id === collapsed);
    if (numericExact) {
      return numericExact;
    }

    const numericLoose = categories.find(
      (cat) => /^\d+$/.test(cat.id) && parseInt(cat.id, 10) === parseInt(raw, 10)
    );
    if (numericLoose) {
      return numericLoose;
    }
  }

  const lowered = raw.toLowerCase();
  const byName = categories.find(
    (cat) => toTrimmedString(cat.name).toLowerCase() === lowered
  );
  if (byName) {
    return byName;
  }

  return undefined;
};

/**
 * Normalizes an incoming category value to the canonical category ID when possible.
 * Falls back to the uncategorized sentinel when no match is found.
 */
export const normalizeCategoryId = (
  value: unknown,
  categories: Category[]
): string => {
  const match = findCategoryByAnyValue(value, categories);
  if (match) {
    return match.id;
  }

  const raw = toTrimmedString(value);
  if (!raw) {
    return UNCATEGORIZED_ID;
  }

  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return String(parseInt(raw, 10));
  }

  return UNCATEGORIZED_ID;
};

interface ResolveCategoryNameOptions {
  emptyLabel?: string;
  unknownLabel?: string;
  preferRawFallback?: boolean;
}

/**
 * Resolves a human-readable category name from an arbitrary category value.
 */
export const resolveCategoryName = (
  value: unknown,
  categories: Category[],
  options: ResolveCategoryNameOptions = {}
): string => {
  const { emptyLabel = 'Unkategorisiert', unknownLabel = 'Unknown', preferRawFallback = true } = options;

  if (Array.isArray(categories) && categories.length > 0) {
    const match = findCategoryByAnyValue(value, categories);
    if (match) {
      return match.name;
    }
  }

  const raw = toTrimmedString(value);
  if (!raw || raw === UNCATEGORIZED_ID) {
    return emptyLabel;
  }

  return preferRawFallback ? raw : unknownLabel;
};
