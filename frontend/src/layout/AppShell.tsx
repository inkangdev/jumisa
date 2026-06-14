// 로그인 후 메인 셸(틀). 중앙정렬 모바일 컬럼 + 하단 4탭 네비.
// 탭별 실제 화면은 아직 없음 → 콘텐츠 영역은 자리표시 1개로 대체.
// (탭 화면은 추후 각 담당자가 AppTab id 에 맞춰 끼운다. 대결은 feature/battle.)
import { useState } from "react";
import { T } from "../theme";
import type { AuthUser } from "../api/auth";
import BottomNav from "./BottomNav";
import { NAV, type AppTab } from "./nav";
import BattleTab from "../screens/battle/BattleTab";

export default function AppShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab, setTab] = useState<AppTab>("screener");
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
          width: "100%",
          maxWidth: 420,
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: T.bg,
        }}
      >
        {/* 콘텐츠 영역 (탭 화면 자리) */}
        <div style={{ flex: 1, overflow: "auto" }}>
          {tab === "battle" ? (
            <BattleTab user={user} />
          ) : (
            <Placeholder tab={tab} label={current.label} icon={current.icon} onLogout={onLogout} user={user} />
          )}
        </div>

        <BottomNav active={tab} onSelect={setTab} avatar={user.avatar} />
      </div>
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
}: {
  tab: AppTab;
  label: string;
  icon: string;
  onLogout: () => void;
  user: AuthUser;
}) {
  // 내 정보 탭은 큰 아이콘도 사용자 아바타(동물)로 표시.
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
      <div style={{ fontSize: 13, color: T.sub }}>준비 중입니다</div>

      {tab === "profile" && (
        <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, color: T.sub }}>{user.username}</div>
          <button
            onClick={onLogout}
            style={{
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
      )}
    </div>
  );
}
