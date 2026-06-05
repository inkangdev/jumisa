import { useState } from "react";
import { ErrorBanner, Field, Logo, PrimaryButton, SwitchLink } from "./authUi";

type Props = {
  onLogin: (username: string, password: string) => void;
  onSwitchToSignup: () => void;
  error?: string | null;
  loading?: boolean;
};

export default function LoginScreen({ onLogin, onSwitchToSignup, error, loading }: Props) {
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
      <SwitchLink text="아직 계정이 없으신가요?" action="회원가입" onClick={onSwitchToSignup} />
    </div>
  );
}
