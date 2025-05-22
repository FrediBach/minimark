export type SortKey =
  | "default"
  | "addDateDesc" | "addDateAsc"
  | "lastClickDateDesc" | "lastClickDateAsc"
  | "clicksDesc" | "clicksAsc"
  | "titleAsc" | "titleDesc";

export type ItemDisplayMode = 'dynamic' | 's' | 'm' | 'l' | 'xl';

export type GroupLinkDisplayOrder = 'mixed' | 'groupsFirst' | 'linksFirst';

export const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
export const ARCHIVE_THRESHOLDS = {
  '1m': ONE_MONTH_MS,
  '6m': 6 * ONE_MONTH_MS,
  '1y': 12 * ONE_MONTH_MS,
  '5y': 5 * 12 * ONE_MONTH_MS,
  '10y': 10 * 12 * ONE_MONTH_MS,
};
export type ArchiveThresholdKey = keyof typeof ARCHIVE_THRESHOLDS;