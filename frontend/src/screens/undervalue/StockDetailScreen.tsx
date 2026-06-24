import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";
import {
  type ChartPeriod,
  type ChartPoint,
  type StockDetail,
  fetchStockChart,
  fetchStockDetail,
} from "../../api/screener";
import { toggleWatchlist } from "../../api/watchlist";

type Props = {
  stockCode: string;
  initialItem: StockDetail;
  isWatched: boolean;
  onBack: () => void;
  onWatchChange: (code: string, watched: boolean) => void;
};

const PERIODS: { v: ChartPeriod; label: string }[] = [
  { v: "1M", label: "1개월" },
  { v: "3M", label: "3개월" },
  { v: "6M", label: "6개월" },
  { v: "1Y", label: "1년" },
];

const PAD = { t: 12, r: 8, b: 18, l: 8 };
const CHART_H = 180;

export default function StockDetailScreen({ stockCode, initialItem, isWatched, onBack, onWatchChange }: Props) {
  const [detail, setDetail] = useState<StockDetail>(initialItem);
  const [period, setPeriod] = useState<ChartPeriod>("3M");
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [watched, setWatched] = useState(isWatched);

  useEffect(() => {
    fetchStockDetail(stockCode).then((r) => { if (r.ok) setDetail(r.data); });
  }, [stockCode]);

  useEffect(() => {
    setChartLoading(true);
    fetchStockChart(stockCode, period).then((r) => {
      setPoints(r.ok ? r.data.points : []);
      setChartLoading(false);
    });
  }, [stockCode, period]);

  const handleWatchToggle = async () => {
    const ok = await toggleWatchlist(stockCode, watched);
    if (ok) {
      const next = !watched;
      setWatched(next);
      onWatchChange(stockCode, next);
    }
  };

  const score = detail.totalScore != null ? Math.round(detail.totalScore) : null;
  const scoreColor = score == null ? T.mute : score >= 90 ? T.green : score >= 75 ? T.accent : score >= 60 ? T.amber : T.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg, fontFamily: T.sans }}>

      {/* ── 상단 바 ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "18px 12px 8px" }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          border: `1px solid ${T.border}`, background: T.card,
          color: T.text, fontSize: 20, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {detail.name ?? stockCode}
          </div>
          <div style={{ fontSize: 11, color: T.sub }}>
            {stockCode}{detail.sector ? ` · ${detail.sector}` : ""}
          </div>
        </div>
        <button onClick={handleWatchToggle} style={{
          width: 36, height: 36, flexShrink: 0,
          background: "transparent", border: "none",
          fontSize: 22, color: watched ? T.accent : T.mute, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        }}>{watched ? "★" : "☆"}</button>
      </div>

      {/* ── 스크롤 영역 ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px" }}>

        {/* 현재가 */}
        <div style={{ padding: "6px 0 16px" }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: T.text, fontFamily: T.mono, lineHeight: 1.1 }}>
            {detail.currentPrice != null ? detail.currentPrice.toLocaleString("ko-KR") : "-"}
            <span style={{ fontSize: 16, fontWeight: 700, color: T.sub, marginLeft: 4 }}>원</span>
          </div>
          {detail.changeRate != null && (
            <PeriodChange points={points} period={period} currentRate={detail.changeRate} />
          )}
        </div>

        {/* 차트 */}
        {chartLoading ? (
          <div style={{ height: CHART_H, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, color: T.mute }}>불러오는 중…</span>
          </div>
        ) : (
          <StockChart points={points} />
        )}

        {/* 기간 토글 */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {PERIODS.map((p) => (
            <button key={p.v} onClick={() => setPeriod(p.v)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: `1px solid ${period === p.v ? T.accent : T.border}`,
              background: period === p.v ? T.accentBg : "transparent",
              color: period === p.v ? T.accent : T.sub,
              fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer",
            }}>{p.label}</button>
          ))}
        </div>

        {/* 기간 요약 */}
        {points.length > 0 && <PeriodSummary points={points} />}

        {/* 핵심 지표 */}
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: "16px 0 10px" }}>핵심 지표</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <MetricCard label="저평가 점수" value={score != null ? `${score}점` : "-"} hint={detail.rank != null ? `전체 ${detail.rank}위` : undefined} valueColor={scoreColor} />
          <MetricCard label="PER" value={detail.per != null ? `${detail.per.toFixed(1)}x` : "-"} hint="주가÷순이익" />
          <MetricCard label="PBR" value={detail.pbr != null ? `${detail.pbr.toFixed(1)}x` : "-"} hint="주가÷순자산" />
          <MetricCard label="업종" value={detail.sector ?? "-"} hint="분류" valueFontSize={15} />
        </div>

        {points.length === 0 && !chartLoading && (
          <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: T.card2, border: `1px solid ${T.border}`, fontSize: 11, color: T.sub, lineHeight: 1.7 }}>
            ⓘ KIS API 키가 설정되지 않았거나 차트 데이터를 불러올 수 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 기간 등락 표시 ────────────────────────────────────────────────────────────
function PeriodChange({ points, period, currentRate }: { points: ChartPoint[]; period: ChartPeriod; currentRate: number }) {
  const LABEL: Record<ChartPeriod, string> = { "1M": "1개월", "3M": "3개월", "6M": "6개월", "1Y": "1년" };
  if (points.length >= 2) {
    const first = points[0].price;
    const last  = points[points.length - 1].price;
    const diff  = last - first;
    const rate  = first ? (diff / first) * 100 : 0;
    const up    = diff >= 0;
    const color = up ? T.green : T.red;
    return (
      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, fontFamily: T.mono }}>
        <span style={{ color }}>{up ? "▲" : "▼"} {Math.abs(diff).toLocaleString("ko-KR")} ({up ? "+" : ""}{rate.toFixed(2)}%)</span>
        <span style={{ fontSize: 12, color: T.sub, fontFamily: T.sans, marginLeft: 6 }}>· {LABEL[period]}</span>
      </div>
    );
  }
  const up = currentRate >= 0;
  return (
    <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, fontFamily: T.mono, color: up ? T.green : T.red }}>
      {up ? "▲" : "▼"} {up ? "+" : ""}{currentRate.toFixed(2)}%
    </div>
  );
}

