import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../theme";
import type { AuthUser } from "../../api/auth";
import * as battle from "../../api/battle";
import type { RankingEntry, MyPortfolio, StockWithPrice } from "../../api/battle";

type Props = {
  roomId: number;
  user: AuthUser;
  onBack: () => void;
};

type Tab = "rank" | "my" | "trade";

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  const prevTarget = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevTarget.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else prevTarget.current = target;
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return val;
}

const fmtP = (n: number) => n.toLocaleString();

const rankMedal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}위`);

export default function ActiveBattle({ roomId, user, onBack }: Props) {
  const T = useTheme();
  const [tab, setTab] = useState<Tab>("rank");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [portfolio, setPortfolio] = useState<MyPortfolio | null>(null);
  const [stocks, setStocks] = useState<StockWithPrice[]>([]);
  const [roomName, setRoomName] = useState("");
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>("active");
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    const [rankR, portR, roomR] = await Promise.all([
      battle.getRanking(roomId),
      battle.getMyPortfolio(roomId),
      battle.getRoom(roomId),
    ]);
    if (rankR.ok) setRanking(rankR.data);
    if (portR.ok) setPortfolio(portR.data);
    if (roomR.ok) { setRoomName(roomR.data.name); setEndsAt(roomR.data.endsAt); setRoomStatus(roomR.data.status); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    battle.listStocks().then((r) => { if (r.ok) setStocks(r.data); });
    pollRef.current = setInterval(fetchData, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  const myEntry = ranking.find((e) => e.username === user.username);
  const myAnimatedRate = useCountUp(myEntry?.returnRate ?? 0);

  const daysLeft = endsAt
    ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000))
    : null;

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 68px)", color: T.sub, fontSize: 13 }}>불러오는 중...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 68px)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", marginBottom: 10, padding: 0, fontFamily: T.sans }}>
          ← 목록으로
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>⚔️ {roomName}</div>
          {roomStatus === "finished" ? (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.mute}20`, color: T.mute, border: `1px solid ${T.mute}30` }}>종료</span>
          ) : daysLeft !== null && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.red}20`, color: T.red, border: `1px solid ${T.red}30` }}>D-{daysLeft}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginBottom: 12 }}>{ranking.length}명 참가</div>

        {/* 내 순위 카드 */}
        {myEntry && (
          <div style={{ background: `linear-gradient(135deg,${T.card2},#1a2040)`, borderRadius: 16, padding: "14px 16px", marginBottom: 12, border: `1px solid ${myEntry.rank <= 3 ? "rgba(79,142,247,0.4)" : T.border}`, boxShadow: myEntry.rank <= 3 ? "0 4px 20px rgba(79,142,247,0.15)" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 28 }}>{rankMedal(myEntry.rank)}</div>
                <div>
                  <div style={{ fontSize: 12, color: T.sub }}>내 순위</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: T.text, fontFamily: T.mono }}>
                    {myEntry.rank}위 <span style={{ fontSize: 13, color: T.sub }}>/ {ranking.length}명</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: T.sub }}>수익률</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: myEntry.returnRate >= 0 ? T.green : T.red, fontFamily: T.mono }}>
                  {myAnimatedRate >= 0 ? "+" : ""}{myAnimatedRate.toFixed(2)}%
                </div>
                <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{fmtP(myEntry.totalAsset)}P</div>
              </div>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
          {(roomStatus === "finished"
            ? [["rank", "🏆 최종 순위"], ["my", "💼 내 투자"]] as [Tab, string][]
            : [["rank", "🏆 순위"], ["my", "💼 내 투자"], ["trade", "📈 거래"]] as [Tab, string][]
          ).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: `1px solid ${tab === k ? T.accent : T.border}`, background: tab === k ? T.accentBg : "transparent", color: tab === k ? T.accentL : T.sub, fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px" }}>
        {tab === "rank" && <RankTab ranking={ranking} myUsername={user.username} roomId={roomId} />}
        {tab === "my" && <MyTab portfolio={portfolio} onGoTrade={() => setTab("trade")} />}
        {tab === "trade" && <TradeTab roomId={roomId} stocks={stocks} portfolio={portfolio} onTraded={fetchData} />}
      </div>
    </div>
  );
}

