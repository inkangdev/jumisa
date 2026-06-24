// 로그인 후 메인 셸(틀). 중앙정렬 모바일 컬럼 + 하단 4탭 네비.
// 탭별 실제 화면은 아직 없음 → 콘텐츠 영역은 자리표시 1개로 대체.
// (탭 화면은 추후 각 담당자가 AppTab id 에 맞춰 끼운다. 대결은 feature/battle.)
import { useState } from "react";
import { useTheme, useThemeMode } from "../theme";
import * as auth from "../api/auth";
import type { AuthUser } from "../api/auth";
import BottomNav from "./BottomNav";
import { NAV, type AppTab } from "./nav";
import BattleTab from "../screens/battle/BattleTab";
import AiAskModal from "../screens/ai/AiAskModal";
import UndervalueScreen from "../screens/undervalue/UndervalueScreen";
import WatchlistScreen from "../screens/watchlist/WatchlistScreen";
import { AvatarPicker } from "../screens/authUi";

export default function AppShell({
  user,
  onLogout,
  onUserChange,
}: {
  user: AuthUser;
  onLogout: () => void;
  onUserChange: (u: AuthUser) => void;
}) {
  const T = useTheme();
  const [tab, setTab] = useState<AppTab>("screener");
  const [aiOpen, setAiOpen] = useState(false);
  const current = NAV.find((n) => n.id === tab)!;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#04060f",
        fontFamily: T.sans,
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: T.bg,
        }}
      >
        {/* 우상단 AI 질문 아이콘 — 클릭 시 레이어팝업 */}
        <button
          onClick={() => setAiOpen(true)}
          title="AI 주식전망에게 질문"
          aria-label="AI 주식전망에게 질문"
          style={{
            position: "absolute",
            top: 10,
            right: 12,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: `linear-gradient(135deg,${T.accent},${T.purple})`,
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(79,142,247,0.4)",
          }}
        >
          ✨
        </button>

        {/* 콘텐츠 영역 (탭 화면 자리) */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {tab === "screener" ? (
            <UndervalueScreen />
          ) : tab === "battle" ? (
            <BattleTab user={user} />
          ) : tab === "watchlist" ? (
            <WatchlistScreen />
          ) : (
            <Placeholder tab={tab} label={current.label} icon={current.icon} onLogout={onLogout} user={user} onUserChange={onUserChange} />
          )}
        </div>

        <BottomNav active={tab} onSelect={setTab} avatar={user.avatar} />
      </div>

      <AiAskModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

// 탭 화면이 들어오기 전까지의 자리표시. 내 정보 탭에서만 프로필+로그아웃 노출.
function Placeholder({
  tab,
  label,
  icon,
  onLogout,
  user,
  onUserChange,
}: {
  tab: AppTab;
  label: string;
  icon: string;
  onLogout: () => void;
  user: AuthUser;
  onUserChange: (u: AuthUser) => void;
}) {
  const T = useTheme();
  const { mode, toggle } = useThemeMode();
  const bigIcon = tab === "profile" ? user.avatar ?? icon : icon;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 10,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontSize: 40 }}>{bigIcon}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: T.text }}>{label}</div>

      {tab === "profile" ? (
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 360 }}>
          <NameEditor user={user} onUserChange={onUserChange} />
          <AvatarEditor user={user} onUserChange={onUserChange} />

          {/* 테마 전환 */}
          <div style={{ width: "100%" }}>
            <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>테마</div>
            <button
              onClick={toggle}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.card2,
                color: T.text,
                fontFamily: T.sans,
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span>{mode === "dark" ? "🌙 다크 모드" : "☀️ 라이트 모드"}</span>
              <span style={{ fontSize: 11, color: T.sub, fontWeight: 400 }}>
                {mode === "dark" ? "라이트로 전환" : "다크로 전환"}
              </span>
            </button>
          </div>

          <button
            onClick={onLogout}
            style={{
              width: "100%",
              padding: "10px 22px",
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
      ) : (
        <div style={{ fontSize: 13, color: T.sub }}>준비 중입니다</div>
      )}
    </div>
  );
}

// 내 정보 탭의 닉네임 변경. 입력 후 저장 시 서버에 반영하고 사용자 상태를 갱신한다.
function NameEditor({ user, onUserChange }: { user: AuthUser; onUserChange: (u: AuthUser) => void }) {
  const T = useTheme();
  const [name, setName] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const trimmed = name.trim();
  const dirty = trimmed !== user.username;

  const save = async () => {
    if (!dirty || !trimmed || saving) return;
    setError(null);
    setDone(false);
    setSaving(true);
    const r = await auth.updateUsername(trimmed);
    setSaving(false);
    if (r.ok) {
      onUserChange(r.data);
      setName(r.data.username);
      setDone(true);
    } else {
      setError(r.error);
    }
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>닉네임</div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={name}
          maxLength={30}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
            setDone(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && save()}
          style={{
            flex: 1,
            minWidth: 0,
            boxSizing: "border-box",
            background: T.card2,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            color: T.text,
            padding: "10px 12px",
            fontSize: 14,
            fontFamily: T.sans,
          }}
        />
        <button
          onClick={save}
          disabled={!dirty || !trimmed || saving}
          style={{
            padding: "0 16px",
            borderRadius: 12,
            border: "none",
            background: !dirty || !trimmed ? T.card2 : `linear-gradient(135deg,${T.accent},${T.purple})`,
            color: !dirty || !trimmed ? T.sub : "#fff",
            fontFamily: T.sans,
            fontWeight: 700,
            fontSize: 13,
            cursor: !dirty || !trimmed || saving ? "default" : "pointer",
          }}
        >
          저장
        </button>
      </div>
      <div style={{ fontSize: 11, color: error ? T.red : T.sub, minHeight: 14, marginTop: 6 }}>
        {error ?? (saving ? "저장 중…" : done ? "변경되었습니다" : "")}
      </div>
    </div>
  );
}

// 내 정보 탭의 이모지(아바타) 변경. 선택 즉시 서버에 저장하고 사용자 상태를 갱신한다.
function AvatarEditor({ user, onUserChange }: { user: AuthUser; onUserChange: (u: AuthUser) => void }) {
  const T = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = async (a: string) => {
    if (a === user.avatar || saving) return;
    setError(null);
    setSaving(true);
    const r = await auth.updateAvatar(a);
    setSaving(false);
    if (r.ok) onUserChange(r.data);
    else setError(r.error);
  };

  return (
    <div style={{ width: "100%" }}>
      <AvatarPicker value={user.avatar ?? ""} onChange={change} />
      <div style={{ fontSize: 11, color: error ? T.red : T.sub, minHeight: 14 }}>
        {error ?? (saving ? "저장 중…" : "이모지를 눌러 변경하세요")}
      </div>
    </div>
  );
}
