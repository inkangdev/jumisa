import { useState } from "react";
import { T } from "../../theme";
import type { AuthUser } from "../../api/auth";
import * as battle from "../../api/battle";

type Props = {
  user: AuthUser;
  onBack: () => void;
  onCreated: (roomId: number) => void;
};

const PERIODS = ["3", "7", "14", "30"];
const POINT_PRESETS: [string, number][] = [
  ["100만", 1_000_000], ["300만", 3_000_000], ["500만", 5_000_000],
  ["1000만", 10_000_000], ["3000만", 30_000_000], ["5000만", 50_000_000],
  ["1억", 100_000_000], ["1억5천", 150_000_000],
];
const POINT_MIN = 1_000_000;
const POINT_MAX = 150_000_000;
const POINT_STEP = 1_000_000;
const MARKETS: [string, string][] = [["kr", "🇰🇷 국내만"], ["both", "국내+미국"], ["us", "🇺🇸 미국만"]];

const fmtPoint = (n: number) => {
  if (n >= 100_000_000) {
    const uk = Math.floor(n / 100_000_000);
    const rem = n % 100_000_000;
    return rem === 0 ? `${uk}억` : `${uk}억 ${Math.floor(rem / 10_000_000)}천만`;
  }
  return `${Math.floor(n / 10_000)}만`;
};

export default function CreateRoom({ onBack, onCreated }: Props) {
  const [name, setName] = useState("");
  const [period, setPeriod] = useState("7");
  const [startPoints, setStartPoints] = useState(1_000_000);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [market, setMarket] = useState("kr");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError("방 이름을 입력해주세요"); return; }
    setLoading(true);
    setError(null);
    const r = await battle.createRoom({ name: name.trim(), periodDays: parseInt(period), startPoints, maxPlayers, market });
    setLoading(false);
    if (r.ok) onCreated(r.data.id);
    else setError(r.error);
  };

  const fieldStyle = { marginBottom: 20 };
  const labelStyle = { fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, display: "block" } as const;

  return (
    <div style={{ height: "calc(100vh - 68px)", overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 24px" }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", marginBottom: 14, padding: 0, fontFamily: T.sans }}>
          ← 뒤로
        </button>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 20 }}>새 대결방 만들기</div>

        <div style={fieldStyle}>
          <span style={labelStyle}>방 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 저평가 고수들의 방"
            style={{ width: "100%", boxSizing: "border-box", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, padding: "12px 14px", fontSize: 16, fontFamily: T.sans, outline: "none" }}
          />
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>대결 기간</span>
          <div style={{ display: "flex", gap: 8 }}>
            {PERIODS.map((d) => (
              <button key={d} onClick={() => setPeriod(d)} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${period === d ? T.accent : T.border}`, background: period === d ? T.accentBg : "transparent", color: period === d ? T.accentL : T.sub, fontFamily: T.sans, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                {d}일
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>시작 포인트 (참가자 전원 동일 지급)</span>
          {/* 현재 값 표시 */}
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: T.amber, fontFamily: T.mono }}>{fmtPoint(startPoints)}</span>
            <span style={{ fontSize: 13, color: T.sub, marginLeft: 4 }}>P</span>
          </div>
          {/* 슬라이더 */}
          <input
            type="range"
            min={POINT_MIN}
            max={POINT_MAX}
            step={POINT_STEP}
            value={startPoints}
            onChange={(e) => setStartPoints(Number(e.target.value))}
            style={{ width: "100%", accentColor: T.amber, cursor: "pointer", marginBottom: 12 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.mute, marginBottom: 12, marginTop: -8 }}>
            <span>100만</span><span>1억5천만</span>
          </div>
          {/* 빠른 프리셋 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {POINT_PRESETS.map(([label, val]) => (
              <button key={val} onClick={() => setStartPoints(val)} style={{ padding: "6px 10px", borderRadius: 10, border: `1px solid ${startPoints === val ? T.amber : T.border}`, background: startPoints === val ? T.amberBg : "transparent", color: startPoints === val ? T.amber : T.sub, fontFamily: T.mono, fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>최대 인원</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
            <button onClick={() => setMaxPlayers((p) => Math.max(2, p - 1))} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer" }}>−</button>
            <span style={{ fontSize: 24, fontWeight: 900, color: T.text, fontFamily: T.mono, minWidth: 40, textAlign: "center" }}>{maxPlayers}</span>
            <button onClick={() => setMaxPlayers((p) => Math.min(20, p + 1))} style={{ width: 40, height: 40, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 20, cursor: "pointer" }}>+</button>
            <span style={{ fontSize: 13, color: T.sub }}>명</span>
          </div>
        </div>

        <div style={fieldStyle}>
          <span style={labelStyle}>거래 가능 시장</span>
          <div style={{ display: "flex", gap: 8 }}>
            {MARKETS.map(([val, label]) => (
              <button key={val} onClick={() => setMarket(val)} style={{ flex: 1, padding: "9px 4px", borderRadius: 12, border: `1px solid ${market === val ? T.accent : T.border}`, background: market === val ? T.accentBg : "transparent", color: market === val ? T.accentL : T.sub, fontFamily: T.sans, fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 미리보기 */}
        <div style={{ background: T.card2, borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>방 미리보기</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              [T.amber, `${fmtPoint(startPoints)}P 지급`],
              [T.accent, `${period}일 대결`],
              [T.purple, `최대 ${maxPlayers}명`],
            ].map(([color, text]) => (
              <span key={text} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${color}20`, color, border: `1px solid ${color}30` }}>{text}</span>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.red, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button onClick={handleCreate} disabled={loading} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: loading ? T.mute : `linear-gradient(135deg,${T.accent},${T.purple})`, color: "#fff", fontFamily: T.sans, fontWeight: 900, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 6px 20px rgba(79,142,247,0.3)" }}>
          {loading ? "생성 중..." : "⚔️ 방 만들기"}
        </button>
      </div>
    </div>
  );
}