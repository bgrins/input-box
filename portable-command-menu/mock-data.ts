import type { TabItem, SuggestionItem } from "./types";

// Helper function to get favicon URL from domain
export function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}

// Mock tabs data
export function getMockTabs(): TabItem[] {
  return [
    {
      id: "tab-1",
      title: "GitHub - Code hosting platform",
      url: "https://github.com",
      faviconUrl: getFaviconUrl("https://github.com"),
    },
    {
      id: "tab-2",
      title: "Stack Overflow - Developer Q&A",
      url: "https://stackoverflow.com",
      faviconUrl: getFaviconUrl("https://stackoverflow.com"),
    },
    {
      id: "tab-3",
      title: "MDN Web Docs",
      url: "https://developer.mozilla.org",
      faviconUrl: getFaviconUrl("https://developer.mozilla.org"),
    },
    {
      id: "tab-4",
      title: "TypeScript Documentation",
      url: "https://www.typescriptlang.org/docs/",
      faviconUrl: getFaviconUrl("https://www.typescriptlang.org"),
    },
    {
      id: "tab-5",
      title: "Lit Element Documentation",
      url: "https://lit.dev",
      faviconUrl: getFaviconUrl("https://lit.dev"),
    },
  ];
}

// Mock history data
export function getMockHistory(): SuggestionItem[] {
  return [
    {
      title: "JavaScript Tutorial - W3Schools",
      url: "https://www.w3schools.com/js/",
      type: "history",
      faviconUrl: getFaviconUrl("https://www.w3schools.com"),
      visits: 15,
      lastVisitTime: "2024-01-20T10:30:00Z",
    },
    {
      title: "React Documentation",
      url: "https://react.dev",
      type: "history",
      faviconUrl: getFaviconUrl("https://react.dev"),
      visits: 25,
      lastVisitTime: "2024-01-19T14:20:00Z",
    },
    {
      title: "Node.js Documentation",
      url: "https://nodejs.org/docs/",
      type: "history",
      faviconUrl: getFaviconUrl("https://nodejs.org"),
      visits: 10,
      lastVisitTime: "2024-01-18T09:15:00Z",
    },
    {
      title: "CSS-Tricks - Web Design Blog",
      url: "https://css-tricks.com",
      type: "history",
      faviconUrl: getFaviconUrl("https://css-tricks.com"),
      visits: 8,
      lastVisitTime: "2024-01-17T16:45:00Z",
    },
    {
      title: "npm - Package Registry",
      url: "https://www.npmjs.com",
      type: "history",
      faviconUrl: getFaviconUrl("https://www.npmjs.com"),
      visits: 30,
      lastVisitTime: "2024-01-20T11:00:00Z",
    },
  ];
}

// Mock bookmarks data
export function getMockBookmarks(): SuggestionItem[] {
  return [
    {
      title: "Google",
      url: "https://www.google.com",
      type: "bookmark",
      faviconUrl: getFaviconUrl("https://www.google.com"),
    },
    {
      title: "YouTube",
      url: "https://www.youtube.com",
      type: "bookmark",
      faviconUrl: getFaviconUrl("https://www.youtube.com"),
    },
    {
      title: "Twitter / X",
      url: "https://twitter.com",
      type: "bookmark",
      faviconUrl: getFaviconUrl("https://twitter.com"),
    },
    {
      title: "LinkedIn",
      url: "https://www.linkedin.com",
      type: "bookmark",
      faviconUrl: getFaviconUrl("https://www.linkedin.com"),
    },
    {
      title: "DEV Community",
      url: "https://dev.to",
      type: "bookmark",
      faviconUrl: getFaviconUrl("https://dev.to"),
    },
  ];
}

// Example data provider that can be customized
export const mockDataProvider = {
  getTabs: getMockTabs,
  getHistory: getMockHistory,
  getBookmarks: getMockBookmarks,
};