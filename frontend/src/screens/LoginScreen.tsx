import { useState } from "react";
import { ErrorBanner, Field, Logo, PrimaryButton, SwitchLink } from "./authUi";
import { useTheme } from "../theme";

type Props = {
  onLogin: (username: string, password: string) => void;
  onSwitchToSignup: () => void;
  error?: string | null;
  loading?: boolean;
};

export default function LoginScreen({ onLogin, onSwitchToSignup, error, loading }: Props) {
  const T = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    if (!username || !password || loading) return;
    onLogin(username, password);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Logo />
      <ErrorBanner message={error} />
      <Field label="닉네임" value={username} onChange={setUsername} placeholder="닉네임을 입력하세요" onEnter={submit} />
      <Field label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="비밀번호" onEnter={submit} />
      <PrimaryButton onClick={submit} disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </PrimaryButton>

      {/* 구분선 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 14px" }}>
        <div style={{ flex: 1, height: 1, background: T.border }} />
        <span style={{ fontSize: 11, color: T.mute }}>또는</span>
        <div style={{ flex: 1, height: 1, background: T.border }} />
      </div>

      {/* 카카오 로그인 버튼 */}
      <a
        href="/oauth2/authorization/kakao"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "12px 0", borderRadius: 12, border: "none",
          background: "#FEE500", color: "#191919",
          fontFamily: T.sans, fontWeight: 700, fontSize: 15,
          textDecoration: "none", cursor: "pointer",
        }}
      >
        <KakaoIcon />
        카카오로 로그인
      </a>

      <SwitchLink text="아직 계정이 없으신가요?" action="회원가입" onClick={onSwitchToSignup} />
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 1C4.582 1 1 3.896 1 7.467c0 2.275 1.519 4.272 3.81 5.407L3.9 16.18a.2.2 0 0 0 .308.214L8.1 13.9c.296.023.596.034.9.034 4.418 0 8-2.896 8-6.467C17 3.896 13.418 1 9 1Z"
        fill="#191919"
      />
    </svg>
  );
}