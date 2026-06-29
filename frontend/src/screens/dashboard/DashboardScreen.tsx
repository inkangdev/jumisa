import { useEffect, useState } from "react";
import { useTheme } from "../../theme";
import type { Theme } from "../../theme";
import {
  fetchDashboard,
  type DashboardResponse,
  type MarketIndex,
  type RankItem,
  type RankKind,
} from "../../api/dashboard";

// ─── 포맷 헬퍼 ───────────────────────────────────────────────
function fmtIdx(n: number | null) {
  return n == null ? "-" : n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPrice(n: number | null) {
  return n == null ? "-" : n.toLocaleString("ko-KR");
}
function fmtVol(n: number | null) {
  return n == null ? "-" : n.toLocaleString("ko-KR");
}
function rateColor(r: number | null, T: Theme) {
  if (r == null) return T.sub;
  return r > 0 ? T.green : r < 0 ? T.red : T.sub;
}
function arrow(r: number | null) {
  if (r == null || r === 0) return "";
  return r > 0 ? "▲" : "▼";
}

// 환율 — 데이터 연동 전까지 정적 표시 (요청: 화면에만 추가)
const FX_PLACEHOLDER = [
  { lb: "🇺🇸 달러", vl: "1,378.50", chg: 4.2 },
  { lb: "🇯🇵 엔(100)", vl: "905.32", chg: -1.84 },
  { lb: "🇪🇺 유로", vl: "1,486.10", chg: 2.05 },
];

const RANK_TABS: { k: RankKind; label: string }[] = [
  { k: "vol", label: "거래량" },
  { k: "up", label: "상승률" },
  { k: "down", label: "하락률" },
];

// ─── 종목 로고 (실패 시 글자 폴백, 스크리너와 동일 패턴) ───
function StockLogo({ code, name }: { code: string; name: string | null }) {
  const T = useTheme();
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: "50%",
        border: `1.5px solid ${T.border}`, background: T.card2,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 900, color: T.sub, fontFamily: T.mono,
      }}>
        {(name ?? code).slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      src={`https://file.alphasquare.co.kr/media/images/stock_logo/kr/${code}.png`}
      alt={name ?? code}
      onError={() => setFailed(true)}
      style={{
        flexShrink: 0, width: 38, height: 38, borderRadius: "50%",
        objectFit: "cover", border: `1.5px solid ${T.border}`, background: T.card2,
      }}
    />
  );
}

