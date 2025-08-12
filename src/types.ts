export interface SuggestionItem {
  title: string;
  url: string | null;
  type: "history" | "bookmark" | "search" | "command" | "navigate" | "tab";
  icon?: string;
  faviconUrl?: string;
  visits?: number;
  lastVisitTime?: string;
}

export interface HistoryData {
  [url: string]: {
    title?: string;
    visits: number;
    bookmarked: boolean;
    lastVisitTime: string;
  };
}

export interface TabItem {
  id: string;
  title: string;
  url: string;
  faviconUrl?: string;
}

export interface CommandSuggestion {
  id: string;
  label: string;
  description?: string;
  action: () => void;
}

export type CommandType = "tabs" | "history" | "bookmarks" | "complete-tabs";
