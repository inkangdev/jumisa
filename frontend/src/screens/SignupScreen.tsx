import { useState } from "react";
import { AVATARS, AvatarPicker, ErrorBanner, Field, Logo, PrimaryButton, SwitchLink } from "./authUi";

type Props = {
  onSignup: (username: string, password: string, avatar: string) => void;
  onSwitchToLogin: () => void;
  error?: string | null;
  loading?: boolean;
};

export default function SignupScreen({ onSignup, onSwitchToLogin, error, loading }: Props) {
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = () => {
    if (!username || !password || loading) return;
    if (password !== password2) {
      setLocalError("비밀번호가 일치하지 않습니다");
      return;
    }
    setLocalError(null);
    onSignup(username, password, avatar);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Logo />
      <ErrorBanner message={localError || error} />
      <AvatarPicker value={avatar} onChange={setAvatar} />
      <Field label="닉네임" value={username} onChange={setUsername} placeholder="사용할 닉네임" onEnter={submit} />
      <Field label="비밀번호" type="password" value={password} onChange={setPassword} placeholder="비밀번호" onEnter={submit} />
      <Field label="비밀번호 확인" type="password" value={password2} onChange={setPassword2} placeholder="비밀번호 재입력" onEnter={submit} />
      <PrimaryButton onClick={submit} disabled={loading}>
        {loading ? "가입 중..." : "회원가입"}
      </PrimaryButton>
      <SwitchLink text="이미 계정이 있으신가요?" action="로그인" onClick={onSwitchToLogin} />
    </div>
  );
}
