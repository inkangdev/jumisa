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
        background: "#04060f",
        fontFamily: T.sans,
      }}
    >
      {/* 폰 프레임 (390 x 812) */}
      <div
        style={{
          width: 390,
          height: 812,
          borderRadius: 50,
          overflow: "hidden",
          boxShadow: "0 0 0 10px #181f30, 0 0 0 13px #0c1020, 0 40px 100px rgba(0,0,0,0.85)",
          display: "flex",
          flexDirection: "column",
          background: T.bg,
        }}
      >
        {/* 상태바 */}
        <div
          style={{
            height: 48,
            flexShrink: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 28px 8px",
            background: T.bg,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>9:41</span>
          <div style={{ width: 110, height: 18, background: "#0c1020", borderRadius: 20 }} />
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.text }}>●●●</span>
            <span style={{ fontSize: 11 }}>📶</span>
            <span style={{ fontSize: 11 }}>🔋</span>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <LoginScreen onLogin={handleLogin} />
        </div>

        {/* 홈 인디케이터 */}
        <div style={{ height: 22, flexShrink: 0, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 120, height: 4, background: T.border, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
