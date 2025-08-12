import profilesData from "../../public/profiles.json" with { type: "json" };
import type { HistoryData, SuggestionItem, TabItem } from "../types";

// Load saved profile from localStorage or default to anna
let currentProfile = localStorage.getItem("selectedProfile") || "anna";
export let historyData = profilesData[
  currentProfile as keyof typeof profilesData
] as HistoryData;

// Function to switch profiles
export function switchProfile(profileName: string): void {
  if (profileName in profilesData) {
    currentProfile = profileName;
    historyData = profilesData[
      profileName as keyof typeof profilesData
    ] as HistoryData;
  }
}

export function getCurrentProfile(): string {
  return currentProfile;
}

// Mock tabs - using first 5 items from history as tabs
export function getMockTabs(): TabItem[] {
  const entries = Object.entries(historyData).slice(0, 5);
  return entries.map(([url, data], index) => ({
    id: `tab-${index}`,
    title: data.title || url,
    url,
    faviconUrl: getFaviconUrl(url),
  }));
}

export function getFaviconUrl(url: string, size: number = 32): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
  } catch {
    return "";
  }
}

export function getTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    let title = urlObj.hostname.replace("www.", "");

    if (url.includes("search?")) {
      const params = new URLSearchParams(urlObj.search);
      const query = params.get("q");
      if (query) {
        return `Search: ${query}`;
      }
    }

    if (urlObj.pathname && urlObj.pathname !== "/") {
      const pathParts = urlObj.pathname.split("/").filter((p) => p);
      if (pathParts.length > 0) {
        title += ` - ${pathParts[0].replace(/-/g, " ")}`;
      }
    }

    return title.charAt(0).toUpperCase() + title.slice(1);
  } catch {
    return url;
  }
}

export function processHistoryData(): SuggestionItem[] {
  return Object.entries(historyData)
    .map(([url, data]) => ({
      title: data.title || getTitleFromUrl(url),
      url,
      type: data.bookmarked ? ("bookmark" as const) : ("history" as const),
      faviconUrl: getFaviconUrl(url),
      visits: data.visits,
      lastVisitTime: data.lastVisitTime,
    }))
    .sort((a, b) => {
      if (b.visits !== a.visits) {
        return (b.visits || 0) - (a.visits || 0);
      }
      return (b.lastVisitTime || "").localeCompare(a.lastVisitTime || "");
    });
}

// Get recent history items (max 20)
export function getRecentHistory(): SuggestionItem[] {
  return processHistoryData()
    .filter((item) => item.type === "history")
    .slice(0, 20);
}

// Get bookmarked items
export function getBookmarks(): SuggestionItem[] {
  return processHistoryData()
    .filter((item) => item.type === "bookmark")
    .slice(0, 20);
}
