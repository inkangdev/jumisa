import { useEffect, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import { T } from "./theme";
import * as auth from "./api/auth";
import type { AuthUser } from "./api/auth";

export default function App() {
  const [screen, setScreen] = useState<"login" | "signup">("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);

  // 새로고침 시 세션 확인
  useEffect(() => {
    auth.me().then((u) => {
      setUser(u);
      setBooting(false);
    });
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
    if (!r.ok) {
      setLoading(false);
      setError(r.error);
      return;
    }
    // 가입 성공 → 자동 로그인
    const lr = await auth.login(username, password);
    setLoading(false);
    if (lr.ok) setUser(lr.data);
    else {
      setScreen("login");
      setError("가입은 완료됐어요. 로그인해 주세요.");
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    setUser(null);
    setError(null);
    setScreen("login");
  };

  const goSignup = () => {
    setError(null);
    setScreen("signup");
  };
  const goLogin = () => {
    setError(null);
    setScreen("login");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        fontFamily: T.sans,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {booting ? null : user ? (
          <AuthedView user={user} onLogout={handleLogout} />
        ) : screen === "login" ? (
          <LoginScreen onLogin={handleLogin} onSwitchToSignup={goSignup} error={error} loading={loading} />
        ) : (
          <SignupScreen onSignup={handleSignup} onSwitchToLogin={goLogin} error={error} loading={loading} />
        )}
      </div>
    </div>
  );
}

// 로그인 후 임시 화면 (이후 메인 화면으로 교체 예정)
function AuthedView({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 8 }}>{user.avatar ?? "🐂"}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>
        {user.username}님, 환영합니다 👋
      </div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 6, marginBottom: 28 }}>로그인되었습니다.</div>
      <button
        onClick={onLogout}
        style={{
          padding: "12px 28px",
          borderRadius: 12,
          border: `1px solid ${T.border}`,
          background: T.redBg,
          color: T.red,
          fontFamily: T.sans,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        로그아웃
      </button>
    </div>
  );
}
