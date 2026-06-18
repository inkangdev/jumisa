import { useCallback, useEffect, useState } from "react";
import { T } from "../../theme";
import { fetchWatchlist, toggleWatchlist } from "../../api/watchlist";
import type { ScreenerItem } from "../../api/screener";

type WatchSort = "recent" | "price" | "rate" | "score";

const SORT_OPTS: { v: WatchSort; label: string }[] = [
  { v: "recent", label: "최신순" },
  { v: "price",  label: "가격순" },
  { v: "rate",   label: "등락률순" },
  { v: "score",  label: "점수순" },
];

function scoreColor(s: number | null) {
  if (s == null) return T.mute;
  if (s >= 90) return T.green;
  if (s >= 75) return T.accent;
  if (s >= 60) return T.amber;
  return T.red;
}
function scoreBg(s: number | null) {
  if (s == null) return T.card2;
  if (s >= 90) return T.greenBg;
  if (s >= 75) return T.accentBg;
  if (s >= 60) return T.amberBg;
  return T.redBg;
}
function fmtPrice(n: number | null) {
  return n == null ? "-" : n.toLocaleString("ko-KR");
}
function fmtRate(r: number | null): { text: string; color: string } {
  if (r == null) return { text: "-", color: T.sub };
  return { text: (r > 0 ? "+" : "") + r.toFixed(1) + "%", color: r > 0 ? T.green : r < 0 ? T.red : T.sub };
}
function fmtVal(v: number | null, dec: number) {
  return v == null ? "-" : v.toFixed(dec) + "x";
}

export default function WatchlistScreen() {
  const [sort, setSort] = useState<WatchSort>("recent");
  const [items, setItems] = useState<ScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await fetchWatchlist(sort);
    setLoading(false);
    if (r.ok) setItems(r.data.items);
    else setError(r.error);
  }, [sort]);

  useEffect(() => { void load(); }, [load]);

  const handleRemove = async (stockCode: string) => {
    const ok = await toggleWatchlist(stockCode, true);
    if (ok) setItems((prev) => prev.filter((i) => i.stockCode !== stockCode));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, fontFamily: T.sans }}>
      {/* 헤더 */}
      <div style={{ padding: "20px 16px 12px" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: T.text, marginBottom: 12 }}>관심종목</div>
        <div style={{ display: "flex", gap: 6 }}>
          {SORT_OPTS.map((o) => (
            <button
              key={o.v}
              onClick={() => setSort(o.v)}
              style={{
                flex: 1, padding: "7px 0", borderRadius: 8,
                border: `1px solid ${sort === o.v ? T.accent : T.border}`,
                background: sort === o.v ? T.accentBg : T.card,
                color: sort === o.v ? T.accent : T.sub,
                fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer",
              }}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          <Empty icon="" msg="불러오는 중…" />
        ) : error ? (
          <Empty icon="⚠️" msg={error} />
        ) : items.length === 0 ? (
          <Empty icon="☆" msg={"담은 관심종목이 없어요\n스크리너에서 ☆를 눌러 추가해보세요"} />
        ) : (
          items.map((item) => (
            <WatchCard key={item.stockCode} item={item} onRemove={handleRemove} />
          ))
        )}
      </div>
    </div>
  );
}

function WatchCard({ item, onRemove }: { item: ScreenerItem; onRemove: (code: string) => void }) {
  const score = item.totalScore != null ? Math.round(item.totalScore) : null;
  const rate = fmtRate(item.changeRate);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 16px",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
        background: scoreBg(score),
        border: `2px solid ${scoreColor(score)}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color: scoreColor(score), lineHeight: 1 }}>
          {score ?? "-"}
        </div>
        {score != null && (
          <div style={{ fontSize: 9, color: scoreColor(score), opacity: 0.75 }}>점</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.name ?? item.stockCode}
        </div>
        <div style={{ fontSize: 12, color: T.sub }}>
          {"PER "}{fmtVal(item.per, 1)}
          {" · "}
          {"PBR "}{fmtVal(item.pbr, 1)}
          {item.sector ? ` · ${item.sector}` : ""}
        </div>
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fmtPrice(item.currentPrice)}</div>
        <div style={{ fontSize: 13, color: rate.color }}>{rate.text}</div>
      </div>

      <button
        onClick={() => onRemove(item.stockCode)}
        style={{
          width: 30, height: 30, flexShrink: 0,
          background: "transparent", border: "none",
          fontSize: 18, color: T.accent, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}
      >★</button>
    </div>
  );
}

function Empty({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{
      height: 280, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, padding: 24, textAlign: "center",
    }}>
      {icon && <div style={{ fontSize: 40 }}>{icon}</div>}
      <div style={{ fontSize: 14, color: T.sub, whiteSpace: "pre-line" }}>{msg}</div>
    </div>
  );
}