import { useEffect, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import BattleLobby from "./screens/battle/BattleLobby";
import CreateRoom from "./screens/battle/CreateRoom";
import RoomWaiting from "./screens/battle/RoomWaiting";
import ActiveBattle from "./screens/battle/ActiveBattle";
import { T } from "./theme";
import * as auth from "./api/auth";
import type { AuthUser } from "./api/auth";

type AppScreen = "screener" | "battle" | "watchlist" | "more";
type BattleView = "lobby" | "create" | "room" | "active";

const NAV: { id: AppScreen; icon: string; label: string }[] = [
  { id: "screener", icon: "🔍", label: "스크리너" },
  { id: "battle", icon: "⚔️", label: "대결" },
  { id: "watchlist", icon: "⭐", label: "관심종목" },
  { id: "more", icon: "☰", label: "더보기" },
];

export default function App() {
  const [authScreen, setAuthScreen] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [appScreen, setAppScreen] = useState<AppScreen>("battle");
  const [battleView, setBattleView] = useState<BattleView>("lobby");
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);

  useEffect(() => {
    auth.me().then((u) => { setUser(u); setBooting(false); });
  }, []);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    const r = await auth.login(username, password);
    setLoading(false);
    if (r.ok) setUser(r.data);
    else setError(r.error);
  };

  const handleSignup = async (username: string, password: string, avatar: string) => {
    setError(null);
    setLoading(true);
    const r = await auth.signup(username, password, avatar);
    if (!r.ok) { setLoading(false); setError(r.error); return; }
    const lr = await auth.login(username, password);
    setLoading(false);
    if (lr.ok) setUser(lr.data);
    else { setAuthScreen("login"); setError("가입은 완료됐어요. 로그인해 주세요."); }
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
    setError(null);
    setAuthScreen("login");
    setAppScreen("battle");
    setBattleView("lobby");
    setCurrentRoomId(null);
  };

  if (booting) return null;

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: T.sans, padding: 24, boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          {authScreen === "login" ? (
            <LoginScreen
              onLogin={handleLogin}
              onSwitchToSignup={() => { setError(null); setAuthScreen("signup"); }}
              error={error}
              loading={loading}
            />
          ) : (
            <SignupScreen
              onSignup={handleSignup}
              onSwitchToLogin={() => { setError(null); setAuthScreen("login"); }}
              error={error}
              loading={loading}
            />
          )}
        </div>
      </div>
    );
  }

  const handleBattleNav = (view: BattleView, roomId?: number) => {
    setBattleView(view);
    if (roomId != null) setCurrentRoomId(roomId);
  };

  const renderContent = () => {
    if (appScreen === "battle") {
      if (battleView === "lobby")
        return <BattleLobby user={user} onNavigate={handleBattleNav} />;
      if (battleView === "create")
        return <CreateRoom user={user} onBack={() => setBattleView("lobby")} onCreated={(id) => handleBattleNav("room", id)} />;
      if (battleView === "room" && currentRoomId != null)
        return <RoomWaiting roomId={currentRoomId} user={user} onBack={() => setBattleView("lobby")} onStarted={() => setBattleView("active")} />;
      if (battleView === "active" && currentRoomId != null)
        return <ActiveBattle roomId={currentRoomId} user={user} onBack={() => { setBattleView("lobby"); }} />;
    }

    if (appScreen === "more") {
      return <MoreScreen user={user} onLogout={handleLogout} />;
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 68px)", color: T.sub, fontSize: 14 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
        <div>준비 중입니다</div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.sans }}>
      <div style={{ paddingBottom: 68 }}>{renderContent()}</div>
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 68, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", paddingTop: 4 }}>
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => { setAppScreen(n.id); if (n.id === "battle") setBattleView("lobby"); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}
          >
            <div style={{ width: 40, height: 28, borderRadius: 10, background: appScreen === n.id ? T.accentBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
              {n.icon}
            </div>
            <span style={{ fontSize: 9, fontWeight: appScreen === n.id ? 700 : 400, color: appScreen === n.id ? T.accent : T.mute }}>
              {n.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function MoreScreen({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div style={{ height: "calc(100vh - 68px)", overflowY: "auto" }}>
      <div style={{ padding: "16px 16px 24px" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.text, marginBottom: 16 }}>더보기</div>
        <div style={{ background: T.card2, borderRadius: 16, padding: "14px 14px", marginBottom: 16, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: `linear-gradient(135deg,${T.accent},${T.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            {user.avatar ?? "🐂"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{user.username}</div>
            <div style={{ fontSize: 11, color: T.sub }}>모의투자 대결 멤버</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1px solid ${T.border}`, background: T.redBg, color: T.red, fontFamily: T.sans, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}