import { useEffect, useRef, useState } from "react";
import { T } from "../../theme";
import type { AuthUser } from "../../api/auth";
import * as battle from "../../api/battle";
import type { RoomDetail } from "../../api/battle";

type Props = {
  roomId: number;
  user: AuthUser;
  onBack: () => void;
  onStarted: () => void;
};

export default function RoomWaiting({ roomId, user, onBack, onStarted }: Props) {
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRoom = async () => {
    const r = await battle.getRoom(roomId);
    if (r.ok) {
      setRoom(r.data);
      setLoading(false);
      if (r.data.status === "active") onStarted();
    }
  };

  useEffect(() => {
    fetchRoom();
    pollRef.current = setInterval(fetchRoom, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  const handleCopy = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!room) return;
    setStarting(true);
    setError(null);
    const r = await battle.startBattle(roomId);
    setStarting(false);
    if (r.ok) onStarted();
    else setError(r.error);
  };

  const fmtP = (n: number) => {
    if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
    if (n >= 1e4) return Math.round(n / 1e4) + "만";
    return n.toLocaleString();
  };

  if (loading) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 68px)", color: T.sub, fontSize: 13 }}>불러오는 중...</div>;
  }

  if (!room) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 68px)", color: T.red, fontSize: 13 }}>대결방을 찾을 수 없습니다</div>;
  }

  const isHost = room.hostUsername === user.username;
  const emptySlots = room.maxPlayers - room.participants.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 68px)", overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: T.sub, fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0, fontFamily: T.sans }}>
          ← 나가기
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: T.text }}>{room.name}</div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.amber}20`, color: T.amber, border: `1px solid ${T.amber}30` }}>대기중</span>
        </div>
        <div style={{ fontSize: 11, color: T.sub, marginBottom: 14 }}>
          방장: {room.hostUsername} · {room.periodDays}일 대결 · 시작금 {fmtP(room.startPoints)}P
        </div>

        {/* 초대 코드 */}
        <div style={{ background: T.card2, borderRadius: 14, padding: "12px 14px", marginBottom: 14, border: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: T.sub, marginBottom: 2 }}>초대 코드</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: T.accentL, fontFamily: T.mono, letterSpacing: 4 }}>{room.inviteCode}</div>
          </div>
          <button onClick={handleCopy} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: copied ? T.greenBg : T.accentBg, color: copied ? T.green : T.accentL, fontFamily: T.sans, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            {copied ? "복사됨!" : "복사"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 10 }}>
          참가자 {room.participants.length}/{room.maxPlayers}명
        </div>

        {room.participants.map((p, i) => {
          const isMe = p.username === user.username;
          return (
            <div key={p.memberId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < room.participants.length - 1 || emptySlots > 0 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: isMe ? `linear-gradient(135deg,${T.accent},${T.purple})` : T.card2, border: `1px solid ${isMe ? T.accent : T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {p.avatar ?? "🐂"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>
                  {p.username}{isMe && <span style={{ color: T.accentL, fontSize: 11 }}> (나)</span>}
                </div>
                <div style={{ fontSize: 11, color: T.sub }}>{i === 0 ? "방장" : "참가자"}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}30` }}>준비완료</span>
            </div>
          );
        })}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "transparent", border: `1px dashed ${T.mute}`, display: "flex", alignItems: "center", justifyContent: "center", color: T.mute, fontSize: 18 }}>+</div>
            <div style={{ color: T.mute, fontSize: 13 }}>대기 중...</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "12px 16px", flexShrink: 0 }}>
        {error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.red, marginBottom: 10 }}>
            {error}
          </div>
        )}
        {isHost && (
          <button onClick={handleStart} disabled={starting} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: starting ? T.mute : `linear-gradient(135deg,${T.green},${T.accent})`, color: "#fff", fontFamily: T.sans, fontWeight: 900, fontSize: 15, cursor: starting ? "not-allowed" : "pointer", boxShadow: starting ? "none" : "0 6px 20px rgba(34,199,122,0.3)" }}>
            {starting ? "시작 중..." : "🚀 대결 시작!"}
          </button>
        )}
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: T.mute }}>
          ※ 시작 시 모든 참가자에게 {fmtP(room.startPoints)}P 동시 지급
        </div>
      </div>
    </div>
  );
}