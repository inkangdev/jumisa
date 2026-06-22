import { useCallback, useEffect, useState } from "react";
import { T } from "../../theme";
import { fetchScreener, type ScreenerItem, type ScreenerParams, type ScreenerSort } from "../../api/screener";
import { fetchWatchlist, toggleWatchlist } from "../../api/watchlist";

// ─── 점수 색상 ────────────────────────────────────────────────────────────────
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

// ─── 포맷 헬퍼 ───────────────────────────────────────────────────────────────
function fmtPrice(n: number | null) {
  return n == null ? "-" : n.toLocaleString("ko-KR");
}
function fmtRate(r: number | null): { text: string; color: string } {
  if (r == null) return { text: "-", color: T.sub };
  const text = (r > 0 ? "+" : "") + r.toFixed(1) + "%";
  return { text, color: r > 0 ? T.green : r < 0 ? T.red : T.sub };
}
function fmtVal(v: number | null, dec: number) {
  return v == null ? "-" : v.toFixed(dec) + "x";
}

// ─── 슬라이더 기본값 = "필터 없음" ──────────────────────────────────────────
const PER_MAX = 50;
const PBR_MAX = 5;

const SORT_OPTS: { v: ScreenerSort; label: string }[] = [
  { v: "score", label: "점수순" },
  { v: "per",   label: "PER순" },
  { v: "pbr",   label: "PBR순" },
];

