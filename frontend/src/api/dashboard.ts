import { notifyUnauthorized } from "./session";

export type MarketIndex = {
  indexCode: string;
  indexName: string;
  closeIndex: number | null;
  prevDiff: number | null;
  changeRate: number | null;
  baseDate: string | null;
};

export type RankItem = {
  stockCode: string;
  name: string | null;
  market: string | null;
  currentPrice: number | null;
  changeRate: number | null;
  volume: number | null;
};

export type RankKind = "vol" | "up" | "down";

export type DashboardResponse = {
  indices: MarketIndex[];
  rank: string;
  ranking: RankItem[];
  baseDate: string | null;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchDashboard(rank: RankKind = "vol"): Promise<Result<DashboardResponse>> {
  try {
    const res = await fetch(`/api/dashboard?rank=${rank}`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) notifyUnauthorized();
      return { ok: false, error: (data as { error?: string })?.error ?? `오류 (${res.status})` };
    }
    return { ok: true, data: data as DashboardResponse };
  } catch {
    return { ok: false, error: "네트워크 오류가 발생했어요" };
  }
}
