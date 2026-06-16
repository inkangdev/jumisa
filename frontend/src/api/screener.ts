export type ScreenerItem = {
  stockCode: string;
  name: string | null;
  sector: string | null;
  market: string | null;
  totalScore: number | null;
  rank: number | null;
  per: number | null;
  pbr: number | null;
  currentPrice: number | null;
  changeRate: number | null;
};

export type ScreenerResponse = {
  items: ScreenerItem[];
  sectors: string[];
  totalCount: number;
};

export type ScreenerSort = "score" | "per" | "pbr";

export type ScreenerParams = {
  sort?: ScreenerSort;
  perMax?: number;
  pbrMax?: number;
  sector?: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function fetchScreener(params: ScreenerParams = {}): Promise<Result<ScreenerResponse>> {
  try {
    const qs = new URLSearchParams();
    if (params.sort)           qs.set("sort",   params.sort);
    if (params.perMax != null) qs.set("perMax", String(params.perMax));
    if (params.pbrMax != null) qs.set("pbrMax", String(params.pbrMax));
    if (params.sector)         qs.set("sector", params.sector);

    const res = await fetch(`/api/screener?${qs}`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: (data as { error?: string })?.error ?? `오류 (${res.status})` };
    return { ok: true, data: data as ScreenerResponse };
  } catch {
    return { ok: false, error: "서버에 연결할 수 없습니다" };
  }
}