export default function DashboardScreen() {
  const T = useTheme();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [rank, setRank] = useState<RankKind>("vol");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 데이터는 서버에서 장중 5분마다 갱신(시세 스냅샷·지수). 화면도 60초마다 조용히 재요청해
  // 안 눌러도 최신값이 반영되게 한다. 폴링 실패는 기존 데이터를 유지하고 무시(스피너 깜빡임 방지).
  useEffect(() => {
    let alive = true;
    const load = (initial: boolean) => {
      if (initial) setLoading(true);
      fetchDashboard(rank)
        .then((r) => {
          if (!alive) return;
          if (r.ok) { setData(r.data); setError(null); }
          else if (initial) setError(r.error);
        })
        .finally(() => { if (alive && initial) setLoading(false); });
    };
    load(true);
    const id = setInterval(() => load(false), 60_000);
    return () => { alive = false; clearInterval(id); };
  }, [rank]);

  const indices = data?.indices ?? [];
  const ranking = data?.ranking ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* 헤더 */}
      <div style={{ padding: "14px 16px 4px", flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color: T.text }}>오늘의 시장</div>
        <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>
          {loading && !data ? "불러오는 중…" : data?.baseDate ? `${data.baseDate} 기준` : "한눈에 보는 시장"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px 20px" }}>
        {error && (
          <div style={{ textAlign: "center", paddingTop: 40, color: T.red, fontSize: 14 }}>{error}</div>
        )}

        {/* 주요 지수 */}
        <SectionTitle title="주요 지수" />
        {indices.length === 0 ? (
          <EmptyHint text={loading ? "지수 불러오는 중…" : "지수 데이터가 아직 없어요"} />
        ) : (
          <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            margin: "0 -16px", paddingLeft: 16, paddingRight: 16,
          }}>
            {indices.map((x) => <IndexCard key={x.indexCode} idx={x} />)}
          </div>
        )}

        {/* 환율 (정적 UI — 데이터 연동 추후) */}
        <SectionTitle title="환율" right="연동 예정" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {FX_PLACEHOLDER.map((x) => {
            const c = rateColor(x.chg, T);
            return (
              <div key={x.lb} style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 11px",
              }}>
                <div style={{ fontSize: 10, color: T.sub }}>{x.lb}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: T.mono, marginTop: 5 }}>
                  {x.vl}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: c, fontFamily: T.mono, marginTop: 4 }}>
                  {arrow(x.chg)} {Math.abs(x.chg).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: T.mute, marginTop: 6 }}>
          ※ 환율은 표시용 샘플입니다 (실데이터 연동 예정)
        </div>

        {/* 오늘 많이 거래된 종목 */}
        <SectionTitle title="오늘 많이 거래된 종목" />
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
          {RANK_TABS.map((t) => {
            const on = rank === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setRank(t.k)}
                style={{
                  padding: "6px 14px", borderRadius: 20,
                  border: `1px solid ${on ? T.accent : T.border}`,
                  background: on ? T.accentBg : "transparent",
                  color: on ? T.accentL : T.sub,
                  fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.sans,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {ranking.length === 0 ? (
          <EmptyHint text={loading ? "불러오는 중…" : "표시할 종목이 없어요"} />
        ) : (
          ranking.map((s, i) => <RankRow key={s.stockCode} rank={i} item={s} last={i === ranking.length - 1} />)
        )}
      </div>
    </div>
  );
}

function SectionTitle({ title, right }: { title: string; right?: string }) {
  const T = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "18px 0 10px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{title}</div>
      {right && <div style={{ fontSize: 11, color: T.sub }}>{right}</div>}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  const T = useTheme();
  return <div style={{ color: T.sub, fontSize: 12, padding: "8px 0" }}>{text}</div>;
}

function IndexCard({ idx }: { idx: MarketIndex }) {
  const T = useTheme();
  const c = rateColor(idx.changeRate, T);
  const up = (idx.changeRate ?? 0) >= 0;
  return (
    <div style={{
      flex: "0 0 150px", background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "13px 14px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: T.sub }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: up ? T.green : T.red }} />
        {idx.indexName}
      </div>
      <div style={{ fontSize: 21, fontWeight: 900, color: T.text, fontFamily: T.mono, lineHeight: 1.1, marginTop: 6 }}>
        {fmtIdx(idx.closeIndex)}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: T.mono, marginTop: 3 }}>
        {arrow(idx.changeRate)} {idx.prevDiff != null ? Math.abs(idx.prevDiff).toFixed(2) : "-"}
        {idx.changeRate != null ? ` (${up ? "+" : ""}${idx.changeRate.toFixed(2)}%)` : ""}
      </div>
    </div>
  );
}

function RankRow({ rank, item, last }: { rank: number; item: RankItem; last: boolean }) {
  const T = useTheme();
  const c = rateColor(item.changeRate, T);
  const up = (item.changeRate ?? 0) >= 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0" }}>
        <div style={{
          flexShrink: 0, width: 20, textAlign: "center", fontSize: 13, fontWeight: 900,
          color: rank < 3 ? T.accent : T.sub, fontFamily: T.mono,
        }}>
          {rank + 1}
        </div>
        <StockLogo code={item.stockCode} name={item.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: T.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {item.name ?? item.stockCode}
          </div>
          <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono, marginTop: 2 }}>
            거래량 {fmtVol(item.volume)}주
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.mono }}>
            {fmtPrice(item.currentPrice)}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: c, fontFamily: T.mono, marginTop: 1 }}>
            {item.changeRate != null ? `${arrow(item.changeRate)} ${up ? "+" : ""}${item.changeRate.toFixed(2)}%` : "-"}
          </div>
        </div>
      </div>
      {!last && <div style={{ height: 1, background: T.border }} />}
    </div>
  );
}
