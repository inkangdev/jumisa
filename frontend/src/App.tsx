import { useEffect, useState } from "react";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import AppShell from "./layout/AppShell";
import { T } from "./theme";
import * as auth from "./api/auth";
import type { AuthUser } from "./api/auth";
import { onUnauthorized } from "./api/session";

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

  // 세션 만료(인증 필요한 API 가 401) → 사용자 비우고 로그인 화면으로.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setError("세션이 만료되었습니다. 다시 로그인해 주세요.");
      setScreen("login");
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

  const handleUserChange = (u: AuthUser) => setUser(u);

  // 로그인 완료 → 메인 셸(틀). 로그인/회원가입과 달리 셸이 자체 풀하이트 프레임을 가짐.
  if (!booting && user) {
    return <AppShell user={user} onLogout={handleLogout} onUserChange={handleUserChange} />;
  }

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
        {booting ? (
          <BootingView />
        ) : screen === "login" ? (
          <LoginScreen onLogin={handleLogin} onSwitchToSignup={goSignup} error={error} loading={loading} />
        ) : (
          <SignupScreen onSignup={handleSignup} onSwitchToLogin={goLogin} error={error} loading={loading} />
        )}
      </div>
    </div>
  );
}

// 부팅 중(세션 확인) 화면. 백엔드 응답 대기 동안 빈 화면(까만 배경)만
// 보이던 문제를 로고 + 스피너로 대체한다.
function BootingView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
      <div style={{ fontSize: 40 }}>🐂</div>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: `3px solid ${T.border}`,
          borderTopColor: T.accent,
          animation: "spin 0.8s linear infinite",
        }}
      />
      <div style={{ fontSize: 13, color: T.sub }}>불러오는 중…</div>
    </div>
  );
}
