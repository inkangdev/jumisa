import type { ScreenerItem } from "./screener";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchWatchlist(sort = "recent"): Promise<Result<{ items: ScreenerItem[] }>> {
  try {
    const res = await fetch(`/api/watchlist?sort=${sort}`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: (data as { error?: string })?.error ?? `오류 (${res.status})` };
    return { ok: true, data: data as { items: ScreenerItem[] } };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다" };
  }
}

export async function toggleWatchlist(stockCode: string, isWatched: boolean): Promise<boolean> {
  const res = await fetch(`/api/watchlist/${stockCode}`, {
    method: isWatched ? "DELETE" : "POST",
    credentials: "include",
  });
  return res.ok;
}