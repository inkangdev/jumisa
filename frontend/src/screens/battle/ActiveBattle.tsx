import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";
import type { AuthUser } from "../../api/auth";
import * as battle from "../../api/battle";
import type { RankingEntry, MyPortfolio, StockWithPrice } from "../../api/battle";

type Props = {
  roomId: number;
  user: AuthUser;
  onBack: () => void;
};

type Tab = "rank" | "my" | "trade";

const fmtP = (n: number) => {
  if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
  if (n >= 1e4) return Math.round(n / 1e4) + "만";
  return n.toLocaleString();
};

const rankMedal = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}위`);

export default function ActiveBattle({ roomId, user, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("rank");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [portfolio, setPortfolio] = useState<MyPortfolio | null>(null);
  const [stocks, setStocks] = useState<StockWithPrice[]>([]);
  const [roomName, setRoomName] = useState("");
  const [endsAt, setEndsAt] = useState<string | null>(null);
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
    if (roomR.ok) { setRoomName(roomR.data.name); setEndsAt(roomR.data.endsAt); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    battle.listStocks().then((r) => { if (r.ok) setStocks(r.data); });
    pollRef.current = setInterval(fetchData, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  const myEntry = ranking.find((e) => e.username === user.username);

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
          {daysLeft !== null && (
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
                  {myEntry.returnRate >= 0 ? "+" : ""}{myEntry.returnRate.toFixed(2)}%
                </div>
                <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{fmtP(myEntry.totalAsset)}P</div>
              </div>
            </div>
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
          {([["rank", "🏆 순위"], ["my", "💼 내 투자"], ["trade", "📈 거래"]] as [Tab, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 0", borderRadius: 12, border: `1px solid ${tab === k ? T.accent : T.border}`, background: tab === k ? T.accentBg : "transparent", color: tab === k ? T.accentL : T.sub, fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 16px" }}>
        {tab === "rank" && <RankTab ranking={ranking} myUsername={user.username} />}
        {tab === "my" && <MyTab portfolio={portfolio} onGoTrade={() => setTab("trade")} />}
        {tab === "trade" && <TradeTab roomId={roomId} stocks={stocks} portfolio={portfolio} onTraded={fetchData} />}
      </div>
    </div>
  );
}

function RankTab({ ranking, myUsername }: { ranking: RankingEntry[]; myUsername: string }) {
  return (
    <div>
      {ranking.map((p, i) => {
        const isMe = p.username === myUsername;
        const pos = p.returnRate >= 0;
        return (
          <div key={p.memberId} style={{ background: isMe ? `${T.accent}10` : T.card2, border: `1px solid ${isMe ? T.accent : T.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, textAlign: "center", fontSize: i < 3 ? 22 : 14, fontWeight: 900, color: i === 0 ? T.amber : i === 1 ? T.sub : i === 2 ? "#cd7f32" : T.mute }}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: isMe ? `linear-gradient(135deg,${T.accent},${T.purple})` : T.card, border: `1px solid ${isMe ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
              {p.avatar ?? "🐂"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: isMe ? T.accentL : T.text, fontSize: 14 }}>{p.username}{isMe && " (나)"}</div>
              <div style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{fmtP(p.totalAsset)}P</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: pos ? T.green : T.red, fontFamily: T.mono }}>
                {pos ? "+" : ""}{p.returnRate.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {/* 수익률 비교 바 */}
      {ranking.length > 0 && (
        <div style={{ background: T.card2, borderRadius: 14, padding: "14px 16px", marginTop: 4, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 12 }}>수익률 비교</div>
          {ranking.map((p) => (
            <div key={p.memberId} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: p.username === ranking[0]?.username ? T.accentL : T.sub }}>{p.avatar ?? "🐂"} {p.username}</span>
                <span style={{ color: p.returnRate >= 0 ? T.green : T.red, fontFamily: T.mono }}>
                  {p.returnRate >= 0 ? "+" : ""}{p.returnRate.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: T.mute, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, background: p.returnRate >= 0 ? T.green : T.red, width: `${Math.min(100, Math.max(2, (p.returnRate + 5) / 20 * 100))}%`, transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MyTab({ portfolio, onGoTrade }: { portfolio: MyPortfolio | null; onGoTrade: () => void }) {
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
  const [selected, setSelected] = useState<StockWithPrice | null>(null);
  const [qty, setQty] = useState(1);
  const [type, setType] = useState<"buy" | "sell">("buy");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"buy" | "sell" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12 }}>
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer" }}>−</button>
            <div style={{ flex: 1, textAlign: "center", fontSize: 24, fontWeight: 900, color: T.text, fontFamily: T.mono }}>{qty}</div>
            <button onClick={() => setQty((q) => q + 1)} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer" }}>+</button>
          </div>
          <div style={{ height: 1, background: T.border, margin: "0 -14px" }} />
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: T.sub }}>총 금액</span>
            <span style={{ color: T.text, fontWeight: 700, fontFamily: T.mono }}>{fmtP(totalCost)}P</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
            <span style={{ color: T.mute }}>가용 현금</span>
            <span style={{ color: T.sub, fontFamily: T.mono }}>{fmtP(portfolio?.cash ?? 0)}P</span>
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

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8 }}>
        가용 현금 <span style={{ color: T.accentL, fontFamily: T.mono }}>{fmtP(portfolio?.cash ?? 0)}P</span>
      </div>

      {stocks.length === 0 ? (
        <div style={{ background: T.card2, borderRadius: 14, padding: "28px 0", textAlign: "center", border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>📊</div>
          <div style={{ color: T.sub, fontSize: 13 }}>거래 가능한 종목이 없습니다</div>
          <div style={{ color: T.mute, fontSize: 11, marginTop: 4 }}>시세가 적재된 이후 표시됩니다</div>
        </div>
      ) : (
        stocks.map((s, i) => {
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
              {i < stocks.length - 1 && <div style={{ height: 1, background: T.border }} />}
            </div>
          );
        })
      )}
    </div>
  );
}