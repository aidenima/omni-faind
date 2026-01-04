export type SavedHistoryResult = {
  name: string;
  profileUrl: string;
  snippet: string | null;
  rawSnippet: string | null;
  source:
    | "linkedin"
    | "upwork"
    | "behance"
    | "fiverr"
    | "github"
    | "unknown";
};

export const HISTORY_RESULTS_PREVIEW_LIMIT = 150;
