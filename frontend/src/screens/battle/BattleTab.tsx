// 대결 탭 호스트. 메인 셸의 'battle' 탭 안에서 배틀 화면 흐름(로비→생성→대기→진행)을 관리한다.
// (feature/battle 의 App.tsx 가 갖고 있던 battleView/roomId 네비 로직을 탭 내부로 이동.)
import { useState } from "react";
import type { AuthUser } from "../../api/auth";
import BattleLobby from "./BattleLobby";
import CreateRoom from "./CreateRoom";
import RoomWaiting from "./RoomWaiting";
import ActiveBattle from "./ActiveBattle";

type BattleView = "lobby" | "create" | "room" | "active";

export default function BattleTab({ user }: { user: AuthUser }) {
  const [view, setView] = useState<BattleView>("lobby");
  const [roomId, setRoomId] = useState<number | null>(null);

  const nav = (v: BattleView, id?: number) => {
    setView(v);
    if (id != null) setRoomId(id);
  };

  if (view === "create")
    return <CreateRoom user={user} onBack={() => setView("lobby")} onCreated={(id) => nav("room", id)} />;
  if (view === "room" && roomId != null)
    return <RoomWaiting roomId={roomId} user={user} onBack={() => setView("lobby")} onStarted={() => setView("active")} />;
  if (view === "active" && roomId != null)
    return <ActiveBattle roomId={roomId} user={user} onBack={() => setView("lobby")} />;
  return <BattleLobby user={user} onNavigate={nav} />;
}