// ═══════════════════════════════════════════════════════════════════════════════
export default function UndervalueScreen() {
  const [market,     setMarket]     = useState<"kr" | "us">("kr");
  const [filterOpen, setFilterOpen] = useState(false);
  const [query,      setQuery]      = useState("");
  const [sort,       setSort]       = useState<ScreenerSort>("score");
  const [perMax,     setPerMax]     = useState(PER_MAX);
  const [pbrMax,     setPbrMax]     = useState(PBR_MAX);
  const [sector,     setSector]     = useState("");

  const [items,   setItems]   = useState<ScreenerItem[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [watched, setWatched] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: ScreenerParams = { sort };
    if (perMax < PER_MAX) params.perMax = perMax;
    if (pbrMax < PBR_MAX) params.pbrMax = pbrMax;
    if (sector)           params.sector = sector;

    const res = await fetchScreener(params);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setItems(res.data.items);
    setSectors(res.data.sectors);
  }, [sort, perMax, pbrMax, sector]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetchWatchlist().then((r) => {
      if (r.ok) setWatched(new Set(r.data.items.map((i) => i.stockCode)));
    });
  }, []);

  const handleToggle = async (stockCode: string, isWatched: boolean) => {
    const ok = await toggleWatchlist(stockCode, isWatched);
    if (ok) {
      setWatched((prev) => {
        const next = new Set(prev);
        isWatched ? next.delete(stockCode) : next.add(stockCode);
        return next;
      });
    }
  };

  // 종목명·코드 즉시 검색 (클라이언트 필터)
  const q = query.trim().toLowerCase();
  const visible = q
    ? items.filter((it) =>
        (it.name ?? "").toLowerCase().includes(q) || it.stockCode.toLowerCase().includes(q))
    : items;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, fontFamily: T.sans }}>

      {/* ── 헤더 ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 8px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>저평가 스크리너</div>
        </div>
        <button
          onClick={() => setFilterOpen((o) => !o)}
          style={{
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${filterOpen ? T.accent : T.border}`,
            background: filterOpen ? T.accentBg : T.card,
            color: filterOpen ? T.accent : T.sub,
            fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >⚙</button>
      </div>

      {/* ── 국내/미국 탭 ─────────────────────────────────────────────────── */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 8 }}>
        <MarketTab label="🇰🇷 국내" active={market === "kr"} onClick={() => setMarket("kr")} />
        <MarketTab label="🇺🇸 미국" active={market === "us"} onClick={() => setMarket("us")} disabled />
      </div>

      {/* ── 종목명 검색 ──────────────────────────────────────────────────── */}
      <div style={{ padding: "0 16px 10px", position: "relative" }}>
        <span style={{
          position: "absolute", left: 28, top: "50%", transform: "translateY(-50%)",
          fontSize: 14, color: T.mute, pointerEvents: "none",
        }}>🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="종목명·코드 검색"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "9px 34px 9px 36px", borderRadius: 10,
            border: `1px solid ${T.border}`, background: T.card,
            color: T.text, fontFamily: T.sans, fontSize: 16, outline: "none",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            style={{
              position: "absolute", right: 26, top: "50%", transform: "translateY(-50%)",
              width: 20, height: 20, borderRadius: "50%", border: "none",
              background: T.card2, color: T.sub, fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >✕</button>
        )}
      </div>

      {/* ── 필터 패널 ─────────────────────────────────────────────────────── */}
      {filterOpen && (
        <FilterPanel
          sort={sort}       onSort={setSort}
          perMax={perMax}   onPerMax={setPerMax}
          pbrMax={pbrMax}   onPbrMax={setPbrMax}
          sector={sector}   onSector={setSector}
          sectors={sectors}
        />
      )}

      {/* ── 목록 영역 ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {market === "us" ? (
          <Empty icon="🇺🇸" msg={"미국 종목은 준비 중입니다"} />
        ) : loading ? (
          <Loading />
        ) : error ? (
          <Empty icon="⚠️" msg={error} />
        ) : items.length === 0 ? (
          <Empty icon="📊" msg={"저평가 점수 데이터를 적재 중입니다\n잠시 후 다시 확인해 주세요"} />
        ) : visible.length === 0 ? (
          <Empty icon="🔍" msg={`'${query.trim()}' 검색 결과가 없습니다`} />
        ) : (
          visible.map((item) => (
            <StockCard
              key={item.stockCode}
              item={item}
              isWatched={watched.has(item.stockCode)}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── 마켓 탭 버튼 ─────────────────────────────────────────────────────────────
function MarketTab({ label, active, onClick, disabled }: {
  label: string; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1, height: 40, borderRadius: 20, border: "none",
        background: active ? T.accent : T.card,
        color: active ? "#fff" : disabled ? T.mute : T.sub,
        fontFamily: T.sans, fontWeight: 700, fontSize: 14,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >{label}</button>
  );
}

// ─── 필터 패널 ────────────────────────────────────────────────────────────────
function FilterPanel({ sort, onSort, perMax, onPerMax, pbrMax, onPbrMax, sector, onSector, sectors }: {
  sort: ScreenerSort;     onSort: (v: ScreenerSort) => void;
  perMax: number;         onPerMax: (v: number) => void;
  pbrMax: number;         onPbrMax: (v: number) => void;
  sector: string;         onSector: (v: string) => void;
  sectors: string[];
}) {
  return (
    <div style={{
      margin: "0 16px 10px", padding: "14px 16px",
      background: T.card, borderRadius: 14, border: `1px solid ${T.border}`,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      {/* 정렬 */}
      <div>
        <Label>정렬</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {SORT_OPTS.map((o) => (
            <button key={o.v} onClick={() => onSort(o.v)} style={{
              flex: 1, padding: "7px 0", borderRadius: 8,
              border: `1px solid ${sort === o.v ? T.accent : T.border}`,
              background: sort === o.v ? T.accentBg : "transparent",
              color: sort === o.v ? T.accent : T.sub,
              fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* PER 슬라이더 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.sub }}>
            PER 상한 <span style={{ fontSize: 11, color: T.mute }}>(주가÷순이익)</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {perMax < PER_MAX ? `${perMax}x 이하` : "제한 없음"}
          </span>
        </div>
        <input type="range" min={5} max={PER_MAX} step={1} value={perMax}
          onChange={(e) => onPerMax(Number(e.target.value))}
          style={{ width: "100%", accentColor: T.accent }} />
      </div>

      {/* PBR 슬라이더 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: T.sub }}>
            PBR 상한 <span style={{ fontSize: 11, color: T.mute }}>(주가÷순자산)</span>
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {pbrMax < PBR_MAX ? `${pbrMax.toFixed(1)}x 이하` : "제한 없음"}
          </span>
        </div>
        <input type="range" min={0.1} max={PBR_MAX} step={0.1} value={pbrMax}
          onChange={(e) => onPbrMax(Number(e.target.value))}
          style={{ width: "100%", accentColor: T.accent }} />
      </div>

      {/* 업종 선택 (데이터가 있을 때만) */}
      {sectors.length > 0 && (
        <div>
          <Label>업종</Label>
          <select value={sector} onChange={(e) => onSector(e.target.value)} style={{
            width: "100%", padding: "8px 10px", borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.card2,
            color: T.text, fontFamily: T.sans, fontSize: 13,
          }}>
            <option value="">전체</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* 저평가 점수 안내 */}
      <div style={{
        padding: "10px 12px", borderRadius: 8, background: T.card2,
        fontSize: 11, color: T.sub, lineHeight: 1.7,
      }}>
        <strong style={{ color: T.text }}>저평가 점수</strong> = PER 30% + PBR 30% + EV/EBITDA 25% + 성장률 15%<br />
        시장 전체 대비 상대 순위 0~100점 · 높을수록 저평가
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: T.sub, marginBottom: 8 }}>{children}</div>;
}

// ─── 종목 로고 ────────────────────────────────────────────────────────────────
export function StockLogo({ code, score }: { code: string; score: number | null }) {
  const [failed, setFailed] = useState(false);
  const color = scoreColor(score);
  const rounded = score != null ? Math.round(score) : null;

  if (failed) {
    return (
      <div style={{
        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
        background: scoreBg(score),
        border: `2px solid ${color}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 15, fontWeight: 900, color, lineHeight: 1 }}>{rounded ?? "-"}</div>
        {rounded != null && <div style={{ fontSize: 9, color, opacity: 0.75 }}>점</div>}
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flexShrink: 0, width: 48, height: 48 }}>
      <img
        src={`https://file.alphasquare.co.kr/media/images/stock_logo/kr/${code}.png`}
        alt={code}
        onError={() => setFailed(true)}
        style={{
          width: 48, height: 48, borderRadius: "50%",
          objectFit: "cover",
          border: `1.5px solid ${T.border}`,
          background: T.card2,
        }}
      />
      <div style={{
        position: "absolute", bottom: -2, right: -2,
        minWidth: 18, height: 18, borderRadius: 9, padding: "0 3px",
        background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 900, color: "#fff", fontFamily: T.mono,
        border: `1.5px solid ${T.bg}`,
        boxSizing: "border-box",
      }}>
        {rounded ?? "-"}
      </div>
    </div>
  );
}

// ─── 종목 카드 ────────────────────────────────────────────────────────────────
function StockCard({ item, isWatched, onToggle }: {
  item: ScreenerItem;
  isWatched: boolean;
  onToggle: (code: string, currently: boolean) => void;
}) {
  const rate = fmtRate(item.changeRate);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 16px",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <StockLogo code={item.stockCode} score={item.totalScore} />

      {/* 종목명 + 지표 */}
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

      {/* 현재가 + 등락률 */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{fmtPrice(item.currentPrice)}</div>
        <div style={{ fontSize: 13, color: rate.color }}>{rate.text}</div>
      </div>

      <button
        onClick={() => onToggle(item.stockCode, isWatched)}
        style={{
          width: 30, height: 30, flexShrink: 0,
          background: "transparent", border: "none",
          fontSize: 18, color: isWatched ? T.accent : T.mute, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}
      >{isWatched ? "★" : "☆"}</button>
    </div>
  );
}

// ─── 공통 상태 UI ─────────────────────────────────────────────────────────────
function Empty({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div style={{
      height: 280, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 12, padding: 24, textAlign: "center",
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontSize: 14, color: T.sub, whiteSpace: "pre-line" }}>{msg}</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 13, color: T.sub }}>불러오는 중…</div>
    </div>
  );
}