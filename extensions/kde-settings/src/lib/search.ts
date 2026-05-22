import type { SettingResult } from "../types.js";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function haystack(result: SettingResult): string[] {
  return [
    result.title,
    result.subtitle,
    result.accessory,
    result.type,
    ...result.keywords
  ].map(normalize);
}

export function matchesQuery(result: SettingResult, query: string): boolean {
  const normalizedQuery = normalize(query);

  if (normalizedQuery.length === 0) {
    return true;
  }

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const fields = haystack(result);

  return terms.every((term) => fields.some((field) => field.includes(term)));
}

export function rankResult(result: SettingResult, query: string): number {
  const normalizedQuery = normalize(query);

  if (normalizedQuery.length === 0) {
    return result.type === "module" ? 30 : 20;
  }

  const title = normalize(result.title);
  const keywords = result.keywords.map(normalize);
  const subtitle = normalize(result.subtitle);
  const accessory = normalize(result.accessory);

  if (title === normalizedQuery) {
    return 1000;
  }

  if (title.startsWith(normalizedQuery)) {
    return 900;
  }

  if (keywords.some((keyword) => keyword === normalizedQuery || keyword.startsWith(normalizedQuery))) {
    return 800;
  }

  if (subtitle.includes(normalizedQuery) || accessory.includes(normalizedQuery)) {
    return 700;
  }

  if (title.includes(normalizedQuery)) {
    return 600;
  }

  if (result.type === "module") {
    return 500;
  }

  return 100;
}

export function sortResults(results: SettingResult[], query: string): SettingResult[] {
  return [...results].sort((left, right) => {
    const rankDelta = rankResult(right, query) - rankResult(left, query);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return left.title.localeCompare(right.title);
  });
}
