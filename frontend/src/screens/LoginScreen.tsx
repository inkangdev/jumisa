import { useState } from "react";
import { T } from "../theme";

export type User = { name: string; email: string; avatar: string };

type Props = {
  /** 로그인 시도 콜백 (현재는 화면만 — API 연동 전). */
  onLogin?: (user: User) => void;
};

const AVATARS = ["🐂", "🦅", "🐻", "🦁", "🦊", "🐯", "🦈", "🦋"];

export default function LoginScreen({ onLogin }: Props) {
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);

  const go = () => {
    if (!id || !pw) return;
    onLogin?.({ name: id, email: `${id}@jumisa.kr`, avatar });
  };

  const fields = [
    { label: "닉네임", val: id, set: setId, type: "text", ph: "닉네임을 입력하세요" },
    { label: "비밀번호", val: pw, set: setPw, type: "password", ph: "비밀번호" },
  ] as const;

  const socials: [string, string, string, string][] = [
    ["🟡", "#FEE500", "#000", "카카오"],
    ["🟢", "#03C75A", "#fff", "네이버"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 24px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 38, fontWeight: 900, color: T.accent, letterSpacing: -1 }}>JUMISA</div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>주식에 미친 사람들 · 대결판 📈⚔️</div>
        </div>

        {/* 아바타 선택 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>내 아바타 선택</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: `2px solid ${avatar === a ? T.accent : T.border}`,
                  background: avatar === a ? T.accentBg : T.card2,
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* 입력 필드 */}
        {fields.map((f) => (
          <div key={f.label} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>{f.label}</div>
            <input
              type={f.type}
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              placeholder={f.ph}
              onKeyDown={(e) => e.key === "Enter" && go()}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: T.card2,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                color: T.text,
                padding: "12px 14px",
                fontSize: 14,
                fontFamily: T.sans,
              }}
            />
          </div>
        ))}

        {/* 로그인 */}
        <button
          onClick={go}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            border: "none",
            background: `linear-gradient(135deg,${T.accent},${T.purple})`,
            color: "#fff",
            fontFamily: T.sans,
            fontWeight: 900,
            fontSize: 15,
            cursor: "pointer",
            marginTop: 4,
            boxShadow: "0 6px 20px rgba(79,142,247,0.3)",
          }}
        >
          대결 시작하기 ⚔️
        </button>

        {/* 소셜 로그인 */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {socials.map(([emoji, bg, color, label]) => (
            <button
              key={label}
              onClick={() => onLogin?.({ name: "소셜유저", email: "social@jumisa.kr", avatar: "🦊" })}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 12,
                border: "none",
                background: bg,
                color,
                fontFamily: T.sans,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* 가입 혜택 배너 */}
        <div
          style={{
            marginTop: 12,
            background: T.accentBg,
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 11,
            color: T.accentL,
            textAlign: "center",
          }}
        >
          🎁 가입 즉시 <b>1,000,000P</b> + 대결방 자동 참가!
        </div>
      </div>
    </div>
  );
}
