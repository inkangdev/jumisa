import type { ReactNode } from "react";
import { useTheme } from "../theme";

export const AVATARS = ["🐂", "🦅", "🐻", "🦁", "🦊", "🐯", "🦈", "🦋"];

export function Logo() {
  const T = useTheme();
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      <div style={{ fontSize: 38, fontWeight: 900, color: T.accent, letterSpacing: -1 }}>JUMISA</div>
      <div style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>주식에 미친 사람들 📈</div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onEnter,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  onEnter?: () => void;
}) {
  const T = useTheme();
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 6 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: T.card2,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          color: T.text,
          padding: "12px 14px",
          fontSize: 16,
          fontFamily: T.sans,
        }}
      />
    </div>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (a: string) => void }) {
  const T = useTheme();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>내 아바타 선택</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {AVATARS.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => onChange(a)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: `2px solid ${value === a ? T.accent : T.border}`,
              background: value === a ? T.accentBg : T.card2,
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  const T = useTheme();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        marginTop: 4,
        boxShadow: "0 6px 20px rgba(79,142,247,0.3)",
      }}
    >
      {children}
    </button>
  );
}

export function ErrorBanner({ message }: { message?: string | null }) {
  const T = useTheme();
  if (!message) return null;
  return (
    <div
      style={{
        marginBottom: 12,
        background: T.redBg,
        border: `1px solid ${T.red}40`,
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: T.red,
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

export function SwitchLink({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  const T = useTheme();
  return (
    <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: T.sub }}>
      {text}{" "}
      <button
        type="button"
        onClick={onClick}
        style={{ background: "transparent", border: "none", color: T.accentL, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: 0, fontFamily: T.sans }}
      >
        {action}
      </button>
    </div>
  );
}
