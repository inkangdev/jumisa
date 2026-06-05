import LoginScreen, { type User } from "./screens/LoginScreen";
import { T } from "./theme";

export default function App() {
  // 화면만 — 로그인 동작은 임시(콘솔)
  const handleLogin = (user: User) => {
    console.log("login:", user);
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
      {/* 로그인 카드 (웹: 중앙 정렬, 모바일까지 반응형) */}
      <div style={{ width: "100%", maxWidth: 400 }}>
        <LoginScreen onLogin={handleLogin} />
      </div>
    </div>
  );
}