// ── SVG 차트 ─────────────────────────────────────────────────────────────────
function StockChart({ points }: { points: ChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth]     = useState(358);
  const [tipIdx, setTipIdx]   = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setWidth(el.clientWidth));
    obs.observe(el);
    setWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  if (points.length < 2) {
    return (
      <div style={{ height: CHART_H, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: T.mute }}>차트 데이터 없음</span>
      </div>
    );
  }

  const prices  = points.map((p) => p.price);
  const min     = Math.min(...prices);
  const max     = Math.max(...prices);
  const span    = max - min || 1;
  const innerW  = Math.max(1, width - PAD.l - PAD.r);
  const innerH  = CHART_H - PAD.t - PAD.b;
  const X = (i: number) => PAD.l + (i / (points.length - 1)) * innerW;
  const Y = (v: number) => PAD.t + (1 - (v - min) / span) * innerH;

  const first = points[0].price;
  const last  = points[points.length - 1].price;
  const color = last >= first ? T.green : T.red;

  const linePts = points.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)},${Y(p.price).toFixed(1)}`).join(" ");
  const areaPath = `${linePts} L${X(points.length - 1).toFixed(1)},${(CHART_H - PAD.b).toFixed(1)} L${PAD.l},${(CHART_H - PAD.b).toFixed(1)} Z`;

  function handlePointer(clientX: number) {
    const el = containerRef.current;
    if (!el) return;
    const px = clientX - el.getBoundingClientRect().left - PAD.l;
    const idx = Math.min(points.length - 1, Math.max(0, Math.round((px / innerW) * (points.length - 1))));
    setTipIdx(idx);
  }

  const tip = tipIdx != null ? points[tipIdx] : null;
  const tipX = tipIdx != null ? X(tipIdx) : 0;
  const tipY = tipIdx != null ? Y(points[tipIdx].price) : 0;
  const tipLeft = tip ? Math.min(Math.max(tipX - 52, 4), Math.max(4, width - 108)) : 0;

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: CHART_H, background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, touchAction: "pan-y" }}
      onMouseMove={(e) => handlePointer(e.clientX)}
      onMouseLeave={() => setTipIdx(null)}
      onTouchStart={(e) => handlePointer(e.touches[0].clientX)}
      onTouchMove={(e) => handlePointer(e.touches[0].clientX)}
      onTouchEnd={() => setTipIdx(null)}
    >
      <svg width={width} height={CHART_H} style={{ display: "block" }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((f, i) => (
          <line key={i} x1={PAD.l} x2={width - PAD.r}
            y1={PAD.t + f * innerH} y2={PAD.t + f * innerH}
            stroke={T.border} strokeWidth={1} strokeDasharray="3 4" />
        ))}
        <path d={areaPath} fill="url(#chartGrad)" />
        <path d={linePts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <text x={PAD.l} y={CHART_H - 4} fill={T.mute} fontSize={10} fontFamily={T.sans}>
          {points[0].date.slice(5).replace("-", ".")}
        </text>
        <text x={width - PAD.r} y={CHART_H - 4} fill={T.mute} fontSize={10} fontFamily={T.sans} textAnchor="end">
          {points[points.length - 1].date.slice(5).replace("-", ".")}
        </text>
        {tipIdx != null && (
          <g>
            <line x1={tipX} x2={tipX} y1={PAD.t} y2={CHART_H - PAD.b}
              stroke={T.sub} strokeWidth={1} strokeDasharray="2 3" />
            <circle cx={tipX} cy={tipY} r={4} fill={color} stroke={T.bg} strokeWidth={2} />
          </g>
        )}
      </svg>
      {tip && (
        <div style={{
          position: "absolute", top: 8, left: tipLeft,
          width: 104, padding: "6px 8px", borderRadius: 8,
          background: T.card2, border: `1px solid ${T.border}`,
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 10, color: T.sub }}>{tip.date}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: T.mono }}>
            {tip.price.toLocaleString("ko-KR")}원
          </div>
        </div>
      )}
    </div>
  );
}

// ── 기간 고가·저가·평균 요약 ──────────────────────────────────────────────────
function PeriodSummary({ points }: { points: ChartPoint[] }) {
  const prices = points.map((p) => p.price);
  const hi  = Math.max(...prices);
  const lo  = Math.min(...prices);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const fmt = (n: number) => n.toLocaleString("ko-KR") + "원";
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
      {[{ label: "기간 고가", value: fmt(hi) }, { label: "기간 저가", value: fmt(lo) }, { label: "기간 평균", value: fmt(avg) }].map((c) => (
        <div key={c.label} style={{ flex: 1, background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: T.sub, marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: T.mono }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── 핵심 지표 카드 ────────────────────────────────────────────────────────────
function MetricCard({ label, value, hint, valueColor, valueFontSize }: {
  label: string; value: string; hint?: string; valueColor?: string; valueFontSize?: number;
}) {
  return (
    <div style={{ background: T.card, borderRadius: 12, border: `1px solid ${T.border}`, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: valueFontSize ?? 18, fontWeight: 900, lineHeight: 1.1, color: valueColor ?? T.text }}>{value}</div>
      {hint && <div style={{ fontSize: 10, color: T.mute, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}