type PortfolioState = MyPortfolio | "loading" | "error" | undefined;

function AnimatedRankRow({ p, i, myUsername, expanded, portfolio, onToggle }: {
  p: RankingEntry; i: number; myUsername: string;
  expanded: boolean; portfolio: PortfolioState; onToggle: () => void;
}) {
  const T = useTheme();
  const animatedRate = useCountUp(p.returnRate);
  const isMe = p.username === myUsername;
  const pos = p.returnRate >= 0;
  const barWidth = Math.min(100, Math.max(2, (animatedRate + 5) / 20 * 100));

  return (
    <div style={{ marginBottom: 8 }}>
      <div onClick={onToggle} style={{ background: isMe ? `${T.accent}10` : T.card2, border: `1px solid ${expanded ? T.accent : isMe ? T.accent : T.border}`, borderRadius: expanded ? "14px 14px 0 0" : 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 32, textAlign: "center", fontSize: i < 3 ? 22 : 14, fontWeight: 900, color: i === 0 ? T.amber : i === 1 ? T.sub : i === 2 ? "#cd7f32" : T.mute }}>
          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? `linear-gradient(135deg,${T.accent},${T.purple})` : T.card, border: `1px solid ${isMe ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
          {p.avatar ?? "🐂"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: isMe ? T.accentL : T.text, fontSize: 14 }}>{p.username}{isMe && " (나)"}</div>
          <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{fmtP(p.totalAsset)}P</div>
          <div style={{ marginTop: 5, height: 4, borderRadius: 3, background: T.mute, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 3, background: pos ? T.green : T.red, width: `${barWidth}%` }} />
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: pos ? T.green : T.red, fontFamily: T.mono }}>
            {animatedRate >= 0 ? "+" : ""}{animatedRate.toFixed(2)}%
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.mute, flexShrink: 0, width: 12, textAlign: "center" }}>{expanded ? "▾" : "▸"}</div>
      </div>
      {expanded && <HoldingsPanel portfolio={portfolio} />}
    </div>
  );
}

function HoldingsPanel({ portfolio }: { portfolio: PortfolioState }) {
  const T = useTheme();
  if (portfolio === undefined || portfolio === "loading")
    return <div style={{ background: T.bg, border: `1px solid ${T.accent}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "10px 14px", fontSize: 12, color: T.sub }}>보유 종목 불러오는 중…</div>;
  if (portfolio === "error")
    return <div style={{ background: T.bg, border: `1px solid ${T.accent}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "10px 14px", fontSize: 12, color: T.red }}>불러오지 못했습니다</div>;

  const stockValue = portfolio.holdings.reduce((s, h) => s + h.currentPrice * h.qty, 0);
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.accent}`, borderTop: "none", borderRadius: "0 0 14px 14px", padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>현금 {fmtP(portfolio.cash)}P · 주식 {fmtP(stockValue)}P</div>
      {portfolio.holdings.length === 0 ? (
        <div style={{ fontSize: 12, color: T.mute, padding: "4px 0" }}>보유 종목 없음 (전액 현금)</div>
      ) : (
        portfolio.holdings.map((h) => {
          const pp = h.pnlRate >= 0;
          return (
            <div key={h.stockCode} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: `1px solid ${T.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{h.stockName}</div>
                <div style={{ fontSize: 10, color: T.sub }}>{h.qty}주 · 평균 {fmtP(h.avgPrice)}P → 현재 {fmtP(h.currentPrice)}P</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: pp ? T.green : T.red }}>{pp ? "+" : ""}{h.pnlRate.toFixed(2)}%</div>
                <div style={{ fontSize: 10, color: T.sub, fontFamily: T.mono }}>{fmtP(h.currentPrice * h.qty)}P</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function RaceTrack({ ranking, myUsername }: { ranking: RankingEntry[]; myUsername: string }) {
  const T = useTheme();
  const ROW_H = 38;
  const GAP = 8;
  const SLOT = ROW_H + GAP;

  // 5분 배치 간격 동안 "살아있는" 레이스를 연출하기 위한 노이즈 랜덤 워크.
  // 정렬·바 너비는 (실제수익률 + 노이즈) 기준 → 근접 경쟁자끼리 순위가 뒤집히며 행 교차.
  // 표시 숫자는 항상 실제 수익률 사용.
  const [noise, setNoise] = useState<Record<number, number>>({});

  useEffect(() => {
    const id = setInterval(() => {
      setNoise((prev) => {
        const next: Record<number, number> = {};
        for (const p of ranking) {
          const cur = prev[p.memberId] ?? 0;
          // 이전 값에서 ±0.25% 씩 랜덤 워크, 최대 ±1% 제한
          const delta = (Math.random() - 0.5) * 0.5;
          next[p.memberId] = Math.max(-1, Math.min(1, cur + delta));
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [ranking]);

  const effective = (p: RankingEntry) => p.returnRate + (noise[p.memberId] ?? 0);

  const sorted = [...ranking].sort((a, b) => effective(b) - effective(a));

  const effRates = sorted.map((p) => effective(p));
  const min = Math.min(...effRates);
  const max = Math.max(...effRates);
  const spread = max - min;

  const toBar = (p: RankingEntry) =>
    spread < 0.001 ? 50 : 10 + ((effective(p) - min) / spread) * 80;

  return (
    <div style={{
      background: T.card2, borderRadius: 16,
      padding: "12px 12px 12px", marginBottom: 12,
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: T.mute, marginBottom: 12, letterSpacing: 1.5 }}>
        ⚡ LIVE RACE
      </div>
      <div style={{ position: "relative", height: sorted.length * SLOT - GAP }}>
        {sorted.map((p, i) => {
          const isMe = p.username === myUsername;
          const barPct = toBar(p);
          const rankColor = i === 0 ? T.amber : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : T.sub;

          return (
            <div
              key={p.memberId}
              style={{
                position: "absolute",
                top: i * SLOT,
                left: 0,
                right: 0,
                height: ROW_H,
                transition: "top 1.0s cubic-bezier(0.34,1.56,0.64,1)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {/* 순위 */}
              <div style={{
                width: 16, fontSize: 11, fontWeight: 900,
                color: rankColor, textAlign: "center", flexShrink: 0,
              }}>
                {i + 1}
              </div>

              {/* 아바타 */}
              <div style={{
                fontSize: 17, lineHeight: 1, flexShrink: 0,
                filter: isMe ? `drop-shadow(0 0 5px ${T.accent})` : undefined,
              }}>
                {p.avatar ?? "🐂"}
              </div>

              {/* 바 + 닉네임 */}
              <div style={{ flex: 1, height: "100%", position: "relative" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: `${T.mute}28`, borderRadius: 8, overflow: "hidden",
                }}>
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${barPct}%`,
                    background: isMe
                      ? `linear-gradient(90deg, ${T.accent}50, ${T.accent}90)`
                      : p.returnRate >= 0
                        ? `linear-gradient(90deg, ${T.green}30, ${T.green}60)`
                        : `linear-gradient(90deg, ${T.red}30, ${T.red}60)`,
                    transition: "width 1.0s cubic-bezier(0.34,1.56,0.64,1)",
                  }} />
                </div>
                <div style={{
                  position: "absolute", left: 8, top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11, fontWeight: isMe ? 700 : 500,
                  color: isMe ? T.accentL : T.sub,
                  whiteSpace: "nowrap", overflow: "hidden",
                  textOverflow: "ellipsis", maxWidth: "65%",
                  zIndex: 1,
                }}>
                  {p.username}
                </div>
              </div>

              {/* 수익률 — 실제 데이터만 표시 */}
              <div style={{
                width: 56, fontSize: 11, fontWeight: 700,
                textAlign: "right", flexShrink: 0,
                color: p.returnRate > 0 ? T.green : p.returnRate < 0 ? T.red : T.sub,
                fontFamily: T.mono,
              }}>
                {p.returnRate > 0 ? "+" : ""}{p.returnRate.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankTab({ ranking, myUsername, roomId }: { ranking: RankingEntry[]; myUsername: string; roomId: number }) {
  const T = useTheme();
  const [openId, setOpenId] = useState<number | null>(null);
  const [cache, setCache] = useState<Record<number, PortfolioState>>({});

  const toggle = async (memberId: number) => {
    if (openId === memberId) { setOpenId(null); return; }
    setOpenId(memberId);
    setCache((c) => ({ ...c, [memberId]: "loading" }));
    const r = await battle.getParticipantPortfolio(roomId, memberId);
    setCache((c) => ({ ...c, [memberId]: r.ok ? r.data : "error" }));
  };

  return (
    <div>
      <RaceTrack ranking={ranking} myUsername={myUsername} />
      <div style={{ fontSize: 11, color: T.mute, marginBottom: 8, fontFamily: T.sans }}>행을 탭하면 보유 종목을 볼 수 있어요</div>
      {ranking.map((p, i) => (
        <AnimatedRankRow
          key={p.memberId}
          p={p} i={i} myUsername={myUsername}
          expanded={openId === p.memberId}
          portfolio={cache[p.memberId]}
          onToggle={() => toggle(p.memberId)}
        />
      ))}
    </div>
  );
}

function MyTab({ portfolio, onGoTrade }: { portfolio: MyPortfolio | null; onGoTrade: () => void }) {
  const T = useTheme();
  if (!portfolio) return <div style={{ color: T.sub, fontSize: 13 }}>데이터를 불러오는 중...</div>;
  const stockValue = portfolio.holdings.reduce((s, h) => s + h.currentPrice * h.qty, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[["현금", portfolio.cash], ["주식평가", stockValue]].map(([label, val]) => (
          <div key={label} style={{ flex: 1, background: T.card2, borderRadius: 12, padding: "10px 12px", border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.sub }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: T.mono }}>{fmtP(val as number)}P</div>
          </div>
        ))}
      </div>

      {portfolio.holdings.length === 0 ? (
        <div style={{ background: T.card2, borderRadius: 14, padding: "28px 0", textAlign: "center", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>
          <div style={{ color: T.sub, fontSize: 13 }}>아직 매수한 종목이 없어요</div>
          <button onClick={onGoTrade} style={{ marginTop: 10, padding: "8px 18px", borderRadius: 10, border: "none", background: T.accentBg, color: T.accentL, fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            종목 매수하러 가기
          </button>
        </div>
      ) : (
        portfolio.holdings.map((h) => {
          const pp = h.pnlRate >= 0;
          return (
            <div key={h.stockCode} style={{ background: T.card2, borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{h.stockName}</div>
                  <div style={{ fontSize: 11, color: T.sub }}>{h.stockCode} · {h.qty}주</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: pp ? T.green : T.red }}>{pp ? "+" : ""}{h.pnlRate.toFixed(2)}%</div>
                  <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{fmtP(h.currentPrice * h.qty)}P</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: T.mute }}>평균 {fmtP(h.avgPrice)}P · 현재 {fmtP(h.currentPrice)}P</div>
            </div>
          );
        })
      )}
    </div>
  );
}

function TradeTab({ roomId, stocks, portfolio, onTraded }: {
  roomId: number;
  stocks: StockWithPrice[];
  portfolio: MyPortfolio | null;
  onTraded: () => void;
}) {
  const T = useTheme();
  const [selected, setSelected] = useState<StockWithPrice | null>(null);
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"buy" | "sell" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "32px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{done === "buy" ? "📈" : "📉"}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 6 }}>{done === "buy" ? "매수 완료!" : "매도 완료!"}</div>
        <div style={{ fontSize: 13, color: T.sub, marginBottom: 20 }}>{selected?.name} {qty}주 {done === "buy" ? "매수" : "매도"}</div>
        <button onClick={() => { setDone(null); setSelected(null); setQty(1); }} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: T.accent, color: "#fff", fontFamily: T.sans, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          계속 거래
        </button>
      </div>
    );
  }

  if (selected) {
    const totalCost = selected.currentPrice * qty;
    const holding = portfolio?.holdings.find((h) => h.stockCode === selected.stockCode);
    const maxBuyQty = portfolio ? Math.floor(portfolio.cash / selected.currentPrice) : 0;
    const maxSellQty = holding?.qty ?? 0;
    const maxQty = type === "buy" ? maxBuyQty : maxSellQty;

    const setPct = (pct: number) => {
      const v = Math.max(1, Math.floor(maxQty * pct));
      setQty(v);
    };

    const execute = async () => {
      setSubmitting(true);
      setError(null);
      const r = await battle.trade(roomId, { stockCode: selected.stockCode, type, qty });
      setSubmitting(false);
      if (r.ok) { setDone(type); onTraded(); }
      else setError(r.error);
    };

    return (
      <div>
        <button onClick={() => { setSelected(null); setError(null); }} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0, fontFamily: T.sans }}>
          ← 종목 목록
        </button>
        <div style={{ background: T.card2, borderRadius: 16, padding: 14, marginBottom: 12, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <div style={{ fontWeight: 700, color: T.text, fontSize: 15 }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: T.sub }}>{selected.stockCode}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: T.mono }}>{selected.currentPrice.toLocaleString()}원</div>
              {selected.changeRate != null && (
                <div style={{ fontSize: 12, color: selected.changeRate >= 0 ? T.green : T.red, fontWeight: 600 }}>
                  {selected.changeRate >= 0 ? "+" : ""}{selected.changeRate.toFixed(2)}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {([["buy", "매수", T.green], ["sell", "매도", T.red]] as [string, string, string][]).map(([t, l, c]) => (
            <button key={t} onClick={() => setType(t as "buy" | "sell")} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1.5px solid ${type === t ? c : T.border}`, background: type === t ? `${c}12` : "transparent", color: type === t ? c : T.sub, fontFamily: T.sans, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ background: T.card2, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>수량</div>
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 10 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>−</button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1) setQty(v);
              }}
              style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: 900, color: T.text, fontFamily: T.mono, background: "transparent", border: "none", outline: "none", width: 0 }}
            />
            <button onClick={() => setQty((q) => q + 1)} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>+</button>
          </div>
          {/* 비율 버튼 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {([["25%", 0.25], ["50%", 0.5], ["75%", 0.75]] as [string, number][]).map(([label, pct]) => (
              <button key={label} onClick={() => setPct(pct)} style={{ flex: 1, padding: "6px 0", borderRadius: 9, border: `1px solid ${T.border}`, background: "transparent", color: T.sub, fontFamily: T.sans, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
            <button onClick={() => setPct(1)} style={{ flex: 1, padding: "6px 0", borderRadius: 9, border: `1px solid ${type === "buy" ? T.green : T.red}`, background: type === "buy" ? T.greenBg : T.redBg, color: type === "buy" ? T.green : T.red, fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {type === "buy" ? "최대" : "전량"}
            </button>
          </div>
          <div style={{ height: 1, background: T.border, margin: "0 -14px" }} />
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: T.sub }}>총 금액</span>
            <span style={{ color: T.text, fontWeight: 700, fontFamily: T.mono }}>{fmtP(totalCost)}P</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
            <span style={{ color: T.mute }}>가용 현금</span>
            <span style={{ color: T.sub, fontFamily: T.mono }}>{fmtP(portfolio?.cash ?? 0)}P <span style={{ color: T.mute }}>(최대 {maxBuyQty}주)</span></span>
          </div>
          {holding && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
              <span style={{ color: T.mute }}>보유</span>
              <span style={{ color: T.green, fontFamily: T.mono }}>{holding.qty}주</span>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.red, marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button onClick={execute} disabled={submitting} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: submitting ? T.mute : type === "buy" ? T.green : T.red, color: "#fff", fontFamily: T.sans, fontWeight: 900, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : type === "buy" ? "0 6px 20px rgba(34,199,122,0.3)" : "0 6px 20px rgba(240,84,84,0.3)" }}>
          {submitting ? "처리 중..." : type === "buy" ? `${fmtP(totalCost)}P 매수` : "매도 실행"}
        </button>
      </div>
    );
  }

  const q = query.trim();
  const filtered = stocks.filter((s) =>
    !q || s.name.includes(q) || s.stockCode.includes(q)
  );
  // 보유 종목 상단 고정
  const sorted = [...filtered].sort((a, b) => {
    const aHeld = portfolio?.holdings.some((h) => h.stockCode === a.stockCode) ? 0 : 1;
    const bHeld = portfolio?.holdings.some((h) => h.stockCode === b.stockCode) ? 0 : 1;
    return aHeld - bHeld;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>
          가용 현금 <span style={{ color: T.accentL, fontFamily: T.mono }}>{fmtP(portfolio?.cash ?? 0)}P</span>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="종목명 또는 코드 검색"
        style={{
          width: "100%", boxSizing: "border-box", marginBottom: 10,
          background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10,
          color: T.text, padding: "9px 12px", fontSize: 16, fontFamily: T.sans, outline: "none",
        }}
      />

      {stocks.length === 0 ? (
        <div style={{ background: T.card2, borderRadius: 14, padding: "28px 0", textAlign: "center", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
          <div style={{ color: T.sub, fontSize: 13 }}>거래 가능한 종목이 없습니다</div>
          <div style={{ color: T.mute, fontSize: 11, marginTop: 4 }}>시세가 적재된 이후 표시됩니다</div>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: T.card2, borderRadius: 14, padding: "28px 0", textAlign: "center", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
          <div style={{ color: T.sub, fontSize: 13 }}>"{q}"에 해당하는 종목이 없습니다</div>
        </div>
      ) : (
        sorted.map((s, i) => {
          const holding = portfolio?.holdings.find((h) => h.stockCode === s.stockCode);
          return (
            <div key={s.stockCode}>
              <div style={{ padding: "11px 0", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{s.name}</span>
                    {holding && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}30` }}>{holding.qty}주</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>
                    {s.currentPrice.toLocaleString()}원
                    {s.changeRate != null && (
                      <span style={{ color: s.changeRate >= 0 ? T.green : T.red, marginLeft: 6 }}>
                        {s.changeRate >= 0 ? "+" : ""}{s.changeRate.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button onClick={() => { setSelected(s); setQty(1); setType("buy"); setDone(null); }} style={{ padding: "6px 10px", borderRadius: 9, border: "none", background: T.greenBg, color: T.green, fontFamily: T.sans, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>매수</button>
                  {holding && (
                    <button onClick={() => { setSelected(s); setQty(1); setType("sell"); setDone(null); }} style={{ padding: "6px 10px", borderRadius: 9, border: "none", background: T.redBg, color: T.red, fontFamily: T.sans, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>매도</button>
                  )}
                </div>
              </div>
              {i < sorted.length - 1 && <div style={{ height: 1, background: T.border }} />}
            </div>
          );
        })
      )}
    </div>
  );
}