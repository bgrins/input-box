export interface SuggestionItem {
  title: string;
  url: string | null;
  type: "history" | "bookmark" | "search" | "command" | "navigate" | "tab";
  icon?: string;
  faviconUrl?: string;
  visits?: number;
  lastVisitTime?: string;
}

export interface TabItem {
  id: string;
  title: string;
  url: string;
  faviconUrl?: string;
}

export type CommandType =
  | "tabs"
  | "history"
  | "bookmarks"
  | "complete-tabs"
  | "complete-history"
  | "complete-bookmarks";