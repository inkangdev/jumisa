import { useEffect, useState } from "react";
import { T } from "../../theme";
import type { AuthUser } from "../../api/auth";
import * as battle from "../../api/battle";
import type { RoomSummary } from "../../api/battle";

type BattleView = "lobby" | "create" | "room" | "active";

type Props = {
  user: AuthUser;
  onNavigate: (view: BattleView, roomId?: number) => void;
};

export default function BattleLobby({ onNavigate }: Props) {
  const [rooms, setRooms] = useState<{ waiting: RoomSummary[]; active: RoomSummary[]; myWaiting: RoomSummary[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const fetchRooms = async () => {
    const r = await battle.listRooms();
    if (r.ok) setRooms(r.data);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleJoinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinLoading(true);
    setError(null);
    const r = await battle.joinByCode(code);
    setJoinLoading(false);
    if (r.ok) {
      setJoinCode("");
      onNavigate("room", r.data.id);
    } else {
      setError(r.error);
    }
  };

  const handleJoin = async (room: RoomSummary) => {
    setJoiningId(room.id);
    setError(null);
    const r = await battle.joinRoom(room.id, room.inviteCode);
    setJoiningId(null);
    if (r.ok) onNavigate("room", r.data.id);
    else setError(r.error);
  };

  const allWaiting = [...(rooms?.myWaiting ?? []), ...(rooms?.waiting ?? [])];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 68px)", overflow: "hidden" }}>
      <div style={{ padding: "16px 16px 0", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 2 }}>모의투자 대결</div>
        <div style={{ fontSize: 11, color: T.sub, marginBottom: 14 }}>같은 포인트로 시작해서 수익률로 순위 결정!</div>

        <button
          onClick={() => onNavigate("create")}
          style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg,${T.accent},${T.purple})`, color: "#fff", fontFamily: T.sans, fontWeight: 900, fontSize: 14, cursor: "pointer", marginBottom: 10, boxShadow: "0 6px 20px rgba(79,142,247,0.3)" }}
        >
          ⚔️ 새 대결방 만들기
        </button>

        {/* 초대코드 입력 */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
            placeholder="초대코드 입력 (예: AB12CD)"
            maxLength={6}
            style={{ flex: 1, background: T.card2, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, padding: "10px 12px", fontSize: 13, fontFamily: T.mono, letterSpacing: 2, outline: "none" }}
          />
          <button
            onClick={handleJoinByCode}
            disabled={joinLoading || !joinCode.trim()}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: T.accentBg, color: T.accentL, fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {joinLoading ? "..." : "입장"}
          </button>
        </div>

        {error && (
          <div style={{ background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 10, padding: "8px 12px", fontSize: 12, color: T.red, marginBottom: 10 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", paddingTop: 40, color: T.sub, fontSize: 13 }}>불러오는 중...</div>
        ) : (
          <>
            {/* 진행 중인 대결 */}
            {(rooms?.active?.length ?? 0) > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8 }}>진행 중인 대결</div>
                {rooms!.active.map((r) => (
                  <div key={r.id} style={{ background: T.card2, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${T.green}40` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{r.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}30` }}>진행중</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.sub, marginBottom: 10 }}>
                      {r.participantCount}명 참가 · {r.periodDays}일 대결
                    </div>
                    <button
                      onClick={() => onNavigate("active", r.id)}
                      style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: T.green, color: "#fff", fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                    >
                      대결 현황 보기 →
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* 내 대기 중 방 */}
            {(rooms?.myWaiting?.length ?? 0) > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, marginTop: (rooms?.active?.length ?? 0) > 0 ? 4 : 0 }}>내 대기 중인 방</div>
                {rooms!.myWaiting.map((r) => (
                  <RoomCard key={r.id} room={r} isMyRoom onEnter={() => onNavigate("room", r.id)} />
                ))}
              </>
            )}

            {/* 참가 가능한 방 */}
            <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, marginTop: allWaiting.length > 0 ? 4 : 0 }}>참가 가능한 방</div>
            {(rooms?.waiting?.length ?? 0) === 0 ? (
              <div style={{ background: T.card2, borderRadius: 14, padding: "28px 0", textAlign: "center", border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🏟️</div>
                <div style={{ color: T.sub, fontSize: 13 }}>참가 가능한 대결방이 없어요</div>
                <div style={{ color: T.mute, fontSize: 11, marginTop: 4 }}>새 방을 만들거나 초대코드로 입장하세요</div>
              </div>
            ) : (
              rooms!.waiting.map((r) => (
                <RoomCard
                  key={r.id}
                  room={r}
                  joining={joiningId === r.id}
                  onJoin={() => handleJoin(r)}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, isMyRoom, onJoin, onEnter, joining }: {
  room: RoomSummary;
  isMyRoom?: boolean;
  onJoin?: () => void;
  onEnter?: () => void;
  joining?: boolean;
}) {
  const fmtP = (n: number) => {
    if (n >= 1e8) return (n / 1e8).toFixed(1) + "억";
    if (n >= 1e4) return Math.round(n / 1e4) + "만";
    return n.toLocaleString();
  };

  return (
    <div style={{ background: T.card2, borderRadius: 16, padding: "14px 16px", marginBottom: 10, border: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: T.text, fontSize: 14, marginBottom: 3 }}>{room.name}</div>
          <div style={{ fontSize: 11, color: T.sub }}>방장 {room.hostUsername} · {room.periodDays}일 대결</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.green}20`, color: T.green, border: `1px solid ${T.green}30`, flexShrink: 0 }}>
          {isMyRoom ? "내 방" : "입장가능"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.amber}20`, color: T.amber, border: `1px solid ${T.amber}30` }}>
          시작금 {fmtP(room.startPoints)}P
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.accent}20`, color: T.accent, border: `1px solid ${T.accent}30` }}>
          {room.participantCount}/{room.maxPlayers}명
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.purple}20`, color: T.purple, border: `1px solid ${T.purple}30` }}>
          {room.periodDays}일
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: `${T.accent}20`, color: T.accentL, border: `1px solid ${T.accent}30`, fontFamily: T.mono }}>
          {room.inviteCode}
        </span>
      </div>
      {isMyRoom ? (
        <button onClick={onEnter} style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: `1px solid ${T.accent}`, background: T.accentBg, color: T.accentL, fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          대기방 입장 →
        </button>
      ) : (
        <button onClick={onJoin} disabled={joining} style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: `1px solid ${T.accent}`, background: T.accentBg, color: T.accentL, fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          {joining ? "참가 중..." : "참가하기"}
        </button>
      )}
    </div>
  );
}